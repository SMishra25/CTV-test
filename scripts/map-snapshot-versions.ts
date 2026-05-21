import {
  Browser,
  BrowserPlatform,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
} from "@puppeteer/browsers";
import { execSync } from "node:child_process";
import path from "node:path";

const cache = path.join(process.cwd(), ".ctv-browsers-map");
const revisions = [
  355029, 515411, 599821, 782078, 901912, 938248, 1011831, 1108766,
];

async function main() {
  const native = detectBrowserPlatform()!;
  const platform =
    native === BrowserPlatform.MAC_ARM ? BrowserPlatform.MAC : native;

  for (const rev of revisions) {
    process.stdout.write(`${rev} `);
    try {
      await install({
        browser: Browser.CHROMIUM,
        buildId: String(rev),
        cacheDir: cache,
        platform,
        unpack: true,
      });
      const exe = computeExecutablePath({
        browser: Browser.CHROMIUM,
        buildId: String(rev),
        cacheDir: cache,
        platform,
      });
      const ver = execSync(`"${exe}" --version`, { encoding: "utf8" }).trim();
      const major = Number(ver.match(/(\d+)\./)?.[1] ?? 0);
      console.log(`-> ${ver} (major ${major})`);
    } catch (e) {
      console.log("FAIL");
    }
  }
}

main();
