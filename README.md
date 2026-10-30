# CTV Test Kit

Pick a TV platform / year-model and launch the **exact** Chromium engine that ships on that physical Samsung Tizen / LG webOS TV. The engine runs inside Docker (so even very old versions that crash on modern macOS run cleanly), is viewed in the UI over noVNC, and can be inspected with Chrome DevTools attached to the same engine.

## What you need

| Requirement | Notes |
|-------------|--------|
| **Node.js 18+** (20 recommended) | For the UI and dev server |
| **Docker Desktop** | Daemon must be running before launch |
| **~6–8 GB RAM** for Docker | Helps when several large browser downloads run |
| **Apple Silicon (M1/M2/M3)** | Old Linux Chromium runs under amd64 emulation; first download per version can take several minutes |

Works on **macOS**, **Windows**, and **Linux** as long as Docker Desktop (or Docker Engine) and Node are installed.

## Quick start

1. Clone the repo and install dependencies.
2. Build **both** Docker runner images (one-time, or after Docker file changes).
3. Start the dev server and open the UI.
4. Select platform + model, optional app URL, then **Launch exact TV browser**.

```bash
git clone git@github.com:SMishra25/CTV-test.git
cd CTV-test
npm install
npm run docker:build    # builds default + legacy images (~3–5 min first time)
npm run dev
```

Open **http://localhost:5173** (or the URL Vite prints).

> **Tip:** Do not suspend the dev server with `Ctrl+Z`. If port 5173 is stuck: `lsof -ti :5173 | xargs kill` (macOS/Linux), then run `npm run dev` again.

## Install (detail)

### 1. Clone and install Node dependencies

```bash
git clone git@github.com:SMishra25/CTV-test.git
cd CTV-test
npm install
```

HTTPS clone:

```bash
git clone https://github.com/SMishra25/CTV-test.git
```

### 2. Build Docker images (required before first launch)

`npm run docker:build` builds **two** images:

| Image tag | Used for |
|-----------|----------|
| `ctv-test-kit-browser:latest` | Chromium **57+** (Debian Bookworm base) |
| `ctv-test-kit-browser:legacy` | Chromium **53–56** (Ubuntu 18.04 base; avoids segfaults on modern glibc) |

```bash
npm run docker:build
```

Rebuild when any of these change: `docker/Dockerfile`, `docker/Dockerfile.legacy`, `docker/entrypoint.sh`, `docker/resolve-and-launch.mjs`.

### 3. Run the app

```bash
npm run dev
```

The Vite dev server serves the UI and exposes:

- `POST /api/launch` — start a TV browser session
- `POST /api/stop` — stop all sessions

## Using the UI

### 1. Select platform and model

Choose **Samsung Tizen** or **LG webOS**, then the **year / model** that matches the TV you want to emulate. Each model maps to a Chromium major in `src/data/platforms/tizen.ts` and `src/data/platforms/webos.ts`.

### 2. Enter your app URL (optional)

Default placeholder is `http://localhost:8080/`. Examples:

```
http://localhost:8080/#/home
https://localhost:5173/
```

- **`http://localhost:…`** — rewritten to `host.docker.internal` inside Docker so the container reaches your machine’s dev server. Start the app on the host first (`curl -I http://localhost:8080/`).
- **`https://` with a self-signed cert** (e.g. Vite preview) — the TV browser is launched with certificate errors ignored for local testing only.

If you leave a URL empty, the browser still opens (about:blank or default navigation depending on engine).

### 3. Launch

Click **Launch exact TV browser**. The tool:

1. Stops any previous session (one session at a time)
2. Picks the correct Docker image (legacy vs default) for that Chromium major
3. Starts a fresh container with the exact Chromium for that model
4. Downloads the browser binary on first use (cached in a Docker volume afterwards)
5. Opens your app URL in that engine

The live session is embedded in the page. Links below the viewer:

| Link | Purpose |
|------|---------|
| **Open viewer in a new tab** | Larger noVNC view; use fullscreen (F11) for visual testing |
| **Inspect UI (DevTools)** | Chrome DevTools on your Mac, attached to the **same** TV Chromium running your app |

### 4. Stop

Click **Stop sessions**, or launch another model (the previous session is stopped automatically).

From the terminal:

```bash
npm run docker:stop
```

## Inspecting UI/UX (DevTools)

After launch, click **Inspect UI (DevTools) ↗**. Use **Elements**, **Console**, and layout tools on the page as rendered by the TV engine.

