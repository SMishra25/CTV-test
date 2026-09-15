import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fetch } from "undici";
import {
  Browser,
  BrowserPlatform,
  computeExecutablePath,
  install,
} from "@puppeteer/browsers";

const CACHE_DIR = process.env.BROWSER_CACHE_DIR || "/cache";
// Historical snapshots only ship Linux x86_64 builds.
const INSTALL_PLATFORM = BrowserPlatform.LINUX;
const SNAPSHOT_LIST_API =
  "https://www.googleapis.com/storage/v1/b/chromium-browser-snapshots/o";
const CFT_VERSIONS_URL =
  "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json";

/**
 * Main-branch base positions per Chromium major. Snapshots at/after the base
 * (and before the next major's base) report this major. Platform-independent.
 */
const SNAPSHOT_BASE_BY_MAJOR = {
  // Branch base for 53.0.2785 per chromium/src refs/heads/master@{#403382}
  53: 403382,
  56: 433059,
  63: 508578,
  68: 561733,
  69: 576753,
  76: 638880,
  79: 693954,
  85: 782793,
  87: 812852,
  94: 911515,
  108: 1047731,
};

function log(msg) {
  process.stdout.write(`[ctv] ${msg}\n`);
}

function majorOfVersionString(output) {
  const match = output.match(/(\d+)\.\d+\.\d+/);
  return match ? Number(match[1]) : NaN;
}

function readBrowserMajor(executable) {
  const out = execFileSync(executable, ["--version"], {
    encoding: "utf8",
  }).trim();
  return { major: majorOfVersionString(out), full: out };
}

/** List available snapshot positions at or above `from`, numerically sorted. */
async function listSnapshotPositions(platformKey, from) {
  const url = new URL(SNAPSHOT_LIST_API);
  url.searchParams.set("delimiter", "/");
  url.searchParams.set("prefix", `${platformKey}/`);
  url.searchParams.set("startOffset", `${platformKey}/${from}/`);
  url.searchParams.set("maxResults", "60");
  url.searchParams.set("fields", "prefixes");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Snapshot listing failed (${res.status})`);
  }
  const data = await res.json();
  return (data.prefixes ?? [])
    .map((p) => Number(p.split("/")[1]))
    .filter((n) => Number.isFinite(n) && n >= from)
    .sort((a, b) => a - b);
}

function snapshotPlatformKey(platform) {
  // @puppeteer/browsers snapshot bucket folder names.
  switch (platform) {
    case "linux":
      return "Linux_x64";
    case "mac":
      return "Mac";
    case "mac_arm":
      return "Mac_Arm";
    case "win32":
      return "Win";
    case "win64":
      return "Win_x64";
    default:
      return "Linux_x64";
  }
}

function browserCacheFolder({ browser, buildId, platform }) {
  const browserName = browser === Browser.CHROME ? "chrome" : "chromium";
  return path.join(CACHE_DIR, browserName, `${platform}-${buildId}`);
}

function removeIncompleteInstall(opts) {
  const cacheFolder = browserCacheFolder(opts);
  const executable = computeExecutablePath(opts);
  if (fs.existsSync(cacheFolder) && !fs.existsSync(executable)) {
    log(`removing incomplete browser cache at ${cacheFolder}`);
    fs.rmSync(cacheFolder, { recursive: true, force: true });
  }
}

async function ensureBrowserInstalled(opts) {
  removeIncompleteInstall(opts);
  await install({ ...opts, unpack: true });
  const executable = computeExecutablePath(opts);
  if (!fs.existsSync(executable)) {
    throw new Error(
      `Browser install finished but executable is missing: ${executable}`
    );
  }
  return executable;
}

async function installSnapshot(platform, revision) {
  const opts = {
    browser: Browser.CHROMIUM,
    buildId: String(revision),
    cacheDir: CACHE_DIR,
    platform,
  };
  try {
    const executable = await ensureBrowserInstalled(opts);
    return { ok: true, executable };
  } catch (err) {
    return { ok: false, error: err };
  }
}

async function resolveSnapshot(targetMajor, platform) {
  const base = SNAPSHOT_BASE_BY_MAJOR[targetMajor];
  if (!base) {
    throw new Error(
      `No snapshot base position seeded for Chromium ${targetMajor}. Add it to SNAPSHOT_BASE_BY_MAJOR.`
    );
  }

  const platformKey = snapshotPlatformKey(platform);
  const candidates = await listSnapshotPositions(platformKey, base);
  if (candidates.length === 0) {
    throw new Error(
      `No Chromium snapshots found at/after position ${base} for ${platformKey}.`
    );
  }

  // base lands inside the target major; the nearest available snapshots should
  // report exactly that major. Verify with --version and step forward if a
  // boundary build is off by one.
  for (const revision of candidates.slice(0, 8)) {
    log(`trying Chromium snapshot ${revision} (target major ${targetMajor})`);
    const result = await installSnapshot(platform, revision);
    if (!result.ok) continue;

    const { major, full } = readBrowserMajor(result.executable);
    if (major === targetMajor) {
      log(`matched exact engine: ${full} @ position ${revision}`);
      return {
        executable: result.executable,
        buildId: String(revision),
        versionString: full,
      };
    }
    log(`position ${revision} is major ${major}, not ${targetMajor}; continuing`);
    if (major > targetMajor) break;
  }

  throw new Error(
    `Could not resolve an exact Chromium ${targetMajor} snapshot near position ${base}.`
  );
}

function chromeForTestingPlatformKey(platform) {
  return platform === BrowserPlatform.LINUX ? "linux64" : platform;
}

async function resolveChromeForTesting(targetMajor, platform) {
  const cftPlatform = chromeForTestingPlatformKey(platform);
  const res = await fetch(CFT_VERSIONS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Chrome for Testing versions (${res.status})`);
  }
  const data = await res.json();

  // Pick the latest full version within the requested major that ships a build
  // for this platform.
  const matches = data.versions
    .filter((v) => v.version.split(".")[0] === String(targetMajor))
    .filter((v) =>
      (v.downloads?.chrome ?? []).some((d) => d.platform === cftPlatform)
    );
  if (matches.length === 0) {
    throw new Error(`Chrome for Testing has no ${cftPlatform} build for major ${targetMajor}.`);
  }
  const version = matches[matches.length - 1].version;
  log(`downloading Chrome for Testing ${version} (major ${targetMajor})`);

  const opts = {
    browser: Browser.CHROME,
    buildId: version,
    cacheDir: CACHE_DIR,
    platform,
  };
  const executable = await ensureBrowserInstalled(opts);
  const { full } = readBrowserMajor(executable);
  log(`matched exact engine: ${full} (Chrome for Testing ${version})`);
  return { executable, buildId: version, versionString: full };
}

