import { NextRequest, NextResponse } from "next/server";

// Parses an uploaded receipt/ticket image (or PDF) into draft positions using
// Claude vision + structured outputs. Does NOT store the image or commit
// anything — it returns a draft the user reviews and confirms client-side.
//
// Needs ANTHROPIC_API_KEY in the environment (add it to the Vercel project).
// PARSE_MODEL overrides the model (default claude-haiku-4-5 — fast, cheap, and
// plenty for receipt parsing; it supports vision + structured outputs).

export const maxDuration = 60; // vision + structured output can take a while

const SCHEMA = {
  type: "object",
  properties: {
    positions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          event: { type: "string" },
          date: { type: "string" },
          section: { type: "string" },
          row: { type: "string" },
          seats: { type: "string" },
          qty: { type: "integer" },
          face: { type: "number" },
          purchaseDate: { type: "string" },
          notes: { type: "string" },
        },
        required: ["event", "date", "section", "row", "seats", "qty", "face", "purchaseDate", "notes"],
        additionalProperties: false,
      },
    },
  },
  required: ["positions"],
  additionalProperties: false,
};

const PROMPT = `You are parsing a ticket purchase receipt or screenshot for a SoFi Stadium ticket-resale operation. Extract each distinct ticket group as a position.

Per position:
- event: the event/show/game name (e.g. "Rams vs Saints", "Karol G - Tropitour"). For parking, use "Rams Parking (<lot>)" or similar.
- date: the EVENT date as YYYY-MM-DD if shown, else "".
- section: section, lot, or area (e.g. "212", "Lot ORANGE", "FL-A5"), else "".
- row, seats: if shown, else "".
- qty: number of tickets/passes in this group (integer).
- face: TRUE cost per ticket = the total amount PAID for this group divided by qty (use the "Total Paid"/"Amount Paid" figure including all fees/taxes, NOT a pre-fee subtotal). Round to 2 decimals.
- purchaseDate: the purchase/order date as YYYY-MM-DD if shown, else "".
- notes: concise useful references (order #, account #, parking lot, "Preseason", etc.).

If the receipt bundles multiple distinct events, return one position each. If it's a single bundle for one event or parking, return one position with the full qty. Use "" for unknown strings and best-effort for the rest.`;

export async function POST(req: NextRequest) {
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set. Add it to the Vercel project's environment variables." },
        { status: 500 }
      );
    }

    const { data, mediaType } = await req.json();
    if (!data || !mediaType) {
      return NextResponse.json({ error: "Missing file data or media type." }, { status: 400 });
    }

    const isPdf = mediaType === "application/pdf";
    const fileBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data } };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.PARSE_MODEL || "claude-haiku-4-5",
        max_tokens: 2000,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: [fileBlock, { type: "text", text: PROMPT }] }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Claude API ${res.status}: ${body.slice(0, 400)}` }, { status: 500 });
    }

    const result = await res.json();
    if (result.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined to parse this image." }, { status: 500 });
    }
    const text = (result.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Could not parse the model's response." }, { status: 500 });
    }

    return NextResponse.json({ positions: parsed.positions ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse the file." }, { status: 500 });
  }
}
