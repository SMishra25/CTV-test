import "./style.css";
import { getDefaultPlatform, getPlatform, platforms } from "./data";
import type { PlatformId } from "./data/types";
import { getBrowserForSelection, getModel } from "./lib/lookup";
import {
  buildLaunchPayload,
  launchTestBrowser,
  stopAllSessions,
} from "./lib/launch";

const APP_URL_STORAGE_KEY = "ctv-test-kit-app-url";
const DEFAULT_APP_URL =
  "https://ctv.play.tv2.no/pull-requests/PR-4103/18337/play/";

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

      <div class="field">
        <label for="app-url">App URL</label>
        <input
          type="url"
          id="app-url"
          name="app-url"
          placeholder="${DEFAULT_APP_URL}"
          spellcheck="false"
          value="${localStorage.getItem(APP_URL_STORAGE_KEY) ?? DEFAULT_APP_URL}"
        />
        <p class="field-hint">Optional. Use <code>http://localhost:…</code> for a dev server on this machine — it is rewritten to reach the host from inside Docker.</p>
      </div>

      <div class="actions">
        <button type="button" id="launch-btn">Launch exact TV browser</button>
        <button type="button" id="stop-btn" class="secondary">Stop sessions</button>
      </div>
      <p class="status" id="status" role="status"></p>
      <div class="session" id="session" hidden></div>
    </div>
  `;

  const platformSelect = app.querySelector<HTMLSelectElement>("#platform")!;
  const modelSelect = app.querySelector<HTMLSelectElement>("#model")!;
  const browserPanel = app.querySelector<HTMLDivElement>("#browser-panel")!;
  const appUrlInput = app.querySelector<HTMLInputElement>("#app-url")!;
  const launchBtn = app.querySelector<HTMLButtonElement>("#launch-btn")!;
  const stopBtn = app.querySelector<HTMLButtonElement>("#stop-btn")!;
  const statusEl = app.querySelector<HTMLParagraphElement>("#status")!;
  const sessionEl = app.querySelector<HTMLDivElement>("#session")!;

  function showSession(viewUrl: string, devtoolsUrl?: string, debugPort?: number) {
    sessionEl.hidden = false;
    const inspectLink = devtoolsUrl
      ? `<p class="session-link"><a href="${devtoolsUrl}" target="_blank" rel="noopener">Inspect UI (DevTools) ↗</a></p>`
      : debugPort
        ? `<p class="session-link">DevTools: open <code>chrome://inspect</code> → Configure → add <code>localhost:${debugPort}</code></p>`
        : "";
    sessionEl.innerHTML = `
      <p class="session-label">Live browser session</p>
      <iframe class="session-frame" src="${viewUrl}" allow="clipboard-read; clipboard-write"></iframe>
      <p class="session-link"><a href="${viewUrl}" target="_blank" rel="noopener">Open viewer in a new tab ↗</a></p>
      ${inspectLink}
    `;
  }

  function clearSession() {
    sessionEl.hidden = true;
    sessionEl.innerHTML = "";
  }

  appUrlInput.addEventListener("change", () => {
    const value = appUrlInput.value.trim();
    if (value) {
      localStorage.setItem(APP_URL_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(APP_URL_STORAGE_KEY);
    }
  });

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
    const major = browser.chromiumVersion;
    const engineSource =
      Number(major) >= 113
        ? `Chrome for Testing ${major}`
        : `Chromium ${major} (exact snapshot)`;
    browserPanel.innerHTML = `
      <h2>TV browser (device)</h2>
      <p class="browser-name">${browser.name}</p>
      <p class="browser-meta">Chromium ${major} on device</p>
      <h2 class="panel-sub">Test engine (exact, in container)</h2>
      <p class="browser-name">${engineSource}</p>
      <p class="browser-meta">Runs in Docker, viewed here over noVNC</p>
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
    clearSession();
    setStatus(
      "Stopping any previous session and starting the exact engine… (first download per version can take a few minutes)",
      "ok"
    );

    try {
      const appUrl = appUrlInput.value.trim();
      if (appUrl) {
        localStorage.setItem(APP_URL_STORAGE_KEY, appUrl);
      }

      const result = await launchTestBrowser(
        buildLaunchPayload(platform, model, appUrl)
      );
      setStatus(result.message, "ok");
      if (result.viewUrl) {
        showSession(result.viewUrl, result.devtoolsUrl, result.debugPort);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Launch failed", "err");
    } finally {
      launchBtn.disabled = false;
    }
  });

  stopBtn.addEventListener("click", async () => {
    stopBtn.disabled = true;
    try {
      const result = await stopAllSessions();
      setStatus(result.message, "ok");
      clearSession();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Stop failed", "err");
    } finally {
      stopBtn.disabled = false;
    }
  });

  fillModels(defaultPlatform.id, defaultModel.id);
}

render();
