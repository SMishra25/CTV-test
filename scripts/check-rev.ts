import {
  Browser,
  BrowserPlatform,
  computeExecutablePath,
  install,
} from "@puppeteer/browsers";
import { execSync } from "node:child_process";
import path from "node:path";

const rev = process.argv[2];
const cache = path.join(process.cwd(), ".ctv-browsers-map");
const platform = BrowserPlatform.MAC;

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
console.log(execSync(`"${exe}" --version`, { encoding: "utf8" }).trim());
