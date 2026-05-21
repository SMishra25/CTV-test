import { defineConfig } from "vite";
import { launchBrowserPlugin } from "./server/launch-browser-plugin";

export default defineConfig({
  plugins: [launchBrowserPlugin()],
  server: {
    port: 5173,
  },
});
