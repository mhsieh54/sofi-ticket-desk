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
  askSetAt?: string | null; // YYYY-MM-DD the current ask/platform was set — drives "days listed at this price"
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

// A dated market-narrative brief written by the scheduled agent.
export interface Brief {
  date: string; // YYYY-MM-DD, from the filename
  content: string; // raw markdown
}
