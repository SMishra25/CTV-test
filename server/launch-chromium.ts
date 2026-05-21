import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ensureChromiumInstalled } from "./resolve-chromium";

export interface LaunchResult {
  chromiumVersion: string;
  executable: string;
  userDataDir: string;
  testBrowserLabel: string;
  buildId: string;
}

/** Launch the Chrome/Chromium build that matches this TV model's Chromium version. */
export async function launchChromiumForModel(
  chromiumVersion: string,
  launchKey: string
): Promise<LaunchResult> {
  const { executable, label, buildId } =
    await ensureChromiumInstalled(chromiumVersion);
  const userDataDir = path.join(
    os.tmpdir(),
    "ctv-test-kit",
    launchKey.replace(/[^a-zA-Z0-9-_]/g, "_")
  );
  fs.mkdirSync(userDataDir, { recursive: true });

  const args = [
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--new-window",
    "about:blank",
  ];

  const child = spawn(executable, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return {
    chromiumVersion,
    executable,
    userDataDir,
    testBrowserLabel: label,
    buildId,
  };
}