function launchBrowser(executable, appUrl, targetMajor) {
  const profileDir = "/tmp/ctv-profile";
  const debugPort = process.env.REMOTE_DEBUG_PORT || "9222";
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-translate",
    "--disable-infobars",
    "--disable-nacl",
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    "--remote-debugging-address=0.0.0.0",
    "--window-position=0,0",
    "--window-size=1920,1080",
    "--start-maximized",
    appUrl,
  ];
  if (targetMajor >= 111) {
    args.splice(args.length - 1, 0, "--remote-allow-origins=*");
  }

  log(`launching ${executable}`);
  log(`opening ${appUrl}`);
  log(`remote debugging on 0.0.0.0:${debugPort}`);

  const child = spawn(executable, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  log("browser started; session is ready");

  const shutdown = () => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // already gone
    }
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Keep the container (and noVNC) alive for the whole session.
  setInterval(() => {}, 60_000);
}

async function main() {
  const targetMajor = Number(process.env.TV_CHROMIUM_MAJOR);
  const appUrl = process.env.APP_URL && process.env.APP_URL.trim()
    ? process.env.APP_URL.trim()
    : "about:blank";

  if (!Number.isFinite(targetMajor)) {
    throw new Error("TV_CHROMIUM_MAJOR must be a number");
  }

  const platform = INSTALL_PLATFORM;

  log(`resolving exact Chromium ${targetMajor} for platform ${platform}`);

  const resolved =
    targetMajor >= 113
      ? await resolveChromeForTesting(targetMajor, platform)
      : await resolveSnapshot(targetMajor, platform);

  launchBrowser(resolved.executable, appUrl, targetMajor);
}

main().catch((err) => {
  process.stderr.write(`[ctv] FATAL: ${err?.message ?? err}\n`);
  process.exit(1);
});
