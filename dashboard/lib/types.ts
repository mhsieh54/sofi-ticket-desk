export type Category = "SELL" | "ATTEND" | "CLIENT" | "KEEP";
export type Status = "held" | "listed" | "sold";

export interface Position {
  id: number;
  event: string;
  date: string;
  section: string;
  row: string;
  seats: string;
  qty: number;
  face: number;
  fmv: number | null;
  category: Category;
  status: Status;
  platform: string | null;
  ask: number | null;
  sold: boolean;
  soldDate: string | null;
  soldPayout: number | null;
  purchaseDate: string;
  targetAsk: number | null;
  targetPlatform: string | null;
  targetSellDate: string | null;
  clientReserved: number;
  notes: string | null;
}

// A single logged comp reading for a section, entered from the live map.
// Append-only log — new readings are added, old ones are never mutated,
// so trends over time are preserved.
export interface Comp {
  id: number;
  event: string;
  eventDate: string; // the event's date, matches Position.date
  section: string;
  floor: number; // cheapest comp in the section
  comp2: number | null; // 2nd-cheapest
  comp3: number | null; // 3rd-cheapest
  source: string | null; // platform the reading came from
  loggedAt: string; // ISO timestamp of when it was recorded
  notes: string | null;
}
