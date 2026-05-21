import { BROWSER_CACHE_DIR } from "./browser-cache";

const VERSIONS_URL =
  "https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json";

let cachedBuildIds: Map<string, string> | null = null;

/** Latest Chrome for Testing full version string for a major (113+). */
export async function resolveChromeForTestingBuildId(
  chromiumMajor: string
): Promise<string> {
  if (!cachedBuildIds) {
    const res = await fetch(VERSIONS_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch Chrome for Testing versions (${res.status})`);
    }
    const data = (await res.json()) as {
      versions: { version: string }[];
    };
    cachedBuildIds = new Map();
    for (const { version } of data.versions) {
      const major = version.split(".")[0];
      cachedBuildIds.set(major, version);
    }
  }

  const buildId = cachedBuildIds.get(chromiumMajor);
  if (!buildId) {
    throw new Error(
      `Chrome for Testing has no build for major ${chromiumMajor}. Use chromium-snapshot in browser-installs.ts`
    );
  }
  return buildId;
}

export { BROWSER_CACHE_DIR };
