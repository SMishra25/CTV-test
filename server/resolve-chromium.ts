import fs from "node:fs";
import {
  Browser,
  BrowserPlatform,
  type BrowserPlatform as BrowserPlatformType,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
} from "@puppeteer/browsers";
import type { BrowserInstallTarget } from "../src/data/browser-installs";
import { getInstallTarget } from "../src/data/browser-installs";
import { BROWSER_CACHE_DIR } from "./browser-cache";
import { resolveChromeForTestingBuildId } from "./chrome-for-testing";

interface ResolvedInstall {
  browser: Browser;
  buildId: string;
  platform: BrowserPlatformType;
  label: string;
}

async function resolveTarget(
  chromiumMajor: string,
  target: BrowserInstallTarget
): Promise<ResolvedInstall> {
  const native = detectBrowserPlatform();
  if (!native) {
    throw new Error("Unsupported OS — cannot install browsers for TV testing");
  }

  if (target.type === "chromium-snapshot") {
    // Mac Intel snapshots have the longest history; run under Rosetta on Apple Silicon.
    const platform =
      native === BrowserPlatform.MAC_ARM ? BrowserPlatform.MAC : native;
    return {
      browser: Browser.CHROMIUM,
      buildId: target.revision,
      platform,
      label: target.label,
    };
  }

  const buildId =
    target.type === "chrome-for-testing-auto"
      ? await resolveChromeForTestingBuildId(chromiumMajor)
      : target.buildId;

  return {
    browser: Browser.CHROME,
    buildId,
    platform: native,
    label:
      target.type === "chrome-for-testing-auto"
        ? `Chrome for Testing ${buildId}`
        : target.label,
  };
}

/** Install (if needed) and return path to the binary for this TV Chromium major. */
export async function ensureChromiumInstalled(
  chromiumMajor: string
): Promise<{ executable: string; label: string; buildId: string }> {
  const target = getInstallTarget(chromiumMajor);
  const resolved = await resolveTarget(chromiumMajor, target);
  const opts = {
    browser: resolved.browser,
    buildId: resolved.buildId,
    cacheDir: BROWSER_CACHE_DIR,
    platform: resolved.platform,
  };

  let executable = computeExecutablePath(opts);

  if (!fs.existsSync(executable)) {
    await install({ ...opts, unpack: true });
    executable = computeExecutablePath(opts);
  }

  if (!fs.existsSync(executable)) {
    throw new Error(
      `Browser not found for Chromium ${chromiumMajor} (${resolved.label}). Run: npm run install:browsers`
    );
  }

  return {
    executable,
    label: resolved.label,
    buildId: resolved.buildId,
  };
}
