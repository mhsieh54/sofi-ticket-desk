# SoFi Ticket Desk

Ticket resale operation tracker for SoFi Stadium events, run by Mark Hsieh. Tracks every ticket position from purchase through sale — cost basis, target ROI, platform, and exit timing — so pricing decisions are based on real numbers, not gut feel.

Rules, platform fees, and workflow conventions live in [CLAUDE.md](./CLAUDE.md). This file is the map to where things live and how to run them.

## What's here

| Path | Purpose |
|---|---|
| `data/inventory.json` | Active positions — everything bought, not yet sold/resolved |
| `data/sold.json` | Realized sales — closed-out positions with actual net/profit |
| `data/comps.json` | Append-only log of section-floor comp readings, entered from the dashboard's Comps tab |
| `data/journal.md` | Running log of sales, profit, ROI |
| `strategy/<event>.md` | Per-event pricing/exit strategy, one file per event |
| `handoffs/YYYY-MM-DD.md` | Session-to-session handoff notes — what happened, what's next |
| `scripts/` | Comp scraping and automation scripts |
| `dashboard/` | Local dashboard app for viewing positions/comps |

## Running it

```
npm run dev
```

Starts the dashboard locally at `http://localhost:3000` (login-gated). Scraper/automation commands will be documented in `CLAUDE.md` as they're added.

## Finding strategy for an event

Check `strategy/<event-name>.md` first — that's the source of truth for how a given event's tickets are being priced and where. If a strategy file doesn't exist yet for an active position, one gets created the first time a strategy is worked out for it.

## Dashboard: phone/multi-device setup

The dashboard (`dashboard/`) is a Next.js app, password-gated, that reads `data/inventory.json` / `data/sold.json` and writes edits back as real git commits via the GitHub API — this is what makes "mark sold" or "edit price" from your phone actually persist. It's deployed to Vercel's free tier so it's reachable from any device with a URL, not just the machine running `npm run dev`.

**One-time setup** (needed before phone access or any edit-from-dashboard works):

1. **Create a private GitHub repo** and push this project to it:
   ```
   git remote add origin https://github.com/<your-username>/sofi-ticket-desk.git
   git push -u origin master
   ```
   (Create the empty repo on github.com first — mark it **Private**, since this is financial data.)

2. **Create a GitHub Personal Access Token** (Settings → Developer settings → Fine-grained tokens) scoped to just this repo, with **Contents: read and write** permission. Copy the token — you'll need it in step 4.

3. **Create a free Vercel account** at vercel.com, connect your GitHub, and import the `sofi-ticket-desk` repo as a new project. In the project's settings:
   - **Root Directory**: `dashboard`
   - Build command / output: leave as Next.js defaults

4. **Set these environment variables** in the Vercel project settings (Settings → Environment Variables):
   ```
   GITHUB_TOKEN=<the token from step 2>
   GITHUB_OWNER=<your-github-username>
   GITHUB_REPO=sofi-ticket-desk
   GITHUB_BRANCH=master
   APP_PASSWORD=<choose a real password>
   SESSION_SECRET=<any long random string>
   ```

5. Deploy. Vercel gives you a URL (e.g. `sofi-ticket-desk.vercel.app`) — open it on your phone, log in with `APP_PASSWORD`, and add it to your home screen for app-like access.

After this is set up, every edit made from any device (phone included) becomes a real git commit, and Vercel auto-redeploys on push (~30-60s) so all devices stay in sync.

**Local development:** `npm run dev` works immediately for read-only testing against a local copy of `.env.local` (see `dashboard/.env.local.example`) — no GitHub/Vercel setup needed just to view data locally. Only the write path (mark sold, edit) requires the real GitHub token.

## Status

Session 4: dashboard built (Next.js, password-gated, GitHub-API write-back, deploys to Vercel). Local read/write UI tested and working; account setup (GitHub repo, Vercel project, env vars) is the one remaining manual step — see above. Session 1-3 history: project bootstrap and inventory/strategy migration from the original React artifact (`sofi-ticket-manager.jsx`), tracked in `handoffs/`.
