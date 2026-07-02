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
console.log("Synced inventory.json, sold.json into dashboard/data/");
