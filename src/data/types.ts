export type PlatformId = "tizen" | "webos";

export interface BrowserInfo {
  /** Display name, e.g. "Chromium 108" */
  name: string;
  chromiumVersion: string;
  /** User-agent or engine notes for testers */
  notes?: string;
  /**
   * Env var or path key used by scripts/launch-chromium.sh.
   * Map versions to installed Chromium builds on your machine.
   */
  launchKey: string;
}

export interface TvModel {
  id: string;
  label: string;
  year: number;
  browser: BrowserInfo;
}

export interface Platform {
  id: PlatformId;
  label: string;
  models: TvModel[];
}
