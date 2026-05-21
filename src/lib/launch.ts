import type { BrowserInfo, Platform, TvModel } from "../data/types";

export interface LaunchPayload {
  platformId: string;
  platformLabel: string;
  modelId: string;
  modelLabel: string;
  browser: BrowserInfo;
}

export function buildLaunchPayload(
  platform: Platform,
  model: TvModel
): LaunchPayload {
  return {
    platformId: platform.id,
    platformLabel: platform.label,
    modelId: model.id,
    modelLabel: model.label,
    browser: model.browser,
  };
}

export interface LaunchResponse {
  ok: boolean;
  message: string;
  executable?: string;
  chromiumVersion?: string;
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
