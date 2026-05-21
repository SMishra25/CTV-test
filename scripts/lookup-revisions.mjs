const majors = [56, 63, 69, 85, 94, 108, 120, 126];
const res = await fetch(
  "https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Mac&num=500"
);
const releases = await res.json();
for (const m of majors) {
  const hit = releases.find((r) => String(r.version).startsWith(`${m}.`));
  console.log(
    m,
    hit?.version ?? "—",
    hit?.hashes?.["arm64"] ?? hit?.chromium_main_branch_position ?? "—"
  );
}
