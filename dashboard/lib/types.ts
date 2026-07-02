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
