# SoFi Ticket Desk

Ticket resale operation tracker for SoFi Stadium events, run by Mark Hsieh. Tracks every ticket position from purchase through sale — cost basis, target ROI, platform, and exit timing — so pricing decisions are based on real numbers, not gut feel.

Rules, platform fees, and workflow conventions live in [CLAUDE.md](./CLAUDE.md). This file is the map to where things live and how to run them.

## What's here

| Path | Purpose |
|---|---|
| `data/inventory.json` | Active positions — everything bought, not yet sold/resolved |
| `data/sold.json` | Realized sales — closed-out positions with actual net/profit |
| `data/comps/YYYY-MM-DD/<event>.json` | Daily comp price snapshots per event/section |
| `data/journal.md` | Running log of sales, profit, ROI |
| `strategy/<event>.md` | Per-event pricing/exit strategy, one file per event |
| `handoffs/YYYY-MM-DD.md` | Session-to-session handoff notes — what happened, what's next |
| `scripts/` | Comp scraping and automation scripts |
| `dashboard/` | Local dashboard app for viewing positions/comps |

## Running it

```
npm run dev
```

Starts the dashboard (once built). Scraper/automation commands will be documented in `CLAUDE.md` as they're added.

## Finding strategy for an event

Check `strategy/<event-name>.md` first — that's the source of truth for how a given event's tickets are being priced and where. If a strategy file doesn't exist yet for an active position, one gets created the first time a strategy is worked out for it.

## Status

Session 1: project bootstrap. Inventory migration from the original React artifact (`sofi-ticket-manager.jsx`) is tracked in `handoffs/`.
