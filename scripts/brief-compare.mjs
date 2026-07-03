// Model-comparison harness — runs the SAME brief prompt through multiple
// models so their analysis and recommendations can be compared side by side.
// Writes one file per model to data/compare/ (does NOT touch the dated
// production briefs in data/briefs/).
//
// Run from the repo root:  node scripts/brief-compare.mjs
// Requires env: ANTHROPIC_API_KEY.
// Optional: MODELS (comma-separated; default "claude-opus-4-8,claude-sonnet-5").

import Anthropic from "@anthropic-ai/sdk";
import { readFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import { activeSellEvents, generateBrief } from "./lib/brief-core.mjs";

const ROOT = process.cwd();
const MODELS = (process.env.MODELS || "claude-opus-4-8,claude-sonnet-5")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const inv = JSON.parse(await readFile(path.join(ROOT, "data", "inventory.json"), "utf-8"));
  const events = activeSellEvents(inv.positions);
  if (events.length === 0) {
    console.log("No active SELL positions to compare.");
    return;
  }

  const outDir = path.join(ROOT, "data", "compare");
  await mkdir(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const client = new Anthropic({ timeout: 9 * 60 * 1000 });

  for (const model of MODELS) {
    console.log(`Generating brief with ${model}…`);
    let body;
    try {
      const brief = await generateBrief(client, events, model);
      body = `# Comparison Brief — ${model} — ${today}\n\n_Identical prompt across models; for A/B evaluation only (not a production brief)._\n\n${brief}\n`;
    } catch (err) {
      body = `# Comparison Brief — ${model} — ${today}\n\n**FAILED:** ${err.message || err}\n`;
      console.error(`  ${model} failed: ${err.message || err}`);
    }
    const outPath = path.join(outDir, `${model}.md`);
    await writeFile(outPath, body);
    console.log(`  Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
