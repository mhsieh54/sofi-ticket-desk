// Shared brief-generation logic, used by both the scheduled runner
// (market-brief.mjs) and the model-comparison harness (brief-compare.mjs).
// Keeping the prompt here guarantees every model gets identical input.

// Stable business context — mirrors CLAUDE.md. Prices the same way the desk
// does and respects the hard ceilings.
export const SYSTEM = `You are the market analyst for a SoFi Stadium ticket-resale desk run by Mark Hsieh in LA.
You produce a concise, decision-useful market brief a few times a week. Be direct, lead with the number or the call, no hedging.

Platform seller fees: StubHub 15%, Vivid Seats 10%, TickPick 15% (0% buyer fee), Ticketmaster 15%, Direct 0%.
Rules that constrain recommendations:
- Priority is actually selling — an unsold ticket earns nothing. Maximize profit within what the market will bear, but never price below true cost, and don't hold out for a fixed ROI% target at the expense of a real sale.
- Never the cheapest listing in a section — target 2nd-3rd cheapest.
- BTS: hard ceiling $625/ticket (ARMY boycott risk above that) — never recommend exceeding it.
- Prefer section-specific signals over event-aggregate pricing.

You have web search. For each active event, search for current resale/demand signals (recent listing prices, tour momentum, comparable-market dates, supply pressure). You will NOT find exact live SoFi section floors — that's fine; give directional read and a clear recommendation, and say when a signal is soft or unavailable rather than inventing a number.

OUTPUT FORMAT — strict: Respond with ONLY the finished brief in Markdown. Do not narrate your process, do not write any preamble or "I'll now…" lines, and do not include a top-level "# " title (the file already has one). Your very first line must be "## Bottom line".`;

export function activeSellEvents(positions) {
  const sell = positions.filter((p) => p.category === "SELL" && !p.sold);
  const byEvent = new Map();
  for (const p of sell) {
    const key = `${p.event}|${p.date}`;
    if (!byEvent.has(key)) byEvent.set(key, { event: p.event, date: p.date, positions: [] });
    byEvent.get(key).positions.push(p);
  }
  return Array.from(byEvent.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildUserPrompt(events) {
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

// Generates the brief text for one model. Handles the server-side web-search
// pause_turn loop and refusal guard.
export async function generateBrief(client, events, model) {
  const messages = [{ role: "user", content: buildUserPrompt(events) }];
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 20 }];

  let response;
  for (let i = 0; i < 6; i++) {
    response = await client.messages.create({
      model,
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
    throw new Error(`Model ${model} refused the request (stop_reason: refusal).`);
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) throw new Error(`Model ${model} returned no text content.`);
  return text;
}

// Second pass: distill the prose brief into a one-line actionable snippet per
// position, keyed by position id. Uses structured outputs so the result is
// reliably parseable. No web search here — it's pure extraction from the brief
// text already generated, so it's fast and cheap.
export async function extractBriefNotes(client, briefText, positions, model) {
  const posList = positions.map((p) => `id ${p.id}: ${p.event} — Sec ${p.section}`).join("\n");
  const schema = {
    type: "object",
    properties: {
      notes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            snippet: { type: "string" },
          },
          required: ["id", "snippet"],
          additionalProperties: false,
        },
      },
    },
    required: ["notes"],
    additionalProperties: false,
  };

  const res = await client.messages.create({
    model,
    max_tokens: 3000,
    output_config: { format: { type: "json_schema", schema } },
    messages: [
      {
        role: "user",
        content: `Today's market brief:\n\n${briefText}\n\nActive positions:\n${posList}\n\nFor each position id, extract a single actionable recommendation (≤140 characters) drawn from the brief's guidance for that exact event + section — e.g. "Hold on TickPick $781; trim to ~$740 if flat by 7/12" or "List now $475 on Vivid; ceiling $625". If the brief has no guidance for a position, use an empty string. Return an entry for every id.`,
      },
    ],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(text);
  const map = {};
  for (const n of parsed.notes || []) {
    if (n && typeof n.id === "number" && n.snippet && n.snippet.trim()) {
      map[n.id] = n.snippet.trim();
    }
  }
  return map;
}
