import type { Plugin } from "vite";
import {
  DockerError,
  launchExactBrowserInDocker,
  stopAllSessions,
} from "./docker-launch";

interface LaunchBody {
  browser: {
    launchKey: string;
    chromiumVersion: string;
    name: string;
  };
  modelLabel: string;
  appUrl?: string;
}

function readJsonBody<T>(req: import("http").IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? (JSON.parse(body) as T) : ({} as T));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export function launchBrowserPlugin(): Plugin {
  return {
    name: "ctv-launch-browser",
    configureServer(server) {
      server.middlewares.use("/api/launch", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, message: "POST only" }));
          return;
        }

        void (async () => {
          try {
            const payload = await readJsonBody<LaunchBody>(req);
            const chromiumVersion = payload.browser?.chromiumVersion;
            if (!chromiumVersion) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({ ok: false, message: "Missing browser version" })
              );
              return;
            }

            const result = await launchExactBrowserInDocker({
              chromiumMajor: chromiumVersion,
              appUrl: payload.appUrl,
              modelLabel: payload.modelLabel,
            });

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: true,
                message: `Launched exact ${result.exactVersionHint} for ${payload.modelLabel}`,
                chromiumVersion,
                viewUrl: result.viewUrl,
                debugPort: result.debugPort,
                devtoolsUrl: result.devtoolsUrl,
                containerId: result.containerId,
              })
            );
          } catch (err) {
            res.statusCode = err instanceof DockerError ? 400 : 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: false,
                message:
                  err instanceof Error ? err.message : "Launch failed",
              })
            );
          }
        })();
      });

      server.middlewares.use("/api/stop", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, message: "POST only" }));
          return;
        }

        void (async () => {
          try {
            const stopped = await stopAllSessions();
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: true,
                message: stopped.length
                  ? `Stopped ${stopped.length} session(s)`
                  : "No running sessions",
                stopped,
              })
            );
          } catch (err) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                ok: false,
                message: err instanceof Error ? err.message : "Stop failed",
              })
            );
          }
        })();
      });
    },
  };
}
