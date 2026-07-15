"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PLATFORM_FEES, netPayout } from "@/lib/fees";
import type { Position, Category, Brief } from "@/lib/types";

const CATEGORY_COLOR: Record<string, string> = {
  SELL: "#F0C040",
  ATTEND: "#60a5fa",
  CLIENT: "#9B59B6",
  KEEP: "#4ade80",
};

const PLATFORM_COLOR: Record<string, string> = {
  StubHub: "#00D4AA",
  "Vivid Seats": "#9B59B6",
  TickPick: "#F97316",
  Ticketmaster: "#006BE6",
  Direct: "#4ade80",
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function daysSince(dateStr: string): number {
  const start = new Date(dateStr + "T00:00:00");
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}

function urgencyColor(days: number): string {
  if (days < 7) return "#f87171";
  if (days < 14) return "#F0C040";
  if (days < 30) return "#60a5fa";
  return "#4ade80";
}

function urgencyLabel(days: number): string {
  if (days < 0) return "past";
  if (days < 7) return `${days}d — urgent`;
  if (days < 14) return `${days}d — list now`;
  if (days < 30) return `${days}d — prime window`;
  return `${days}d — hold`;
}

// Annualized return: (payout/cost)^(365/days) - 1. Same methodology as the
// original React artifact's IRR calc — projects a short holding period's
// return out to a full year so positions of different durations compare.
function calcIRR(cost: number, payout: number, days: number): number {
  if (!cost || !days || days <= 0 || payout <= 0) return 0;
  const ratio = payout / cost;
  if (ratio <= 0) return 0;
  return Math.pow(ratio, 365 / days) - 1;
}

function fmtPct(fraction: number): string {
  if (!isFinite(fraction)) return "—";
  const pct = fraction * 100;
  return `${pct.toLocaleString("en-US", { maximumFractionDigits: 0 })}%`;
}

function shortEventTag(event: string, date: string): string {
  const short = event.split(" - ")[0].split(" (")[0];
  const d = new Date(date + "T00:00:00");
  const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${short} ${monthDay}`;
}

function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .toUpperCase();
}

function shiftMonth(m: string, n: number): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface TimelineItem {
  date: string;
  month: string;
  eventTag: string;
  text: string;
  color: string;
}

// Built from live data (targetSellDate / event date), not hand-maintained —
// only SELL positions with a target and CLIENT positions needing billing
// generate an action; ATTEND/KEEP need no action so they're excluded.
function buildTimeline(inventory: Position[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const p of inventory) {
    if (p.category === "SELL" && p.targetSellDate) {
      items.push({
        date: p.targetSellDate,
        month: p.targetSellDate.slice(0, 7),
        eventTag: shortEventTag(p.event, p.date),
        text:
          p.status === "listed"
            ? `Listed on ${p.platform} @ $${p.ask} — monitor and cut if stale`
            : `List ${p.event} — target $${p.targetAsk} on ${p.targetPlatform}`,
        color: CATEGORY_COLOR.SELL,
      });
    }
    if (p.category === "CLIENT" && !p.sold) {
      items.push({
        date: p.date,
        month: p.date.slice(0, 7),
        eventTag: shortEventTag(p.event, p.date),
        text: `Bill company for ${p.event} — $${((p.fmv ?? p.face) * p.qty).toFixed(0)}`,
        color: CATEGORY_COLOR.CLIENT,
      });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  return items;
}

type Tab = "overview" | "brief" | "inventory" | "football" | "sold";

export default function DashboardPage() {
  const [inventory, setInventory] = useState<Position[] | null>(null);
  const [sold, setSold] = useState<Position[] | null>(null);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [briefNotes, setBriefNotes] = useState<Record<string, string>>({});
  const [briefNotesDate, setBriefNotesDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sellingId, setSellingId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [briefRunning, setBriefRunning] = useState(false);
  const [briefRunMsg, setBriefRunMsg] = useState("");
  const router = useRouter();

  async function runBriefNow() {
    setBriefRunning(true);
    setBriefRunMsg("");
    const res = await fetch("/api/run-brief", { method: "POST" });
    setBriefRunning(false);
    if (res.ok) {
      setBriefRunMsg("Triggered. New brief generates and deploys in ~2-3 min — refresh this page then.");
    } else {
      const body = await res.json().catch(() => ({}));
      setBriefRunMsg(body.error || "Failed to trigger the brief.");
    }
  }

  async function load() {
    setLoading(true);
    const [posRes, briefRes] = await Promise.all([
      fetch("/api/positions"),
      fetch("/api/briefs"),
    ]);
    const posData = await posRes.json();
    const briefData = await briefRes.json();
    setInventory(posData.inventory || []);
    setSold(posData.sold || []);
    setBriefNotes(posData.briefNotes?.notes || {});
    setBriefNotesDate(posData.briefNotes?.generatedAt || null);
    setBriefs(briefData.briefs || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function patchPosition(id: number, payload: any): Promise<boolean> {
    setError("");
    const res = await fetch("/api/positions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Update failed");
      return false;
    }
    const data = await res.json();
    setInventory(data.inventory);
    setSold(data.sold);
    return true;
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  if (loading) return <div className="center-msg">Loading…</div>;
  if (!inventory || !sold) return <div className="center-msg">{error || "Failed to load data."}</div>;

  const activeSell = inventory.filter((p) => p.category === "SELL");
  const capitalIn = activeSell.reduce((s, p) => s + p.face * p.qty, 0);
  const forSaleQty = activeSell.reduce((s, p) => s + p.qty, 0);
  const keepQty = inventory.filter((p) => p.category === "KEEP").reduce((s, p) => s + p.qty, 0);
  const realizedProfit = sold.reduce((s, p) => s + ((p.soldPayout ?? 0) - p.face) * p.qty, 0);
  const projectedProfit = activeSell.reduce((s, p) => {
    if (!p.targetAsk || !p.targetPlatform) return s;
    return s + (netPayout(p.targetAsk, p.targetPlatform) - p.face) * p.qty;
  }, 0);

  const totalActiveQty = inventory.reduce((s, p) => s + p.qty, 0);
  const totalInvested = inventory.reduce((s, p) => s + p.face * p.qty, 0);

  const sortedInventory = [...inventory].sort((a, b) => a.date.localeCompare(b.date));
  const footballPositions = sortedInventory.filter((p) => p.event.startsWith("Rams"));
  const timeline = buildTimeline(inventory);

  const soldTotalCost = sold.reduce((s, p) => s + p.face * p.qty, 0);
  const soldTotalPayout = sold.reduce((s, p) => s + (p.soldPayout ?? 0) * p.qty, 0);
  const soldROI = soldTotalCost > 0 ? (realizedProfit / soldTotalCost) * 100 : 0;
  const sortedSold = [...sold].sort((a, b) => (b.soldDate || "").localeCompare(a.soldDate || ""));

  // Simple ROI on realized trades — more honest than annualizing a short
  // hold, so this one stays un-annualized (matches the original artifact).
  const realizedROI = soldTotalCost > 0 ? realizedProfit / soldTotalCost : 0;

  // Cost-weighted blended IRR, annualized, for active SELL positions with a
  // defined target — projects the return if every target sale lands on its
  // targetSellDate.
  const projectedIRR = (() => {
    let weightedIRR = 0;
    let totalCostWeight = 0;
    activeSell.forEach((p) => {
      if (!p.targetAsk || !p.targetPlatform || !p.purchaseDate || !p.targetSellDate) return;
      const cost = p.face * p.qty;
      const payout = netPayout(p.targetAsk, p.targetPlatform) * p.qty;
      const days = Math.max(1, (new Date(p.targetSellDate).getTime() - new Date(p.purchaseDate).getTime()) / 86400000);
      weightedIRR += calcIRR(cost, payout, days) * cost;
      totalCostWeight += cost;
    });
    return totalCostWeight > 0 ? weightedIRR / totalCostWeight : 0;
  })();

  function editHandlers(p: Position) {
    return {
      editing: editingId === p.id,
      selling: sellingId === p.id,
      onEdit: () => setEditingId(editingId === p.id ? null : p.id),
      onSell: () => setSellingId(sellingId === p.id ? null : p.id),
      onSaveEdit: async (updates: Partial<Position>) => {
        if (await patchPosition(p.id, { updates })) setEditingId(null);
      },
      onSaveSell: async (payload: { soldPrice: number; platform: string; soldDate: string }) => {
        if (await patchPosition(p.id, { action: "markSold", ...payload })) setSellingId(null);
      },
    };
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header-left">
          <div className="logo-mark">S</div>
          <div>
            <div className="brand-title">SoFi Ticket Desk</div>
            <div className="brand-sub">Daily Manager · Mark</div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-date">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </div>
          <button className="btn-ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>Overview</button>
        <button className={`tab-btn ${tab === "brief" ? "active" : ""}`} onClick={() => setTab("brief")}>Brief</button>
        <button className={`tab-btn ${tab === "inventory" ? "active" : ""}`} onClick={() => setTab("inventory")}>Inventory</button>
        <button className={`tab-btn ${tab === "football" ? "active" : ""}`} onClick={() => setTab("football")}>Football</button>
        <button className={`tab-btn ${tab === "sold" ? "active" : ""}`} onClick={() => setTab("sold")}>Sold</button>
      </nav>

      <div className="page-inner">
        {error && <div className="banner-error">{error}</div>}

        {tab === "overview" && (
          <div>
            <div className="greeting-title">Good morning, Mark.</div>
            <div className="greeting-sub">
              {totalActiveQty} tickets active · ${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })} invested · $
              {realizedProfit.toFixed(0)} realized P&L
            </div>

            <div className="stats">
              <StatCard label="For Sale" value={String(forSaleQty)} sub={`${activeSell.length} positions`} />
              <StatCard label="Capital In" value={`$${capitalIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="resale inventory" />
              <StatCard label="Personal Keep" value={String(keepQty)} accent="#60a5fa" />
              <StatCard
                label="Realized P&L"
                value={`$${realizedProfit.toFixed(0)}`}
                accent={realizedProfit >= 0 ? "#4ade80" : "#f87171"}
                rate={fmtPct(realizedROI)}
                rateLabel="ROI"
                sub={`${sold.length} sold`}
              />
              <StatCard
                label="Projected P&L"
                value={`$${projectedProfit.toFixed(0)}`}
                accent="#F0C040"
                rate={fmtPct(projectedIRR)}
                rateLabel="IRR"
                sub="if targets hit"
              />
            </div>

            <div className="roadmap-heading">Monthly Action Roadmap</div>
            <MonthlyRoadmap items={timeline} />
          </div>
        )}

        {tab === "brief" && (
          <div>
            <div className="page-title">Market Brief</div>
            <div className="page-subtitle">Directional market read from the scheduled agent (Mon + Thu).</div>
            <div className="brief-run">
              <button className="btn-primary" style={{ margin: 0 }} disabled={briefRunning} onClick={runBriefNow}>
                {briefRunning ? "Triggering…" : "Run brief now"}
              </button>
              {briefRunMsg && <span className="brief-run-msg">{briefRunMsg}</span>}
            </div>
            <BriefTab briefs={briefs} />
          </div>
        )}

        {tab === "inventory" && (
          <div>
            <div className="page-title">Inventory</div>
            <div className="page-subtitle">All active holdings, organized by date. Face = true cost including all fees.</div>
            <div className="list-panel">
              <div className="list-panel-header">
                <span className="list-panel-label">Active ({inventory.length})</span>
                <span className="list-panel-counts">
                  Sell: <span style={{ color: CATEGORY_COLOR.SELL }}>{activeSell.length}</span> · Attend:{" "}
                  <span style={{ color: CATEGORY_COLOR.ATTEND }}>{inventory.filter((p) => p.category === "ATTEND").length}</span> · Client:{" "}
                  <span style={{ color: CATEGORY_COLOR.CLIENT }}>{inventory.filter((p) => p.category === "CLIENT").length}</span> · Keep:{" "}
                  <span style={{ color: CATEGORY_COLOR.KEEP }}>{inventory.filter((p) => p.category === "KEEP").length}</span>
                </span>
              </div>
              {sortedInventory.map((p) => (
                <TicketRow key={p.id} p={p} briefNote={briefNotes[p.id]} briefNoteDate={briefNotesDate} {...editHandlers(p)} />
              ))}
            </div>
          </div>
        )}

        {tab === "football" && (
          <div>
            <div className="page-title">Football</div>
            <div className="page-subtitle">Rams 2026 Season — Sec C135 Row 6, Club Level.</div>
            <div className="list-panel">
              <div className="list-panel-header">
                <span className="list-panel-label">Rams Positions ({footballPositions.length})</span>
                <span className="list-panel-counts">
                  Sell: <span style={{ color: CATEGORY_COLOR.SELL }}>{footballPositions.filter((p) => p.category === "SELL").length}</span> · Attend:{" "}
                  <span style={{ color: CATEGORY_COLOR.ATTEND }}>{footballPositions.filter((p) => p.category === "ATTEND").length}</span> · Client:{" "}
                  <span style={{ color: CATEGORY_COLOR.CLIENT }}>{footballPositions.filter((p) => p.category === "CLIENT").length}</span>
                </span>
              </div>
              {footballPositions.length === 0 ? (
                <div className="roadmap-empty">No football positions found.</div>
              ) : (
                footballPositions.map((p) => <TicketRow key={p.id} p={p} briefNote={briefNotes[p.id]} briefNoteDate={briefNotesDate} {...editHandlers(p)} />)
              )}
            </div>
          </div>
        )}

        {tab === "sold" && (
          <div>
            <div className="page-title">Sold</div>
            <div className="page-subtitle">Realized sales — closed-out positions with actual net/profit.</div>

            <div className="stats">
              <StatCard
                label="Realized P&L"
                value={`$${realizedProfit.toFixed(0)}`}
                accent={realizedProfit >= 0 ? "#4ade80" : "#f87171"}
                rate={fmtPct(realizedROI)}
                rateLabel="ROI"
                sub={`${sold.length} sold`}
              />
              <StatCard label="Total Cost" value={`$${soldTotalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <StatCard label="Total Payout" value={`$${soldTotalPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent="#60a5fa" />
              <StatCard label="Blended ROI" value={`${soldROI.toFixed(0)}%`} accent="#F0C040" />
            </div>

            <div className="list-panel">
              <div className="list-panel-header">
                <span className="list-panel-label">Sold ({sold.length})</span>
              </div>
              {sortedSold.length === 0 ? (
                <div className="roadmap-empty">No sold positions yet.</div>
              ) : (
                sortedSold.map((p) => <SoldRow key={p.id} p={p} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  rate,
  rateLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  rate?: string;
  rateLabel?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: accent || "#F0C040" }}>{value}</div>
      {rate && (
        <div className="stat-rate" style={{ color: accent || "#F0C040" }}>
          {rateLabel || "Rate"}: {rate}
        </div>
      )}
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function MonthlyRoadmap({ items }: { items: TimelineItem[] }) {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const groups = new Map<string, TimelineItem[]>();
  for (const it of items) {
    if (!groups.has(it.month)) groups.set(it.month, []);
    groups.get(it.month)!.push(it);
  }
  const earliestVisible = shiftMonth(nowMonth, -1);
  const months = Array.from(groups.keys())
    .filter((m) => m >= earliestVisible)
    .sort();

  if (months.length === 0) {
    return <div className="roadmap-empty">No upcoming pricing or billing actions in the data.</div>;
  }

  return (
    <div className="roadmap">
      {months.map((m) => {
        const isCurrent = m === nowMonth;
        const isPast = m < nowMonth;
        return (
          <div key={m} className={`roadmap-month ${isCurrent ? "current" : ""} ${isPast ? "past" : ""}`}>
            <div className="roadmap-month-header">
              <span className="roadmap-month-name">{isCurrent ? "▶ " : ""}{monthLabel(m)}</span>
              {isCurrent && <span className="roadmap-tag now">NOW</span>}
              {isPast && <span className="roadmap-tag overdue">OVERDUE</span>}
            </div>
            <div className="roadmap-items">
              {groups.get(m)!.map((it, i) => (
                <div key={i} className="roadmap-item">
                  <span
                    className="roadmap-item-badge"
                    style={{ background: it.color + "22", color: it.color, border: `1px solid ${it.color}44` }}
                  >
                    {it.eventTag}
                  </span>
                  <span className="roadmap-item-text">{it.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TicketRow({
  p,
  briefNote,
  briefNoteDate,
  editing,
  selling,
  onEdit,
  onSell,
  onSaveEdit,
  onSaveSell,
}: {
  p: Position;
  briefNote?: string;
  briefNoteDate?: string | null;
  editing: boolean;
  selling: boolean;
  onEdit: () => void;
  onSell: () => void;
  onSaveEdit: (updates: Partial<Position>) => void;
  onSaveSell: (payload: { soldPrice: number; platform: string; soldDate: string }) => void;
}) {
  const [platform, setPlatform] = useState(p.platform || "");
  const [ask, setAsk] = useState(p.ask?.toString() || "");
  const [targetAsk, setTargetAsk] = useState(p.targetAsk?.toString() || "");
  const [targetPlatform, setTargetPlatform] = useState(p.targetPlatform || "");
  const [notes, setNotes] = useState(p.notes || "");
  const [category, setCategory] = useState<Category>(p.category);

  const [soldPrice, setSoldPrice] = useState(p.targetAsk?.toString() || p.ask?.toString() || "");
  const [soldPlatform, setSoldPlatform] = useState(p.targetPlatform || p.platform || "StubHub");
  const [soldDate, setSoldDate] = useState(new Date().toISOString().slice(0, 10));

  const days = daysUntil(p.date);
  // proceeds = per-ticket payout after the platform's seller fee (the "true net").
  const proceedsPerTkt =
    p.status === "sold" && p.soldPayout != null
      ? p.soldPayout
      : p.ask != null
      ? netPayout(p.ask, p.platform)
      : null;
  const netInfo =
    proceedsPerTkt != null
      ? {
          proceeds: proceedsPerTkt, // net/tk after fees
          profitPerTkt: proceedsPerTkt - p.face,
          profitTotal: (proceedsPerTkt - p.face) * p.qty,
          roi: ((proceedsPerTkt - p.face) / p.face) * 100,
        }
      : null;

  return (
    <div className="ticket-row">
      <div className="ticket-main">
        <div className="ticket-event">
          {p.event}
          <span
            className="badge"
            style={{
              background: CATEGORY_COLOR[p.category] + "22",
              color: CATEGORY_COLOR[p.category],
              border: `1px solid ${CATEGORY_COLOR[p.category]}44`,
            }}
          >
            {p.category}
          </span>
        </div>
        <div className="ticket-meta">
          Sec {p.section} · Row {p.row} · Seats {p.seats} · {p.qty}x · {p.date}
        </div>
      </div>

      <span className="ticket-figure">Cost/tk: <strong>${p.face.toFixed(0)}</strong></span>
      {p.ask != null && <span className="ticket-figure">Ask/tk: <strong style={{ color: "#F0C040" }}>${p.ask}</strong></span>}
      {p.platform && (
        <span
          className="badge-platform"
          style={{
            background: (PLATFORM_COLOR[p.platform] || "#5a6478") + "22",
            color: PLATFORM_COLOR[p.platform] || "#5a6478",
            border: `1px solid ${(PLATFORM_COLOR[p.platform] || "#5a6478")}44`,
          }}
        >
          {p.platform}
        </span>
      )}
      {p.status === "listed" && p.askSetAt && (
        <span className="ticket-figure" title={`At $${p.ask} on ${p.platform} since ${p.askSetAt}`}>
          Listed: <strong>{daysSince(p.askSetAt)}d</strong>
        </span>
      )}
      {netInfo && (
        <>
          <span className="ticket-figure">Net/tk: <strong style={{ color: "#4ade80" }}>${netInfo.proceeds.toFixed(0)}</strong></span>
          <span className="ticket-figure">
            Profit/tk:{" "}
            <strong style={{ color: netInfo.profitPerTkt >= 0 ? "#4ade80" : "#f87171" }}>
              {netInfo.profitPerTkt >= 0 ? "+" : ""}${netInfo.profitPerTkt.toFixed(0)} ({netInfo.roi.toFixed(0)}%)
            </strong>
          </span>
          <span className="ticket-figure">
            Profit total:{" "}
            <strong style={{ color: netInfo.profitTotal >= 0 ? "#4ade80" : "#f87171" }}>
              {netInfo.profitTotal >= 0 ? "+" : ""}${netInfo.profitTotal.toFixed(0)}
            </strong>
          </span>
        </>
      )}
      {p.status !== "sold" && (
        <span className="ticket-urgency" style={{ color: urgencyColor(days) }}>{urgencyLabel(days)}</span>
      )}
      <span className="ticket-status">{p.status}</span>

      {p.status !== "sold" && (
        <div className="ticket-actions">
          <button className="btn-small" onClick={onEdit}>{editing ? "Cancel" : "Edit"}</button>
          <button className="btn-small btn-sell" onClick={onSell}>{selling ? "Cancel" : "Mark Sold"}</button>
        </div>
      )}

      {p.notes && <div className="ticket-notes">{p.notes}</div>}
      {briefNote && (
        <div className="ticket-brief-note" title={briefNoteDate ? `From the ${briefNoteDate} brief` : undefined}>
          📋 {briefNote}
        </div>
      )}

      {editing && (
        <div className="edit-form">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {(["SELL", "ATTEND", "CLIENT", "KEEP"] as Category[]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Listed on (platform)
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">— not listed —</option>
              {Object.keys(PLATFORM_FEES).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>Ask (current listing price)<input inputMode="decimal" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="e.g. 500" /></label>
          <NetPreview price={ask} platform={platform} face={p.face} qty={p.qty} />
          <label>Target Ask<input inputMode="decimal" value={targetAsk} onChange={(e) => setTargetAsk(e.target.value)} placeholder="optional" /></label>
          <label>
            Target Platform
            <select value={targetPlatform} onChange={(e) => setTargetPlatform(e.target.value)}>
              <option value="">— none —</option>
              {Object.keys(PLATFORM_FEES).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></label>
          <button
            className="btn-primary"
            onClick={() =>
              onSaveEdit({
                category,
                platform: platform || null,
                ask: ask ? Number(ask) : null,
                status: platform && ask ? "listed" : "held",
                targetAsk: targetAsk ? Number(targetAsk) : null,
                targetPlatform: targetPlatform || null,
                notes: notes || null,
              })
            }
          >
            Save
          </button>
        </div>
      )}

      {selling && (
        <div className="edit-form">
          <label>Sold Price<input value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} /></label>
          <label>
            Platform
            <select value={soldPlatform} onChange={(e) => setSoldPlatform(e.target.value)}>
              {Object.keys(PLATFORM_FEES).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>Sold Date<input type="date" value={soldDate} onChange={(e) => setSoldDate(e.target.value)} /></label>
          <NetPreview price={soldPrice} platform={soldPlatform} face={p.face} qty={p.qty} priceLabel="sold price" />
          <button
            className="btn-primary"
            onClick={() => onSaveSell({ soldPrice: Number(soldPrice), platform: soldPlatform, soldDate })}
          >
            Confirm Sold
          </button>
        </div>
      )}
    </div>
  );
}

// Live net-after-fees preview. Recomputes on every keystroke / platform change,
// so you see the true net before saving. proceeds = price × (1 − seller fee).
function NetPreview({
  price,
  platform,
  face,
  qty,
  priceLabel = "ask",
}: {
  price: string;
  platform: string;
  face: number;
  qty: number;
  priceLabel?: string;
}) {
  const priceN = Number(price);
  if (!price || isNaN(priceN) || priceN <= 0) {
    return <div className="net-preview net-preview-hint">Enter {priceLabel} + platform to see net after fees.</div>;
  }
  const fee = platform ? PLATFORM_FEES[platform]?.seller ?? 0 : 0;
  const proceeds = priceN * (1 - fee);
  const profit = proceeds - face;
  const roi = face ? (profit / face) * 100 : 0;
  return (
    <div className="net-preview">
      <span className="net-preview-main">Net ${proceeds.toFixed(2)}/tkt</span>
      <span className="net-preview-sub">
        after {platform ? `${(fee * 100).toFixed(0)}% ${platform} fee` : "no platform fee"} · profit{" "}
        <span style={{ color: profit >= 0 ? "#4ade80" : "#f87171" }}>
          {profit >= 0 ? "+" : ""}${profit.toFixed(2)}/tkt ({roi.toFixed(0)}% ROI)
        </span>
        {" · "}
        {qty}× = <strong>${(proceeds * qty).toFixed(2)}</strong> net
        {qty > 1 ? `, ${profit >= 0 ? "+" : ""}$${(profit * qty).toFixed(2)} profit` : ""}
      </span>
    </div>
  );
}

function SoldRow({ p }: { p: Position }) {
  const profit = p.soldPayout != null ? (p.soldPayout - p.face) * p.qty : 0;
  const roi = p.soldPayout != null ? ((p.soldPayout - p.face) / p.face) * 100 : 0;

  return (
    <div className="ticket-row">
      <div className="ticket-main">
        <div className="ticket-event">
          {p.event}
          <span
            className="badge"
            style={{
              background: CATEGORY_COLOR[p.category] + "22",
              color: CATEGORY_COLOR[p.category],
              border: `1px solid ${CATEGORY_COLOR[p.category]}44`,
            }}
          >
            {p.category}
          </span>
        </div>
        <div className="ticket-meta">
          Sec {p.section} · Row {p.row} · Seats {p.seats} · {p.qty}x · event {p.date} · sold {p.soldDate}
        </div>
      </div>

      <span className="ticket-figure">Cost: <strong>${p.face.toFixed(0)}</strong></span>
      <span className="ticket-figure">Sold: <strong style={{ color: "#F0C040" }}>${p.ask}</strong></span>
      {p.platform && (
        <span
          className="badge-platform"
          style={{
            background: (PLATFORM_COLOR[p.platform] || "#5a6478") + "22",
            color: PLATFORM_COLOR[p.platform] || "#5a6478",
            border: `1px solid ${(PLATFORM_COLOR[p.platform] || "#5a6478")}44`,
          }}
        >
          {p.platform}
        </span>
      )}
      <span className="ticket-figure">
        Net: <strong style={{ color: profit >= 0 ? "#4ade80" : "#f87171" }}>
          {profit >= 0 ? "+" : ""}${profit.toFixed(0)} ({roi.toFixed(0)}% ROI)
        </strong>
      </span>

      {p.notes && <div className="ticket-notes">{p.notes}</div>}
    </div>
  );
}

function BriefTab({ briefs }: { briefs: Brief[] }) {
  const [selected, setSelected] = useState(0);

  if (briefs.length === 0) {
    return (
      <div className="list-panel">
        <div className="roadmap-empty">
          No briefs yet. The scheduled agent writes one Mon + Thu (once the ANTHROPIC_API_KEY secret is set), or run it
          on demand from the repo&apos;s Actions tab.
        </div>
      </div>
    );
  }

  const brief = briefs[selected];

  return (
    <div>
      {briefs.length > 1 && (
        <div className="mini-form" style={{ marginBottom: 16 }}>
          <label>
            Brief date
            <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
              {briefs.map((b, i) => (
                <option key={b.date} value={i}>{b.date}{i === 0 ? " (latest)" : ""}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="brief-panel">
        <Markdown text={brief.content} />
      </div>
    </div>
  );
}

// Minimal, dependency-free markdown renderer for the brief format the agent
// produces: #/##/### headings, - / * list items, **bold**, and [text](url)
// links. Anything else renders as a plain paragraph. No raw HTML is ever
// injected — links are built as real <a> elements, so this is XSS-safe even
// though brief content is model-generated.
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Matches [text](url) or **bold**
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined && /^https?:\/\//.test(m[2])) {
      nodes.push(
        <a key={`${keyBase}-${i}`} href={m[2]} target="_blank" rel="noopener noreferrer">
          {m[1]}
        </a>
      );
    } else if (m[1] !== undefined) {
      // Non-http link target — render the visible text only, drop the URL.
      nodes.push(m[1]);
    } else {
      nodes.push(<strong key={`${keyBase}-${i}`}>{m[3]}</strong>);
    }
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: ReactNode[] | null = null;

  const flushList = (key: string) => {
    if (list) {
      out.push(<ul key={key} className="md-ul">{list}</ul>);
      list = null;
    }
  };

  lines.forEach((line, idx) => {
    const key = `l${idx}`;
    const listItem = line.match(/^\s*[-*]\s+(.*)$/);
    if (listItem) {
      if (!list) list = [];
      list.push(<li key={key}>{renderInline(listItem[1], key)}</li>);
      return;
    }
    flushList(`ul${idx}`);

    if (/^###\s+/.test(line)) out.push(<h4 key={key} className="md-h4">{renderInline(line.replace(/^###\s+/, ""), key)}</h4>);
    else if (/^##\s+/.test(line)) out.push(<h3 key={key} className="md-h3">{renderInline(line.replace(/^##\s+/, ""), key)}</h3>);
    else if (/^#\s+/.test(line)) out.push(<h2 key={key} className="md-h2">{renderInline(line.replace(/^#\s+/, ""), key)}</h2>);
    else if (line.trim() === "") out.push(<div key={key} className="md-gap" />);
    else out.push(<p key={key} className="md-p">{renderInline(line, key)}</p>);
  });
  flushList("ul-end");

  return <>{out}</>;
}
