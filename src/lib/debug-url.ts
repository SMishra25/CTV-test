/**
 * TV debug URLs, as printed by the Samsung Tizen / LG webOS VS Code extensions
 * (or `sdb` / `ares-inspect`), e.g.
 *   http://localhost:9998/devtools/inspector.html?ws=localhost:9998/devtools/page/1
 *   devtools://devtools/bundled/inspector.html?ws=localhost:9222/devtools/page/AB
 *
 * Shared by the UI (to pick the inspector version) and the server (to prepare the
 * container). Plain app URLs are left to the existing App URL handling.
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function isLoopback(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.toLowerCase());
}

function parseUrl(input: string): URL | undefined {
  try {
    return new URL(input.trim());
  } catch {
    return undefined;
  }
}

/** True for a DevTools frontend URL pointing at a remote debugging target. */
export function isDebugUrl(input?: string): input is string {
  const url = input ? parseUrl(input) : undefined;
  if (!url) return false;
  if (url.protocol === "devtools:" || url.protocol === "chrome-devtools:") return true;
  return (
    /^https?:$/.test(url.protocol) &&
    url.pathname.includes("/devtools/") &&
    (url.searchParams.has("ws") || url.searchParams.has("wss"))
  );
}

/**
 * Loopback ports the DevTools page needs: the page's own host and its ws=/wss= target.
 * The vendor tools tunnel the TV to these ports on the host machine.
 */
export function debugUrlLoopbackPorts(input: string): number[] {
  const url = parseUrl(input);
  if (!url) return [];
  const ports = new Set<number>();
  if (/^https?:$/.test(url.protocol) && url.port && isLoopback(url.hostname)) {
    ports.add(Number(url.port));
  }
  for (const key of ["ws", "wss"]) {
    // host:port, where the host may be a bracketed IPv6 address such as [::1].
    const m = /^(\[[0-9a-fA-F:]+\]|[^/:]+):(\d{1,5})/.exec(url.searchParams.get(key) ?? "");
    if (m && isLoopback(m[1])) ports.add(Number(m[2]));
  }
  return [...ports];
}

/**
 * Old Chromium only knows its bundled DevTools under chrome-devtools:// (newer: devtools://),
 * and Chromium 38 still names the page devtools.html (later inspector.html).
 */
export function normalizeDebugUrlForMajor(input: string, chromiumMajor: number): string {
  const text = input.trim();
  const url = parseUrl(text);
  if (!url || (url.protocol !== "devtools:" && url.protocol !== "chrome-devtools:")) {
    return text;
  }
  const scheme = chromiumMajor < 76 ? "chrome-devtools:" : "devtools:";
  let rest = text.slice(text.indexOf("//"));
  if (chromiumMajor < 40) rest = rest.replace(/\/inspector\.html(?=[?#]|$)/, "/devtools.html");
  return scheme + rest;
}
