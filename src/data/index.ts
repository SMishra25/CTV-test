import type { Platform, PlatformId } from "./types";
import { tizenPlatform } from "./platforms/tizen";

/** Registry of supported TV platforms. Add new files under platforms/ and register here. */
export const platforms: Platform[] = [tizenPlatform];

export function getPlatform(id: PlatformId): Platform | undefined {
  return platforms.find((p) => p.id === id);
}

export function getDefaultPlatform(): Platform {
  return platforms[0];
}

/** Unique Chromium major versions across all registered platforms (for browser installs). */
export function getAllChromiumVersions(): string[] {
  const versions = new Set<string>();
  for (const platform of platforms) {
    for (const model of platform.models) {
      versions.add(model.browser.chromiumVersion);
    }
  }
  return [...versions].sort((a, b) => Number(a) - Number(b));
}
