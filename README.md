# CTV Test Kit

Pick a TV platform / year-model and launch a **different** Chrome/Chromium build per model—matched as closely as macOS allows to the Chromium on physical Samsung TVs.

## Quick start

```bash
npm install
npm run install:browsers   # downloads one binary per mapped TV year (~5–15 min first time)
npm run dev
```

Open http://localhost:5173 → select year → **Launch test browser**.

## How it works

| TV Chromium (device) | Test binary installed |
|----------------------|------------------------|
| 56–108 | [Chromium snapshots](https://commondatastorage.googleapis.com/chromium-browser-snapshots/) (Mac Intel, runs on Apple Silicon via Rosetta) |
| 120, 126 | [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/) (native arm64) |

Mappings live in **`src/data/browser-installs.ts`** — update revisions after checking `navigator.userAgent` on real TVs.

Each launch uses a separate `--user-data-dir`, so you can run multiple years side by side.

## Verify mappings on devices

On the TV (Developer Mode), note the Chromium major from the browser UA, then adjust `INSTALL_BY_CHROMIUM_MAJOR` and snapshot `revision` values in `browser-installs.ts`.

Helper to find snapshot revisions:

```bash
npx tsx scripts/map-snapshot-versions.ts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | UI + per-version launch API |
| `npm run install:browsers` | Pre-download all mapped browsers |
| `npm run build` | Static UI only (no launch API) |
