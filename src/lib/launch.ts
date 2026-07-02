import type { BrowserInfo, Platform, TvModel } from "../data/types";

export interface LaunchPayload {
  platformId: string;
  platformLabel: string;
  modelId: string;
  modelLabel: string;
  browser: BrowserInfo;
  /** Optional app build URL to open on launch (http/https). */
  appUrl?: string;
}

export function buildLaunchPayload(
  platform: Platform,
  model: TvModel,
  appUrl?: string
): LaunchPayload {
  const trimmed = appUrl?.trim();
  return {
    platformId: platform.id,
    platformLabel: platform.label,
    modelId: model.id,
    modelLabel: model.label,
    browser: model.browser,
    ...(trimmed ? { appUrl: trimmed } : {}),
  };
}

export interface LaunchResponse {
  ok: boolean;
  message: string;
  chromiumVersion?: string;
  /** noVNC URL to view/interact with the launched browser. */
  viewUrl?: string;
  /** Host port for Chrome remote debugging (CDP). */
  debugPort?: number;
  /** DevTools UI URL for the launched app tab. */
  devtoolsUrl?: string;
  containerId?: string;
}

export async function stopAllSessions(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch("/api/stop", { method: "POST" });
  const data = (await res.json()) as { ok: boolean; message: string };
  if (!res.ok) {
    throw new Error(data.message || "Stop failed");
  }
  return data;
}

export async function launchTestBrowser(payload: LaunchPayload): Promise<LaunchResponse> {
  const res = await fetch("/api/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as LaunchResponse;
  if (!res.ok) {
    throw new Error(data.message || "Launch failed");
  }
  return data;
}
