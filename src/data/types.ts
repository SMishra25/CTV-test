export type PlatformId = "tizen" | "webos";

export interface BrowserInfo {
  /** Display name, e.g. "Chromium 108" */
  name: string;
  chromiumVersion: string;
  /**
   * Chromium major the vendor recommends for DevTools when debugging this TV,
   * used when a TV debug URL is pasted. Defaults to chromiumVersion.
   */
  inspectorChromiumVersion?: string;
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
