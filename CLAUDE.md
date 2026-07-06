# SoFi Ticket Desk

**Owner:** Mark Hsieh · Los Angeles, CA
**Purpose:** Ticket resale operation tracker for SoFi Stadium (concerts, Rams, misc events). Every position is tracked from purchase to exit with cost basis, ROI target, and platform strategy — the goal is disciplined, profit-first resale, not casual reselling.

## Platform fees (seller / buyer)
| Platform | Seller Fee | Buyer Fee | Notes |
|---|---|---|---|
| StubHub | 15% | 10% | NFL, high-traffic events |
| Vivid Seats | 10% | 15% | Concerts — best seller net |
| TickPick | 15% effective | 0% | Zero buyer fees — list slightly lower |
| Ticketmaster | 15% | 22% | Avoid unless exclusive |
| Direct | 0% | 0% | Highest margin when available |

## Core rules
- True cost = face value + ALL Ticketmaster/platform service fees. Never use face alone.
- Priority is actually selling — an unsold ticket earns nothing. Maximize profit within what the market will bear; don't let a fixed ROI% target block a real sale above true cost.
- Never price below true cost basis.
- One platform per pair — no double-listing the same seats.
- AutoPrice OFF on StubHub.
- Never the cheapest listing in a section — target 2nd–3rd cheapest.
- Price $10–$25 below next comp, not $100 under.
- Use section-specific live map comps, not event aggregate pricing.

## Categorization
Every position gets exactly one tag:
- **SELL** — actively listed or targeted for resale
- **ATTEND** — Mark is going, not for sale
- **CLIENT** — held on behalf of / co-owned with someone else (e.g. James, Brian)
- **KEEP** — retained, no current sell intent

## File conventions
- Active inventory: `data/inventory.json`
- Sold/realized: `data/sold.json`
- Market briefs: `data/briefs/YYYY-MM-DD.md` — dated narrative briefs from the scheduled agent
- Per-event strategy: `strategy/<event>.md`
- Session handoffs: `handoffs/YYYY-MM-DD.md`
- Dashboard app: `dashboard/`
- Scripts: `scripts/`

## Commands
- `npm run dev` — run the dashboard
- `node scripts/market-brief.mjs` — generate a dated market brief into `data/briefs/` (needs `ANTHROPIC_API_KEY`; runs automatically via GitHub Actions Mon/Wed/Fri)

## Never
- No credit card numbers, bank info, or payment credentials in the repo
- No copyrighted ticket artwork, barcodes, or PDFs committed to git
- No committing `.env` or secrets
