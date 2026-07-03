import { NextResponse } from "next/server";
import { readBriefs } from "@/lib/data";

export async function GET() {
  const briefs = await readBriefs();
  return NextResponse.json({ briefs });
}
