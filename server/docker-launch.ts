import { execFile, spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const IMAGE_TAG = "ctv-test-kit-browser:latest";
const LEGACY_IMAGE_TAG = "ctv-test-kit-browser:legacy";
/** Chromium majors that need the Ubuntu 18.04 runner (too old for Bookworm). */
const LEGACY_MAJOR_MAX = 56;
const CONTAINER_LABEL = "ctv-test-kit";
const BROWSER_CACHE_VOLUME = "ctv-test-kit-browsers";
const NOVNC_CONTAINER_PORT = 7900;
const DEBUG_CONTAINER_PORT = 9222;
const INTERNAL_DEBUG_PORT = 9223;

const dockerDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "docker"
);

export interface DockerLaunchResult {
  containerId: string;
  viewUrl: string;
  hostPort: number;
  debugPort: number;
  /** Direct DevTools URL for the launched app tab (same Chromium engine). */
  devtoolsUrl?: string;
  exactVersionHint: string;
}

class DockerError extends Error {}

function isMissingContainerError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /no such object|No such container/i.test(msg);
}

async function docker(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("docker", args, {
      maxBuffer: 1024 * 1024 * 8,
    });
    return stdout.trim();
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    if (e.code === "ENOENT") {
      throw new DockerError(
        "Docker CLI not found. Install Docker Desktop and make sure `docker` is on your PATH."
      );
    }
    const detail = e.stderr?.trim() || e.message;
    throw new DockerError(detail);
  }
}

async function assertDockerRunning(): Promise<void> {
  try {
    await docker(["info", "--format", "{{.ServerVersion}}"]);
  } catch (err) {
    if (err instanceof DockerError && /Cannot connect|daemon/i.test(err.message)) {
      throw new DockerError(
        "Docker is installed but the daemon isn't running. Start Docker Desktop and try again."
      );
    }
    throw err;
  }
}

function imageTagForMajor(chromiumMajor: string): string {
  const major = Number(chromiumMajor);
  return Number.isFinite(major) && major <= LEGACY_MAJOR_MAX
    ? LEGACY_IMAGE_TAG
    : IMAGE_TAG;
}

async function imageExists(tag: string): Promise<boolean> {
  try {
    await docker(["image", "inspect", tag]);
    return true;
  } catch {
    return false;
  }
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      if (address && typeof address === "object") {
        const { port } = address;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("Could not allocate a free port")));
      }
    });
  });
}

async function containerExitReason(containerId: string): Promise<string> {
  try {
    const out = await docker([
      "inspect",
      "-f",
      "{{.State.ExitCode}} {{.State.OOMKilled}}",
      containerId,
    ]);
    const [code, oom] = out.split(" ");
    if (oom === "true") {
      return "Container was killed (out of memory). Stop other browser sessions and increase Docker Desktop memory if needed.";
    }
    if (code && code !== "0") {
      return `Container exited with code ${code}.`;
    }
  } catch {
    // ignore
  }
  return "";
}

async function waitForBrowserReady(
  containerId: string,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let running: string;
    try {
      running = await docker([
        "inspect",
        "-f",
        "{{.State.Running}}",
        containerId,
      ]);
    } catch (err) {
      if (isMissingContainerError(err)) {
        throw new DockerError(
          "Browser container exited before the session was ready. Run `docker ps -a --filter label=ctv-test-kit=1` and `docker logs <id>` to see why Chromium failed to start."
        );
      }
      throw err;
    }

    if (running !== "true") {
      let logs = "";
      try {
        logs = await docker(["logs", containerId]);
      } catch (err) {
        if (!isMissingContainerError(err)) throw err;
      }
      const reason = await containerExitReason(containerId);
      const tail = logs.slice(-2500) || "(no logs available)";
      throw new DockerError(
        `Browser container exited before the session was ready.${reason ? ` ${reason}` : ""}\n${tail}`
      );
    }

    const logs = await docker(["logs", containerId]);
    if (logs.includes("opening ") || logs.includes("[ctv] launching ")) {
      return;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new DockerError(
    "Browser did not finish starting within the timeout. Check Docker logs for download progress."
  );
}

async function waitForDebugPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new DockerError(
    `Chrome remote debugging did not become reachable on port ${port}.`
  );
}

interface CdpTarget {
  type?: string;
  url?: string;
  devtoolsFrontendUrl?: string;
}

/** Pick the app page and build a host-reachable DevTools URL. */
export async function resolveDevtoolsUrl(
  debugPort: number,
  internalPort = INTERNAL_DEBUG_PORT
): Promise<string | undefined> {
  try {
    const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    if (!res.ok) return undefined;

    const targets = (await res.json()) as CdpTarget[];
    const pages = targets.filter((t) => t.type === "page");
    const appPage =
      pages.find(
        (t) =>
          t.url &&
          !t.url.startsWith("chrome://") &&
          !t.url.startsWith("chrome-devtools://") &&
          t.url !== "about:blank"
      ) ?? pages[0];

    if (!appPage?.devtoolsFrontendUrl) return undefined;

    let frontend = appPage.devtoolsFrontendUrl;
    if (!frontend.startsWith("http://") && !frontend.startsWith("https://")) {
      frontend = `http://localhost:${debugPort}${frontend}`;
    }
    // DevTools WS URLs reference Chromium's internal CDP port; rewrite for the host proxy.
    return frontend.replace(
      new RegExp(`(localhost|127\\.0\\.0\\.1):${internalPort}`, "g"),
      `localhost:${debugPort}`
    );
  } catch {
    return undefined;
  }
}

