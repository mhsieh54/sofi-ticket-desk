import { readFile } from "fs/promises";
import path from "path";
import type { Position, Brief } from "./types";

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

// Reads the consolidated briefs.json (built by sync-data.js from
// data/briefs/*.md). Already sorted newest-first.
export async function readBriefs(): Promise<Brief[]> {
  const filePath = path.join(DATA_DIR, "briefs.json");
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw).briefs ?? [];
  } catch {
    return [];
  }
}

// Per-position brief snippets: { generatedAt, notes: { [positionId]: snippet } }.
export async function readBriefNotes(): Promise<{ generatedAt: string | null; notes: Record<string, string> }> {
  const filePath = path.join(DATA_DIR, "brief-notes.json");
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return { generatedAt: parsed.generatedAt ?? null, notes: parsed.notes ?? {} };
  } catch {
    return { generatedAt: null, notes: {} };
  }
}
