// Mirrors the platform fees table in CLAUDE.md — keep these in sync if that table changes.
export const PLATFORM_FEES: Record<string, { seller: number; buyer: number }> = {
  StubHub: { seller: 0.15, buyer: 0.1 },
  "Vivid Seats": { seller: 0.1, buyer: 0.15 },
  TickPick: { seller: 0.15, buyer: 0.0 },
  Ticketmaster: { seller: 0.15, buyer: 0.22 },
  Direct: { seller: 0.0, buyer: 0.0 },
};

export function netPayout(ask: number, platform: string | null): number {
  const fee = platform ? PLATFORM_FEES[platform]?.seller ?? 0 : 0;
  return ask * (1 - fee);
}
