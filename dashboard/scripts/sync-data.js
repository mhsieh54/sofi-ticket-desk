// Copies ../../data/*.json into dashboard/data/ before dev/build.
// Turbopack refuses to trace file paths that cross the project root
// boundary, so the app can't read ../data directly — this keeps the data
// files safely inside the dashboard project instead.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "..", "data");
const DEST = path.join(__dirname, "..", "data");

fs.mkdirSync(DEST, { recursive: true });
for (const file of ["inventory.json", "sold.json", "comps.json"]) {
  const src = path.join(SRC, file);
  // comps.json may not exist on an older checkout — seed an empty log so
  // the build never fails on a missing file.
  if (!fs.existsSync(src)) {
    fs.writeFileSync(path.join(DEST, file), JSON.stringify({ entries: [] }, null, 2) + "\n");
    continue;
  }
  fs.copyFileSync(src, path.join(DEST, file));
}
console.log("Synced inventory.json, sold.json, comps.json into dashboard/data/");
