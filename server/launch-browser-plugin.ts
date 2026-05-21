import type { Plugin } from "vite";
import { launchChromiumForModel } from "./launch-chromium";

interface LaunchBody {
  browser: {
    launchKey: string;
    chromiumVersion: string;
    name: string;
  };
  modelLabel: string;
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

        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          void (async () => {
            try {
              const payload = JSON.parse(body) as LaunchBody;
              const { chromiumVersion, launchKey } = payload.browser ?? {};
              if (!chromiumVersion || !launchKey) {
                res.statusCode = 400;
                res.end(
                  JSON.stringify({ ok: false, message: "Missing browser version" })
                );
                return;
              }

              const result = await launchChromiumForModel(
                chromiumVersion,
                launchKey
              );

              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  ok: true,
                  message: `Launched ${result.testBrowserLabel} for ${payload.modelLabel} (TV Chromium ${chromiumVersion})`,
                  executable: result.executable,
                  chromiumVersion: result.chromiumVersion,
                  buildId: result.buildId,
                })
              );
            } catch (err) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  ok: false,
                  message:
                    err instanceof Error
                      ? err.message
                      : "Launch failed — try npm run install:browsers",
                })
              );
            }
          })();
        });
      });
    },
  };
}
