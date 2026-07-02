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

export default function DashboardPage() {
  const [inventory, setInventory] = useState<Position[] | null>(null);
  const [sold, setSold] = useState<Position[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sellingId, setSellingId] = useState<number | null>(null);
  const [showSold, setShowSold] = useState(false);
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

  const groups = new Map<string, Position[]>();
  for (const p of inventory) {
    const key = `${p.event}|${p.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[1][0].date.localeCompare(b[1][0].date));

  return (
    <div className="page">
      <header className="header">
        <div className="brand">SoFi Ticket Desk</div>
        <button className="btn-ghost" onClick={logout}>Log out</button>
      </header>

      {error && <div className="banner-error">{error}</div>}

      <div className="stats">
        <StatCard label="For Sale" value={String(forSaleQty)} sub={`${activeSell.length} positions`} />
        <StatCard label="Capital In" value={`$${capitalIn.toLocaleString()}`} />
        <StatCard label="Personal Keep" value={String(keepQty)} accent="#60a5fa" />
        <StatCard
          label="Realized P&L"
          value={`$${realizedProfit.toFixed(0)}`}
          accent={realizedProfit >= 0 ? "#4ade80" : "#f87171"}
          sub={`${sold.length} sold`}
        />
        <StatCard label="Projected P&L" value={`$${projectedProfit.toFixed(0)}`} accent="#F0C040" sub="if targets hit" />
      </div>

      <div className="groups">
        {sortedGroups.map(([key, positions]) => {
          const [event, date] = key.split("|");
          const days = daysUntil(date);
          return (
            <div key={key} className="event-card">
              <div className="event-header">
                <div>
                  <div className="event-name">{event}</div>
                  <div className="event-meta">
                    {date} · {positions.reduce((s, p) => s + p.qty, 0)} tickets
                  </div>
                </div>
                <div className="urgency" style={{ color: urgencyColor(days) }}>
                  {urgencyLabel(days)}
                </div>
              </div>
              {positions.map((p) => (
                <PositionRow
                  key={p.id}
                  p={p}
                  editing={editingId === p.id}
                  selling={sellingId === p.id}
                  onEdit={() => setEditingId(editingId === p.id ? null : p.id)}
                  onSell={() => setSellingId(sellingId === p.id ? null : p.id)}
                  onSaveEdit={async (updates) => {
                    if (await patchPosition(p.id, { updates })) setEditingId(null);
                  }}
                  onSaveSell={async (payload) => {
                    if (await patchPosition(p.id, { action: "markSold", ...payload })) setSellingId(null);
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="sold-toggle" onClick={() => setShowSold(!showSold)}>
        {showSold ? "▾" : "▸"} Sold positions ({sold.length}) — ${realizedProfit.toFixed(0)} realized
      </div>
      {showSold && (
        <div className="sold-list">
          {sold.map((p) => {
            const profit = ((p.soldPayout ?? 0) - p.face) * p.qty;
            return (
              <div key={p.id} className="sold-row">
                <span>{p.event} — {p.date}</span>
                <span>Sec {p.section} Row {p.row} · {p.qty}x</span>
                <span>{p.platform} @ ${p.ask}</span>
                <span style={{ color: profit >= 0 ? "#4ade80" : "#f87171" }}>
                  {profit >= 0 ? "+" : ""}${profit.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: accent || "#F0C040" }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function PositionRow({
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

  return (
    <div className="position-row">
      <div className="position-main">
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
        <span className="position-loc">Sec {p.section} · Row {p.row} · Seats {p.seats} · {p.qty}x</span>
        <span className="position-cost">${p.face.toFixed(2)}/tkt</span>
        {p.platform && <span className="position-platform">{p.platform} @ ${p.ask}</span>}
        {p.targetAsk && <span className="position-target">target ${p.targetAsk} ({p.targetPlatform})</span>}
        <span className="position-status">{p.status}</span>
      </div>
      {p.notes && <div className="position-notes">{p.notes}</div>}
      {p.category === "SELL" && p.status !== "sold" && (
        <div className="position-actions">
          <button className="btn-small" onClick={onEdit}>{editing ? "Cancel" : "Edit"}</button>
          <button className="btn-small btn-sell" onClick={onSell}>{selling ? "Cancel" : "Mark Sold"}</button>
        </div>
      )}
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
