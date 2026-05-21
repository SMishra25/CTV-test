/**
 * Find chromium-browser-snapshot revision on Mac_Arm closest to a target Chrome major.
 * Usage: node scripts/find-revision-for-major.mjs 94
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { extract } from "node:zlib"; // not used - use unzip via ditto

const targetMajor = Number(process.argv[2] || "94");
const platform = "Mac_Arm";

async function exists(rev) {
  const url = `https://storage.googleapis.com/chromium-browser-snapshots/${platform}/${rev}/chrome-mac.zip`;
  const res = await fetch(url, { method: "HEAD" });
  return res.ok;
}

async function downloadAndVersion(rev) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ctv-rev-"));
  const zip = path.join(tmp, "chrome-mac.zip");
  const url = `https://storage.googleapis.com/chromium-browser-snapshots/${platform}/${rev}/chrome-mac.zip`;
  const res = await fetch(url);
  if (!res.ok) return null;
  await pipeline(res.body, createWriteStream(zip));
  execSync(`ditto -x -k "${zip}" "${tmp}/out"`);
  const bin = path.join(
    tmp,
    "out/chrome-mac/Chromium.app/Contents/MacOS/Chromium"
  );
  if (!fs.existsSync(bin)) return null;
  const out = execSync(`"${bin}" --version`, { encoding: "utf8" });
  fs.rmSync(tmp, { recursive: true, force: true });
  const m = out.match(/(\d+)\./);
  return m ? Number(m[1]) : null;
}

// coarse scan
let best = { rev: 0, major: 0, diff: 999 };
for (let rev = 850000; rev <= 1300000; rev += 25000) {
  if (!(await exists(rev))) continue;
  const major = await downloadAndVersion(rev);
  if (major == null) continue;
  const diff = Math.abs(major - targetMajor);
  console.log("rev", rev, "-> major", major);
  if (diff < best.diff) best = { rev, major, diff };
  if (diff === 0) break;
}

console.log("best", best);
