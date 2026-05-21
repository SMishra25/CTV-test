import type { BrowserInfo, Platform, TvModel } from "../data/types";

export function getModel(platform: Platform, modelId: string): TvModel | undefined {
  return platform.models.find((m) => m.id === modelId);
}

export function getBrowserForSelection(
  platform: Platform,
  modelId: string
): BrowserInfo | null {
  const model = getModel(platform, modelId);
  return model?.browser ?? null;
}
