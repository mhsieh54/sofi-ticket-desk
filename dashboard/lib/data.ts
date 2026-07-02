import { readFile } from "fs/promises";
import path from "path";
import type { Position } from "./types";

// Reads from the local dashboard/data/ copy, synced from the project root's
// data/ by scripts/sync-data.js (see predev/prebuild in package.json).
// Turbopack refuses to trace paths that cross the project root, so the app
// can't read ../data directly at build time.
const DATA_DIR = path.join(process.cwd(), "data");

export async function readPositions(file: "inventory" | "sold"): Promise<Position[]> {
  const filePath = path.join(DATA_DIR, `${file}.json`);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw).positions;
}
