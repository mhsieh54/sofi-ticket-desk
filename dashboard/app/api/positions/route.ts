import { NextRequest, NextResponse } from "next/server";
import { readPositions, readBriefNotes } from "@/lib/data";
import { getFile, putFile } from "@/lib/github";
import { netPayout } from "@/lib/fees";

const INVENTORY_PATH = "data/inventory.json";
const SOLD_PATH = "data/sold.json";

export async function GET() {
  const [inventory, sold, briefNotes] = await Promise.all([
    readPositions("inventory"),
    readPositions("sold"),
    readBriefNotes(),
  ]);
  return NextResponse.json({ inventory, sold, briefNotes });
}

// Adds one or more reviewed draft positions to inventory (from the Upload
// tab). Assigns fresh ids (unique across inventory + sold) and fills schema
// defaults; only the user-reviewed fields come from the request.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const incoming: any[] = Array.isArray(body.positions) ? body.positions : [];
    if (incoming.length === 0) {
      return NextResponse.json({ error: "No positions to add." }, { status: 400 });
    }

    const inv = await getFile(INVENTORY_PATH);
    const soldFile = await getFile(SOLD_PATH);
    const positions = inv.content.positions as any[];
    const allIds = [...positions, ...soldFile.content.positions].map((p: any) => p.id);
    let nextId = allIds.length ? Math.max(...allIds) + 1 : 1;
    const today = new Date().toISOString().slice(0, 10);

    const added = incoming.map((pos) => ({
      id: nextId++,
      event: (pos.event ?? "").toString(),
      date: (pos.date ?? "").toString(),
      section: (pos.section ?? "").toString(),
      row: (pos.row ?? "").toString(),
      seats: pos.seats ? pos.seats.toString() : "—",
      qty: Number(pos.qty) || 1,
      face: Number(pos.face) || 0,
      fmv: null,
      category: ["SELL", "ATTEND", "CLIENT", "KEEP"].includes(pos.category) ? pos.category : "SELL",
      status: "held",
      platform: null,
      ask: null,
      sold: false,
      soldDate: null,
      soldPayout: null,
      purchaseDate: (pos.purchaseDate || today).toString(),
      targetAsk: null,
      targetPlatform: null,
      targetSellDate: null,
      clientReserved: 0,
      notes: pos.notes ? pos.notes.toString() : null,
    }));

    const newInventory = [...positions, ...added];
    await putFile(
      INVENTORY_PATH,
      { positions: newInventory },
      inv.sha,
      `Add ${added.length} position(s) from receipt upload`
    );

    const soldPositions = await readPositions("sold");
    return NextResponse.json({ inventory: newInventory, sold: soldPositions, added: added.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add positions." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;

    const inv = await getFile(INVENTORY_PATH);
    const positions = inv.content.positions as any[];
    const idx = positions.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Position not found in active inventory" }, { status: 404 });
    }

    if (action === "markSold") {
      const { soldPrice, platform, soldDate } = body;
      const position = { ...positions[idx] };
      position.sold = true;
      position.status = "sold";
      position.platform = platform;
      position.ask = soldPrice;
      position.soldDate = soldDate;
      position.soldPayout = Math.round(netPayout(soldPrice, platform) * 100) / 100;

      const newInventory = positions.filter((p) => p.id !== id);
      const soldFile = await getFile(SOLD_PATH);
      const newSold = [...soldFile.content.positions, position];

      await putFile(INVENTORY_PATH, { positions: newInventory }, inv.sha, `Mark sold: ${position.event} (id ${id})`);
      await putFile(SOLD_PATH, { positions: newSold }, soldFile.sha, `Mark sold: ${position.event} (id ${id})`);

      return NextResponse.json({ inventory: newInventory, sold: newSold });
    }

    const { updates } = body;
    const prev = positions[idx];
    const updated = { ...prev, ...updates };

    // Stamp when the current ask/platform took effect, so the UI can show
    // "days listed at this price". Reset the clock when the price or platform
    // changes (a re-list), or on first save of an already-listed position;
    // clear it when the position is no longer listed.
    if (updates && ("ask" in updates || "platform" in updates)) {
      const today = new Date().toISOString().slice(0, 10);
      if (updated.ask == null) {
        updated.askSetAt = null;
      } else if (updated.ask !== prev.ask || updated.platform !== prev.platform || !prev.askSetAt) {
        updated.askSetAt = today;
      }
      // else: same ask + platform and already tracked → keep prev.askSetAt (via spread)
    }

    const newInventory = [...positions];
    newInventory[idx] = updated;

    await putFile(INVENTORY_PATH, { positions: newInventory }, inv.sha, `Update ${updated.event} (id ${id})`);

    const soldPositions = await readPositions("sold");
    return NextResponse.json({ inventory: newInventory, sold: soldPositions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}
