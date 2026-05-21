/**
 * Pre-download every browser binary used by TV mappings.
 * Run once (or after adding models): npm run install:browsers
 */
import { getAllChromiumVersions } from "../src/data/index";
import { getInstallTarget } from "../src/data/browser-installs";
import { ensureChromiumInstalled } from "../server/resolve-chromium";

const versions = getAllChromiumVersions();

console.log(`Installing ${versions.length} browsers for TV testing…`);

for (const version of versions) {
  const target = getInstallTarget(version);
  process.stdout.write(`  TV Chromium ${version} → ${target.label}… `);
  try {
    const { executable, label } = await ensureChromiumInstalled(version);
    console.log(`ok\n    ${label}\n    ${executable}`);
  } catch (err) {
    console.log("failed");
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

console.log("Done.");
