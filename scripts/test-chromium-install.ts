import {
  Browser,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
} from "@puppeteer/browsers";
import path from "node:path";

const cache = path.join(process.cwd(), ".ctv-browsers-test");
const platform = detectBrowserPlatform()!;

async function tryRevision(rev: string) {
  process.stdout.write(`rev ${rev}… `);
  try {
    await install({
      browser: Browser.CHROMIUM,
      buildId: rev,
      cacheDir: cache,
      platform,
      unpack: true,
    });
    const exe = computeExecutablePath({
      browser: Browser.CHROMIUM,
      buildId: rev,
      cacheDir: cache,
      platform,
    });
    console.log("ok", exe);
    return exe;
  } catch (e) {
    console.log("fail", e instanceof Error ? e.message.split("\n")[0] : e);
    return null;
  }
}

async function main() {
  for (const rev of ["938248", "930000", "1000000", "1030000", "980347"]) {
    await tryRevision(rev);
  }
}

main();
