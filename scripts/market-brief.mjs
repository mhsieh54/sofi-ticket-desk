// Scheduled market-narrative agent (Part A of the comp-checker).
//
// Reads data/inventory.json, asks Claude to web-search current resale
// conditions for each active SELL event, and writes a dated market brief to
// data/briefs/YYYY-MM-DD.md. The GitHub Actions workflow commits the result,
// which triggers a Vercel redeploy so the brief reaches every device.
//
// This produces market *narrative* (directional signals, demand context) —
// NOT exact section floors. Exact floors come from the manually-logged
// data/comps.json (the Comps tab). The two are complementary.
//
// Run from the repo root:  node scripts/market-brief.mjs
// Requires env: ANTHROPIC_API_KEY. Optional: MODEL (default claude-opus-4-8).

import Anthropic from "@anthropic-ai/sdk";
import { readFile, mkdir, writeFile } from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const MODEL = process.env.MODEL || "claude-opus-4-8";

// Stable business context — mirrors CLAUDE.md. Kept here so the agent prices
// the same way the desk does, and respects the hard ceilings.
const SYSTEM = `You are the market analyst for a SoFi Stadium ticket-resale desk run by Mark Hsieh in LA.
You produce a concise, decision-useful market brief a few times a week. Be direct, lead with the number or the call, no hedging.

Platform seller fees: StubHub 15%, Vivid Seats 10%, TickPick 15% (0% buyer fee), Ticketmaster 15%, Direct 0%.
Rules that constrain recommendations:
- 30% minimum ROI target after fees; never price below true cost.
- Never the cheapest listing in a section — target 2nd-3rd cheapest.
- BTS: hard ceiling $625/ticket (ARMY boycott risk above that) — never recommend exceeding it.
- Prefer section-specific signals over event-aggregate pricing.

You have web search. For each active event, search for current resale/demand signals (recent listing prices, tour momentum, comparable-market dates, supply pressure). You will NOT find exact live SoFi section floors — that's fine; give directional read and a clear recommendation, and say when a signal is soft or unavailable rather than inventing a number.`;

function activeSellEvents(positions) {
  const sell = positions.filter((p) => p.category === "SELL" && !p.sold);
  const byEvent = new Map();
  for (const p of sell) {
    const key = `${p.event}|${p.date}`;
    if (!byEvent.has(key)) byEvent.set(key, { event: p.event, date: p.date, positions: [] });
    byEvent.get(key).positions.push(p);
  }
  return Array.from(byEvent.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildUserPrompt(events) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = events.map((e) => {
    const pos = e.positions
      .map((p) => {
        const listed = p.status === "listed" ? `listed on ${p.platform} @ $${p.ask}` : "not yet listed";
        const target = p.targetAsk ? `target $${p.targetAsk} on ${p.targetPlatform}` : "no target set";
        return `    - Sec ${p.section}: cost $${p.face}/tkt, ${listed}, ${target}, sell-by ${p.targetSellDate ?? "n/a"}`;
      })
      .join("\n");
    return `- ${e.event} (${e.date}):\n${pos}`;
  });

  return `Today is ${today}. Active resale positions needing a market read:

${lines.join("\n")}

Write a market brief as Markdown with:
1. A one-line "## Bottom line" summary at the top (the 1-2 most important moves this week across the whole book).
2. A "## By event" section with one short subsection per event: current market read (with any concrete comps you found and their source/date), and a specific recommendation (hold / list now at $X on <platform> / cut to $X / raise). Respect the fee, ROI, and ceiling rules above.
3. A "## Watch" section: dated signals to check next (tour openers, comparable-market dates, etc.).

Keep it tight — this is a working brief, not a report. Cite sources inline where you used them.`;
}

async function generateBrief(client, events) {
  const messages = [{ role: "user", content: buildUserPrompt(events) }];
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 20 }];

  // Server-side web search runs a loop; if it hits the per-response iteration
  // cap it returns stop_reason: "pause_turn" — re-send to resume.
  let response;
  for (let i = 0; i < 6; i++) {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      tools,
      messages,
    });
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }

  if (response.stop_reason === "refusal") {
    throw new Error("Model refused the request (stop_reason: refusal).");
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Model returned no text content.");
  return text;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const inv = JSON.parse(await readFile(path.join(ROOT, "data", "inventory.json"), "utf-8"));
  const events = activeSellEvents(inv.positions);

  const today = new Date().toISOString().slice(0, 10);
  const briefsDir = path.join(ROOT, "data", "briefs");
  await mkdir(briefsDir, { recursive: true });
  const outPath = path.join(briefsDir, `${today}.md`);

  if (events.length === 0) {
    const body = `# Market Brief — ${today}\n\nNo active SELL positions to analyze.\n`;
    await writeFile(outPath, body);
    console.log(`No active SELL positions. Wrote placeholder to ${outPath}`);
    return;
  }

  const client = new Anthropic({ timeout: 9 * 60 * 1000 });
  console.log(`Generating brief for ${events.length} event(s) with ${MODEL}…`);
  const brief = await generateBrief(client, events);

  const body = `# Market Brief — ${today}\n\n_Generated by the scheduled market agent (${MODEL}). Directional read, not exact floors — log real section floors in the Comps tab._\n\n${brief}\n`;
  await writeFile(outPath, body);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
