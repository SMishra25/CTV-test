# CTV Test Kit - Agent instructions

Launches the **exact** Chromium engine used by a Samsung Tizen / LG webOS TV model inside Docker, viewed via noVNC. See `README.md` for full docs.

## Setting up for a user

Follow **README -> "Setup for AI agents"**. Short version:

1. Check `node -v` (18+) and `docker info`. If Docker is not running, **stop and ask the user to start Docker Desktop**. Do not try to install it.
2. `npm install`
3. `npm run docker:build` (3-5 min; use a long timeout or run in background and poll).
4. `npm run doctor` (must exit 0).
5. Start `npm run dev` **in the background** (never suspend it), then verify `curl -I http://localhost:5173` returns 200.
6. Tell the user to open http://localhost:5173, start their own app on the host, pick a platform/model, and click **Launch exact TV browser**.

## Rules

- **Exact engine only, no fallbacks.** Never substitute a "close enough" browser version.
- Do not change `chromiumVersion` mappings in `src/data/platforms/` unless the user asks.
- The first launch of each Chromium version downloads a large build (3-5 min on Apple Silicon). Do not treat that as a failure.
- Clean up sessions with `npm run docker:stop`.
- If `/api/launch` fails, read container logs: `docker ps -a --filter label=ctv-test-kit=1` then `docker logs <id>`.
- Never read or print `.env*` files or other secrets.

## Key files

| File | Role |
|---|---|
| `src/data/platforms/tizen.ts`, `webos.ts` | TV model -> Chromium major |
| `server/launch-browser-plugin.ts` | `/api/launch`, `/api/stop` dev endpoints |
| `server/docker-launch.ts` | Docker orchestration |
| `docker/resolve-and-launch.mjs` | In-container exact-version resolver/launcher |
| `scripts/doctor.mjs` | Preflight check (`npm run doctor`) |