**Fallback** (if the link is missing on some legacy engines):

1. Open `chrome://inspect` in Chrome on your machine
2. **Configure** → add `localhost:<debugPort>` (shown in the UI after launch)
3. Click **inspect** under Remote Target

DevTools UI comes from your desktop Chrome; the **rendered page** is the TV engine.

> **Note:** Full CDP/DevTools works best on Chromium **113+** (e.g. 120). Older snapshot engines (56–108) may have limited DevTools; use noVNC for visual testing on those.

## How it works

Each TV model maps to a Chromium major. On launch, the dev server starts a container that resolves and runs the **exact** engine:

| TV Chromium (device) | Engine source (exact) |
|----------------------|------------------------|
| 53–108 | [Chromium snapshots](https://commondatastorage.googleapis.com/chromium-browser-snapshots/) — branch base position in `SNAPSHOT_BASE_BY_MAJOR` (`docker/resolve-and-launch.mjs`), verified via `--version` in Linux |
| 113+ (e.g. 120, 126) | [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/) — exact full version for that major |

There are **no fallbacks**: if the exact engine cannot be resolved, launch fails instead of opening a different version.

### Architecture

| File | Role |
|------|------|
| `docker/Dockerfile` | Debian image: Xvfb, fluxbox, x11vnc, noVNC, socat, Node |
| `docker/Dockerfile.legacy` | Ubuntu 18.04 image for Chromium 53–56 |
| `docker/entrypoint.sh` | Display stack, noVNC, CDP proxy, resolver |
| `docker/resolve-and-launch.mjs` | In-container resolver and Chromium launch |
| `server/docker-launch.ts` | Host: Docker check, ports, container lifecycle, DevTools URL |
| `server/launch-browser-plugin.ts` | Vite plugin: `/api/launch`, `/api/stop` |

Browser binaries are cached in the **`ctv-test-kit-browsers`** Docker volume (each exact version downloads once).

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | UI + launch API (use this for daily testing) |
| `npm run docker:build` | Build default + legacy runner images |
| `npm run docker:stop` | Stop all labeled browser containers |
| `npm run build` | Static UI build only (no launch API) |
| `npm run preview` | Preview static build (no Docker launch) |

## Troubleshooting

### App shows "connection refused" in the TV browser

The browser runs inside Docker; `localhost` in the container is not your host. The tool rewrites `localhost` → `host.docker.internal` on macOS/Windows. Ensure the dev server is running:

```bash
curl -I http://localhost:8080/
```

If it works in a normal browser but not in the TV browser, bind your dev server to `0.0.0.0`.

### HTTPS / certificate errors

Local HTTPS with self-signed certificates is supported via `--ignore-certificate-errors` in the container (dev only). Hostname must still match what the server expects after rewrite; prefer `http://localhost:…` when possible.

### Launch fails for Samsung/LG 2018 models (Chromium 53–56)

Ensure the **legacy** image exists:

```bash
docker images ctv-test-kit-browser:legacy
npm run docker:build
```

### Launch fails after switching models

Only one session runs at a time. If a download was interrupted, clear the browser cache volume:

```bash
npm run docker:stop
docker volume rm ctv-test-kit-browsers
```

The next launch re-downloads that version (allow several minutes on Apple Silicon).

### "Browser container exited before the session was ready"

```bash
docker ps -a --filter label=ctv-test-kit=1
docker logs <container-id>
```

Common causes: Docker not running, low memory, or corrupted browser cache (see above).

### "Legacy runner image missing"

Run `npm run docker:build` (builds both images).

### First launch of a new Chromium version is slow

Snapshot and Chrome-for-Testing downloads can be large. Under amd64 emulation on Apple Silicon, **3–5 minutes** for the first fetch is normal; later launches use the cache.

### DevTools link missing

Use noVNC for visual testing, or add a dev-only overlay like [Eruda](https://github.com/liriliri/eruda) in your app.

## Tuning for your physical TVs

1. On the TV (Developer Mode), read the Chromium major from `navigator.userAgent`.
2. Set `chromiumVersion` for that model in `src/data/platforms/tizen.ts` or `webos.ts`.
3. For majors below 113 not already in the map, add a base position to `SNAPSHOT_BASE_BY_MAJOR` in `docker/resolve-and-launch.mjs`.

## Contributing / development

- Platform data: `src/data/platforms/`
- One-off revision lookup scripts live under `scripts/` (maintainers only; not required to use the tool)