async function waitForNoVnc(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const url = `http://127.0.0.1:${port}/vnc.html`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new DockerError(
    `noVNC did not become reachable on port ${port} within ${Math.round(
      timeoutMs / 1000
    )}s.`
  );
}

/** Build the runner image. Streams progress to the dev-server console. */
export async function buildBrowserImage(): Promise<void> {
  await assertDockerRunning();
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("docker", ["build", "-t", IMAGE_TAG, dockerDir], {
      stdio: "inherit",
    });
    proc.on("error", reject);
    proc.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new DockerError(`docker build exited with code ${code}`))
    );
  });
}

export interface LaunchExactOptions {
  chromiumMajor: string;
  appUrl?: string;
  /** Used only for the human-readable session label. */
  modelLabel: string;
  screenGeometry?: string;
}

/**
 * Chromium runs inside Docker; `localhost` there is the container, not the host.
 * Rewrite loopback hosts so a dev server on the Mac (e.g. :8080) is reachable.
 */
export function resolveAppUrlForContainer(appUrl?: string): string {
  const trimmed = appUrl?.trim();
  if (!trimmed) return "about:blank";

  try {
    const url = new URL(trimmed);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = "host.docker.internal";
    }
    return url.toString();
  } catch {
    return trimmed;
  }
}

/**
 * Launch the exact TV Chromium engine inside a container and expose it via
 * noVNC. Returns the URL the UI should open to view/interact with the browser.
 */
export async function launchExactBrowserInDocker(
  options: LaunchExactOptions
): Promise<DockerLaunchResult> {
  await assertDockerRunning();

  const imageTag = imageTagForMajor(options.chromiumMajor);
  if (!(await imageExists(imageTag))) {
    const hint =
      imageTag === LEGACY_IMAGE_TAG
        ? "Legacy runner image missing (needed for Chromium 53–56). Run `npm run docker:build`."
        : "Browser runner image not built yet. Run `npm run docker:build` once.";
    throw new DockerError(hint);
  }

  // Only one session at a time: a running container competes for RAM (especially
  // on Apple Silicon amd64 emulation) and both would write to the shared cache.
  await stopAllSessions();

  const hostPort = await findFreePort();
  const debugPort = await findFreePort();
  const containerAppUrl = resolveAppUrlForContainer(options.appUrl);
  const env = [
    "-e",
    `TV_CHROMIUM_MAJOR=${options.chromiumMajor}`,
    "-e",
    `APP_URL=${containerAppUrl}`,
    "-e",
    `SCREEN_GEOMETRY=${options.screenGeometry || "1920x1080x24"}`,
    "-e",
    `REMOTE_DEBUG_PORT=${INTERNAL_DEBUG_PORT}`,
  ];

  const containerId = await docker([
    "run",
    "-d",
    "--shm-size=1g",
    "--add-host=host.docker.internal:host-gateway",
    "--label",
    `${CONTAINER_LABEL}=1`,
    "--label",
    `${CONTAINER_LABEL}-model=${options.modelLabel}`,
    "-p",
    `127.0.0.1:${hostPort}:${NOVNC_CONTAINER_PORT}`,
    "-p",
    `127.0.0.1:${debugPort}:${DEBUG_CONTAINER_PORT}`,
    "-v",
    `${BROWSER_CACHE_VOLUME}:/cache`,
    ...env,
    imageTag,
  ]);

  try {
    await waitForNoVnc(hostPort, 60_000);
    await waitForBrowserReady(containerId, 300_000);
  } catch (err) {
    await stopContainer(containerId).catch(() => {});
    throw err;
  }

  let devtoolsUrl: string | undefined;
  try {
    await waitForDebugPort(debugPort, 30_000);
    devtoolsUrl = await resolveDevtoolsUrl(debugPort);
  } catch {
    // CDP may be unavailable on some legacy engines.
  }

  const viewUrl = `http://localhost:${hostPort}/vnc.html?autoconnect=true&resize=remote&path=websockify`;

  return {
    containerId,
    viewUrl,
    hostPort,
    debugPort,
    devtoolsUrl,
    exactVersionHint:
      Number(options.chromiumMajor) >= 113
        ? `Chrome for Testing ${options.chromiumMajor}`
        : `Chromium ${options.chromiumMajor} (exact snapshot)`,
  };
}

export async function stopContainer(containerId: string): Promise<void> {
  try {
    await docker(["rm", "-f", containerId]);
  } catch (err) {
    if (isMissingContainerError(err)) return;
    throw err;
  }
}

/** Stop every session this tool started. */
export async function stopAllSessions(): Promise<string[]> {
  const out = await docker([
    "ps",
    "-q",
    "--filter",
    `label=${CONTAINER_LABEL}=1`,
  ]);
  const ids = out.split("\n").map((s) => s.trim()).filter(Boolean);
  for (const id of ids) {
    await stopContainer(id).catch(() => {});
  }
  return ids;
}

export { DockerError };
