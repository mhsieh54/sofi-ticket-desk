// Copies ../../data/*.json into dashboard/data/ before dev/build.
// Turbopack refuses to trace file paths that cross the project root
// boundary, so the app can't read ../data directly — this keeps the data
// files safely inside the dashboard project instead.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "..", "data");
const DEST = path.join(__dirname, "..", "data");

fs.mkdirSync(DEST, { recursive: true });
for (const file of ["inventory.json", "sold.json"]) {
  fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
}

// Consolidate the market briefs (data/briefs/*.md) into a single JSON file the
// app reads — one proven read path, no runtime directory scanning or
// cross-root file tracing.
const briefsSrc = path.join(SRC, "briefs");
const briefs = [];
if (fs.existsSync(briefsSrc)) {
  for (const name of fs.readdirSync(briefsSrc)) {
    if (!name.endsWith(".md")) continue;
    briefs.push({
      date: name.replace(/\.md$/, ""),
      content: fs.readFileSync(path.join(briefsSrc, name), "utf-8"),
    });
  }
}
briefs.sort((a, b) => b.date.localeCompare(a.date)); // newest first
fs.writeFileSync(path.join(DEST, "briefs.json"), JSON.stringify({ briefs }, null, 2) + "\n");

console.log(`Synced inventory.json, sold.json, and ${briefs.length} brief(s) into dashboard/data/`);
