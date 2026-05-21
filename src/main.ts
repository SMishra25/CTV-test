import "./style.css";
import { getDefaultPlatform, getPlatform, platforms } from "./data";
import type { PlatformId } from "./data/types";
import { getInstallTarget } from "./data/browser-installs";
import { getBrowserForSelection, getModel } from "./lib/lookup";
import { buildLaunchPayload, launchTestBrowser } from "./lib/launch";

const app = document.querySelector<HTMLDivElement>("#app")!;

function render() {
  const defaultPlatform = getDefaultPlatform();
  const defaultModel = defaultPlatform.models[defaultPlatform.models.length - 1];

  app.innerHTML = `
    <div class="app">
      <h1>CTV Test Kit</h1>
      <p class="subtitle">Select a TV platform and model to match its browser for testing.</p>

      <div class="field">
        <label for="platform">Platform</label>
        <select id="platform" name="platform">
          ${platforms
            .map(
              (p) =>
                `<option value="${p.id}" ${p.id === defaultPlatform.id ? "selected" : ""}>${p.label}</option>`
            )
            .join("")}
        </select>
      </div>

      <div class="field">
        <label for="model">Year / model</label>
        <select id="model" name="model"></select>
      </div>

      <div class="browser-panel" id="browser-panel"></div>

      <div class="actions">
        <button type="button" id="launch-btn">Launch test browser</button>
      </div>
      <p class="status" id="status" role="status"></p>
    </div>
  `;

  const platformSelect = app.querySelector<HTMLSelectElement>("#platform")!;
  const modelSelect = app.querySelector<HTMLSelectElement>("#model")!;
  const browserPanel = app.querySelector<HTMLDivElement>("#browser-panel")!;
  const launchBtn = app.querySelector<HTMLButtonElement>("#launch-btn")!;
  const statusEl = app.querySelector<HTMLParagraphElement>("#status")!;

  function setStatus(text: string, type: "ok" | "err" | "") {
    statusEl.textContent = text;
    statusEl.className = `status${type ? ` ${type}` : ""}`;
  }

  function fillModels(platformId: PlatformId, selectedModelId?: string) {
    const platform = getPlatform(platformId);
    if (!platform) return;

    modelSelect.innerHTML = platform.models
      .map((m) => `<option value="${m.id}">${m.label}</option>`)
      .join("");

    const target =
      selectedModelId && platform.models.some((m) => m.id === selectedModelId)
        ? selectedModelId
        : platform.models[platform.models.length - 1].id;
    modelSelect.value = target;
    updateBrowserPanel();
  }

  function updateBrowserPanel() {
    const platform = getPlatform(platformSelect.value as PlatformId);
    if (!platform) return;

    const browser = getBrowserForSelection(platform, modelSelect.value);
    if (!browser) {
      browserPanel.innerHTML = "<p>No browser mapping for this model.</p>";
      launchBtn.disabled = true;
      return;
    }

    launchBtn.disabled = false;
    const install = getInstallTarget(browser.chromiumVersion);
    browserPanel.innerHTML = `
      <h2>TV browser (device)</h2>
      <p class="browser-name">${browser.name}</p>
      <p class="browser-meta">Chromium ${browser.chromiumVersion} on device</p>
      <h2 class="panel-sub">Test browser (this machine)</h2>
      <p class="browser-name">${install.label}</p>
      ${browser.notes ? `<p class="browser-notes">${browser.notes}</p>` : ""}
    `;
  }

  platformSelect.addEventListener("change", () => {
    fillModels(platformSelect.value as PlatformId);
    setStatus("", "");
  });

  modelSelect.addEventListener("change", () => {
    updateBrowserPanel();
    setStatus("", "");
  });

  launchBtn.addEventListener("click", async () => {
    const platform = getPlatform(platformSelect.value as PlatformId);
    if (!platform) return;

    const model = getModel(platform, modelSelect.value);
    if (!model) return;

    launchBtn.disabled = true;
    setStatus("Launching…", "ok");

    try {
      const result = await launchTestBrowser(buildLaunchPayload(platform, model));
      const detail = result.executable
        ? `${result.message}\n${result.executable}`
        : result.message;
      setStatus(detail, "ok");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Launch failed", "err");
    } finally {
      launchBtn.disabled = false;
    }
  });

  fillModels(defaultPlatform.id, defaultModel.id);
}

render();
