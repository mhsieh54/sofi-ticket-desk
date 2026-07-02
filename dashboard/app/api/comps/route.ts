import { NextRequest, NextResponse } from "next/server";
import { readComps } from "@/lib/data";
import { getFileOrDefault, putFile } from "@/lib/github";

const COMPS_PATH = "data/comps.json";

export async function GET() {
  const comps = await readComps();
  return NextResponse.json({ comps });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, eventDate, section, floor, comp2, comp3, source, notes } = body;

    if (!event || !eventDate || !section || floor == null) {
      return NextResponse.json({ error: "event, eventDate, section, and floor are required" }, { status: 400 });
    }

    const file = await getFileOrDefault(COMPS_PATH, { entries: [] });
    const entries = (file.content.entries ?? []) as any[];
    const nextId = entries.reduce((max, e) => Math.max(max, e.id), 0) + 1;

    const entry = {
      id: nextId,
      event,
      eventDate,
      section,
      floor: Number(floor),
      comp2: comp2 != null && comp2 !== "" ? Number(comp2) : null,
      comp3: comp3 != null && comp3 !== "" ? Number(comp3) : null,
      source: source || null,
      loggedAt: new Date().toISOString(),
      notes: notes || null,
    };

    const newEntries = [...entries, entry];
    await putFile(COMPS_PATH, { entries: newEntries }, file.sha, `Log comp: ${event} ${section} floor $${entry.floor}`);

    return NextResponse.json({ comps: newEntries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log comp" }, { status: 500 });
  }
}
