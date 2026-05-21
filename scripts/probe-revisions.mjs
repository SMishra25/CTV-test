const platform = "Mac_Arm";
const start = 900000;
const end = 1100000;
const step = 5000;
const found = [];

for (let rev = start; rev <= end; rev += step) {
  const url = `https://storage.googleapis.com/chromium-browser-snapshots/${platform}/${rev}/chrome-mac.zip`;
  const res = await fetch(url, { method: "HEAD" });
  if (res.ok) found.push(rev);
}

console.log("found", found.length, "samples:", found.slice(0, 15).join(", "));
