# CTV Test Kit

Pick a TV platform / year-model and launch the **exact** Chromium engine that ships on that physical Samsung Tizen / LG webOS TV. The engine runs inside a Docker container (so even very old versions that crash on modern macOS run cleanly), is viewed in the UI over noVNC, and can be inspected with Chrome DevTools attached to the same engine.

## Requirements

- **Node.js** 18+ (20 recommended)
- **Docker Desktop** running (the daemon must be up)
- On **Apple Silicon**, old Linux Chromium runs under amd64 emulation automatically (first download per version can take a few minutes)

## Install

```bash
git clone https://github.com/SMishra25/ctv-test-kit.git
cd ctv-test-kit
npm install
npm run docker:build   # one-time: builds the browser-runner image (~2–3 min)
```

Rebuild the Docker image when `docker/Dockerfile`, `docker/entrypoint.sh`, or `docker/resolve-and-launch.mjs` change:

```bash
npm run docker:build
```

## Run

```bash
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**).

> **Tip:** Do not suspend the dev server with `Ctrl+Z`. If port 5173 is stuck, stop the old process (`kill %1` or `lsof -ti :5173 | xargs kill`) and start `npm run dev` again.

## Using the UI

### 1. Select platform and model

Choose **Samsung Tizen** or **LG webOS**, then pick the **year / model** that matches the TV you want to emulate. Each model maps to a Chromium major in `src/data/platforms/*.ts`.

### 2. Enter your app URL (optional)

In **App URL**, enter where your app is running locally, for example:

```
http://localhost:8080/#/user-personal
```

`http://localhost:…` is rewritten to `host.docker.internal` inside Docker so the container can reach your Mac dev server. Make sure your app is running before you launch (e.g. `curl -I http://localhost:8080/`).

### 3. Launch

Click **Launch exact TV browser**. The tool:

1. Stops any previous session (only one session runs at a time)
2. Starts a fresh Docker container with the exact Chromium for that model
3. Downloads the browser binary on first use (cached in a Docker volume afterwards)
4. Opens your app URL in that engine

The live session appears embedded in the page. Links below the viewer:

| Link | Purpose |
|------|---------|
| **Open viewer in a new tab** | Larger noVNC view; use fullscreen (F11) for visual testing |
| **Inspect UI (DevTools)** | Chrome DevTools attached to the **same** TV Chromium running your app |

### 4. Stop

Click **Stop sessions** when done, or launch a different model (the previous session is stopped automatically).

## Inspecting UI/UX (DevTools)

After launch, click **Inspect UI (DevTools) ↗**. This opens DevTools for the exact Chromium engine that loaded your app — use **Elements**, **Console**, and layout tools to verify UI/UX on that TV browser.

**Fallback** (if the link is missing, e.g. on some legacy engines):

1. Open `chrome://inspect` in Chrome on your Mac
2. **Configure** → add `localhost:<debugPort>` (shown in the UI after launch)
3. Click **inspect** under Remote Target

DevTools UI comes from your Mac Chrome; the **rendered page** is the TV engine — that is what matters for layout and compatibility checks.

> **Note:** Full CDP/DevTools works best on Chromium **113+** (e.g. 120). Older snapshot engines (56–108) may have limited DevTools; use noVNC for visual testing on those.

## How it works

Each TV model maps to a Chromium major (`src/data/platforms/*.ts`). On launch, the dev server starts a container that resolves and runs the **exact** engine:

| TV Chromium (device) | Engine source (exact) |
|----------------------|------------------------|
| 53–108 | [Chromium snapshots](https://commondatastorage.googleapis.com/chromium-browser-snapshots/) — resolved by branch base position and **verified via `--version` inside Linux** |
| 113+ (e.g. 120, 126) | [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/) — exact full version for that major |

There are **no fallbacks**: if the exact engine can't be resolved, the launch errors instead of opening a different version.

### Architecture

| File | Role |
|------|------|
| `docker/Dockerfile` | Debian image with Xvfb, fluxbox, x11vnc, noVNC, socat, and Node |
| `docker/entrypoint.sh` | Starts display stack, noVNC, CDP proxy, then the resolver |
| `docker/resolve-and-launch.mjs` | In-container resolver: finds the exact build, verifies the major, launches Chromium with remote debugging |
| `server/docker-launch.ts` | Host orchestration: Docker check, ports, container lifecycle, DevTools URL |
| `server/launch-browser-plugin.ts` | `/api/launch` and `/api/stop` dev endpoints |

Browser binaries are cached in the **`ctv-test-kit-browsers`** Docker volume, so each exact version downloads only once.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | UI + exact-engine launch API |
| `npm run docker:build` | Build the browser-runner image (run once, or after Docker file changes) |
| `npm run docker:stop` | Stop all running browser sessions |
| `npm run build` | Static UI only (no launch API) |

## Troubleshooting

### App shows "connection refused" in the TV browser

The browser runs inside Docker. `localhost` in the container is not your Mac. The tool rewrites `localhost` → `host.docker.internal` automatically. Ensure your dev server is running on the host:

```bash
curl -I http://localhost:8080/
```

If it works in your normal browser but not in the TV browser, start your dev server bound to `0.0.0.0`.

### Launch fails after switching models

Only one session runs at a time. Launching a new model stops the previous session. If a version's first download was interrupted, you may see a cache error. Clear the browser volume and retry:

```bash
npm run docker:stop
docker volume rm ctv-test-kit-browsers
```

The next launch re-downloads that version (allow several minutes on Apple Silicon).

### "Browser container exited before the session was ready"

Check container logs:

```bash
docker ps -a --filter label=ctv-test-kit=1
docker logs <container-id>
```

Common causes: Docker not running, out of memory (increase Docker Desktop memory to 6–8 GB), or a corrupted browser cache (see above).

### First launch of Chromium 120+ is slow

Chrome for Testing downloads ~150 MB+. Under amd64 emulation on Apple Silicon this can take **3–5 minutes**. Subsequent launches use the cache and start in seconds.

### DevTools link missing

Some legacy Chromium majors (56–108) expose limited remote debugging. Use noVNC for visual testing, or add a dev-only overlay like [Eruda](https://github.com/liriliri/eruda) in your app.

## Verify mappings on physical TVs

On the TV (Developer Mode), read the Chromium major from `navigator.userAgent`, then set `chromiumVersion` for that model in `src/data/platforms/tizen.ts` / `webos.ts`. For majors below 113, ensure a base position exists in `SNAPSHOT_BASE_BY_MAJOR` in `docker/resolve-and-launch.mjs`.
