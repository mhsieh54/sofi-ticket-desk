import { NextRequest, NextResponse } from "next/server";
import { readPositions } from "@/lib/data";
import { getFile, putFile } from "@/lib/github";
import { netPayout } from "@/lib/fees";

const INVENTORY_PATH = "data/inventory.json";
const SOLD_PATH = "data/sold.json";

export async function GET() {
  const [inventory, sold] = await Promise.all([
    readPositions("inventory"),
    readPositions("sold"),
  ]);
  return NextResponse.json({ inventory, sold });
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
    const updated = { ...positions[idx], ...updates };
    const newInventory = [...positions];
    newInventory[idx] = updated;

    await putFile(INVENTORY_PATH, { positions: newInventory }, inv.sha, `Update ${updated.event} (id ${id})`);

    const soldPositions = await readPositions("sold");
    return NextResponse.json({ inventory: newInventory, sold: soldPositions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}
