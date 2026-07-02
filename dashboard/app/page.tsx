"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORM_FEES, netPayout } from "@/lib/fees";
import type { Position } from "@/lib/types";

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

type Tab = "overview" | "inventory" | "football" | "sold";

export default function DashboardPage() {
  const [inventory, setInventory] = useState<Position[] | null>(null);
  const [sold, setSold] = useState<Position[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sellingId, setSellingId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const router = useRouter();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/positions");
    const data = await res.json();
    setInventory(data.inventory || []);
    setSold(data.sold || []);
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
                <TicketRow key={p.id} p={p} {...editHandlers(p)} />
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
                footballPositions.map((p) => <TicketRow key={p.id} p={p} {...editHandlers(p)} />)
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
  editing,
  selling,
  onEdit,
  onSell,
  onSaveEdit,
  onSaveSell,
}: {
  p: Position;
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

  const [soldPrice, setSoldPrice] = useState(p.targetAsk?.toString() || p.ask?.toString() || "");
  const [soldPlatform, setSoldPlatform] = useState(p.targetPlatform || p.platform || "StubHub");
  const [soldDate, setSoldDate] = useState(new Date().toISOString().slice(0, 10));

  const days = daysUntil(p.date);
  const netInfo =
    p.status === "sold" && p.soldPayout != null
      ? { profit: (p.soldPayout - p.face) * p.qty, roi: ((p.soldPayout - p.face) / p.face) * 100 }
      : p.ask != null
      ? { profit: (netPayout(p.ask, p.platform) - p.face) * p.qty, roi: ((netPayout(p.ask, p.platform) - p.face) / p.face) * 100 }
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

      <span className="ticket-figure">Cost: <strong>${p.face.toFixed(0)}</strong></span>
      {p.ask != null && <span className="ticket-figure">Ask: <strong style={{ color: "#F0C040" }}>${p.ask}</strong></span>}
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
      {netInfo && (
        <span className="ticket-figure">
          Net: <strong style={{ color: netInfo.profit >= 0 ? "#4ade80" : "#f87171" }}>
            {netInfo.profit >= 0 ? "+" : ""}${netInfo.profit.toFixed(0)} ({netInfo.roi.toFixed(0)}% ROI)
          </strong>
        </span>
      )}
      {p.status !== "sold" && (
        <span className="ticket-urgency" style={{ color: urgencyColor(days) }}>{urgencyLabel(days)}</span>
      )}
      <span className="ticket-status">{p.status}</span>

      {p.category === "SELL" && p.status !== "sold" && (
        <div className="ticket-actions">
          <button className="btn-small" onClick={onEdit}>{editing ? "Cancel" : "Edit"}</button>
          <button className="btn-small btn-sell" onClick={onSell}>{selling ? "Cancel" : "Mark Sold"}</button>
        </div>
      )}

      {p.notes && <div className="ticket-notes">{p.notes}</div>}

      {editing && (
        <div className="edit-form">
          <label>Platform<input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="StubHub" /></label>
          <label>Ask<input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="500" /></label>
          <label>Target Ask<input value={targetAsk} onChange={(e) => setTargetAsk(e.target.value)} /></label>
          <label>Target Platform<input value={targetPlatform} onChange={(e) => setTargetPlatform(e.target.value)} /></label>
          <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></label>
          <button
            className="btn-primary"
            onClick={() =>
              onSaveEdit({
                platform: platform || null,
                ask: ask ? Number(ask) : null,
                status: platform && ask ? "listed" : p.status,
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
