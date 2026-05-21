const platform = "Mac";
const candidates = [
  355029, 515411, 599821, 782078, 872027, 901912, 938248, 1011831, 1058933,
  1060333, 1108766, 1142525,
];

for (const rev of candidates) {
  const url = `https://storage.googleapis.com/chromium-browser-snapshots/${platform}/${rev}/chrome-mac.zip`;
  const res = await fetch(url, { method: "HEAD" });
  process.stdout.write(`${rev}:${res.ok ? "yes" : "no"} `);
}
console.log();
