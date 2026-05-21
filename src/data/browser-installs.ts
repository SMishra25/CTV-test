/**
 * Maps TV Chromium major → installable browser binary.
 * Snapshots are closest Mac builds from chromium-browser-snapshots (verify on devices).
 * Chrome for Testing uses full build IDs (auto-resolved for 113+).
 */
export type BrowserInstallTarget =
  | { type: "chromium-snapshot"; revision: string; label: string }
  | { type: "chrome-for-testing"; buildId: string; label: string }
  | { type: "chrome-for-testing-auto"; label: string };

/** Closest installable build per TV Chromium major (update after device UA checks). */
export const INSTALL_BY_CHROMIUM_MAJOR: Record<string, BrowserInstallTarget> = {
  "56": {
    type: "chromium-snapshot",
    revision: "515411",
    label: "Chromium 64 (closest snapshot to TV ~56)",
  },
  "63": {
    type: "chromium-snapshot",
    revision: "515411",
    label: "Chromium 64 (closest snapshot to TV 63)",
  },
  "69": {
    type: "chromium-snapshot",
    revision: "599821",
    label: "Chromium 72 (closest snapshot to TV 69)",
  },
  "85": {
    type: "chromium-snapshot",
    revision: "782078",
    label: "Chromium 85",
  },
  "94": {
    type: "chromium-snapshot",
    revision: "970485",
    label: "Chromium 100 (closest snapshot to TV 94)",
  },
  "108": {
    type: "chromium-snapshot",
    revision: "982053",
    label: "Chromium 101 (closest snapshot to TV 108)",
  },
  "120": {
    type: "chrome-for-testing-auto",
    label: "Chrome for Testing 120",
  },
  "126": {
    type: "chrome-for-testing-auto",
    label: "Chrome for Testing 126",
  },
};

export function getInstallTarget(chromiumMajor: string): BrowserInstallTarget {
  const target = INSTALL_BY_CHROMIUM_MAJOR[chromiumMajor];
  if (!target) {
    throw new Error(
      `No install mapping for Chromium ${chromiumMajor}. Add it in src/data/browser-installs.ts`
    );
  }
  return target;
}
