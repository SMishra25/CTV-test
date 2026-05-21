import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Local cache for per-version Chrome installs (one binary per TV Chromium version). */
export const BROWSER_CACHE_DIR = path.join(root, ".ctv-browsers");
