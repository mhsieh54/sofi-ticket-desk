import { useState, useRef, useEffect } from "react";

const PLATFORM_FEES = {
  StubHub: { seller: 0.15, buyer: 0.10, color: "#00D4AA" },
  "Vivid Seats": { seller: 0.10, buyer: 0.15, color: "#9B59B6" },
  SeatGeek: { seller: 0.10, buyer: 0.10, color: "#E74C3C" },
  Ticketmaster: { seller: 0.15, buyer: 0.22, color: "#006BE6" },
  TickPick: { seller: 0.15, buyer: 0.00, color: "#F97316" },
  Direct: { seller: 0.00, buyer: 0.00, color: "#4ade80" },
};

const TABS = ["Dashboard", "Inventory", "Platform Compare"];



function PlatformBadge({ name }) {
  const p = PLATFORM_FEES[name];
  if (!p) return null;
  return (
    <span style={{ background: p.color + "22", color: p.color, border: `1px solid ${p.color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1 }}>
      {name}
    </span>
  );
}

function StatCard({ label, value, sub, accent, irr }) {
  return (
    <div style={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 8, padding: "18px 20px", flex: 1, minWidth: 130 }}>
      <div style={{ color: "#5a6478", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontFamily: "monospace" }}>{label}</div>
      <div style={{ color: accent || "#F0C040", fontSize: 24, fontWeight: 800, fontFamily: "'DM Serif Display', Georgia, serif", lineHeight: 1 }}>{value}</div>
      {irr && <div style={{ color: accent || "#F0C040", fontSize: 13, fontWeight: 700, fontFamily: "monospace", marginTop: 6, opacity: 0.85 }}>IRR: {irr}</div>}
      {sub && <div style={{ color: "#5a6478", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function NetCalc({ face, ask }) {
  if (!face || !ask) return null;
  return (
    <div style={{ marginTop: 10, background: "#0d1117", borderRadius: 6, padding: "10px 14px", border: "1px solid #1e2530" }}>
      <div style={{ color: "#5a6478", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace" }}>Net Payout by Platform</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {Object.entries(PLATFORM_FEES).map(([name, p]) => {
          const net = parseFloat(ask) * (1 - p.seller);
          const profit = net - parseFloat(face);
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
              <PlatformBadge name={name} />
              <span style={{ color: "#cdd6f4", fontSize: 12, fontFamily: "monospace" }}>Net: <strong style={{ color: "#F0C040" }}>${net.toFixed(0)}</strong></span>
              <span style={{ color: profit >= 0 ? "#4ade80" : "#f87171", fontSize: 12, fontFamily: "monospace" }}>{profit >= 0 ? "+" : ""}${profit.toFixed(0)} ({((profit / parseFloat(face)) * 100).toFixed(0)}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const INITIAL_INVENTORY = [
  // YE — Apr 3, 2026 — Order #18-58776/WES — True cost $375/ticket — Purchased 3/10, sold ~4/2
  { id: 1,  event: "YE - Live in Los Angeles",       date: "2026-04-03", section: "212",  row: "7", seats: "11-12", qty: 2, face: 375.00,  platform: "Direct", ask: 509, sold: true, kept: false, alert: null, purchaseDate: "2026-03-10", soldDate: "2026-04-02" },
  { id: 2,  event: "YE - Live in Los Angeles",       date: "2026-04-03", section: "212",  row: "8", seats: "15-16", qty: 2, face: 375.00,  platform: "Direct", ask: 509, sold: true, kept: false, alert: null, purchaseDate: "2026-03-10", soldDate: "2026-04-02" },
  { id: 3,  event: "YE - Live in Los Angeles",       date: "2026-04-03", section: "213",  row: "5", seats: "5-6", qty: 2, face: 375.00,  platform: "TickPick", ask: 499, sold: true, kept: false, alert: null, purchaseDate: "2026-03-10", soldDate: "2026-04-02" },
  { id: 4,  event: "YE - Live in Los Angeles",       date: "2026-04-03", section: "213",  row: "6", seats: "5-6", qty: 2, face: 375.00,  platform: "TickPick", ask: 480, sold: true, kept: false, alert: null, purchaseDate: "2026-03-10", soldDate: "2026-04-02" },
  // Monster Jam — Apr 11, 2026 — Order #18-53759/WES — True cost $116.45/ticket
  { id: 5,  event: "Monster Jam",                    date: "2026-04-11", section: "C215", row: "6", seats: "1-4", qty: 4, face: 116.45,  platform: "Direct", ask: 116, sold: true, kept: false, purchaseDate: "2026-02-24", soldDate: "2026-04-11" },
  // Bruno Mars Sep 30 — Order #50-44764/WES — True cost $187.25/ticket
  { id: 6,  event: "Bruno Mars - The Romantic Tour", date: "2026-09-30", section: "234",  row: "7", seats: "—", qty: 2, face: 187.25,  platform: "", ask: 0, sold: false, kept: false, purchaseDate: "2026-03-10", targetAsk: 425, targetPlatform: "Vivid Seats", targetSellDate: "2026-08-31" },
  { id: 7,  event: "Bruno Mars - The Romantic Tour", date: "2026-09-30", section: "234",  row: "8", seats: "—", qty: 4, face: 187.25,  platform: "", ask: 0, sold: false, kept: true, purchaseDate: "2026-03-10" },
  // BTS — Sep 5, 2026 — Order #6-43104/WES — True cost $187.25/ticket
  { id: 8,  event: "BTS World Tour 'Arirang'",       date: "2026-09-05", section: "343",  row: "6", seats: "—", qty: 2, face: 187.25,  platform: "", ask: 0, sold: false, kept: false, purchaseDate: "2026-01-21", targetAsk: 675, targetPlatform: "Vivid Seats", targetSellDate: "2026-07-26" },
  { id: 9,  event: "BTS World Tour 'Arirang'",       date: "2026-09-05", section: "343",  row: "7", seats: "—", qty: 2, face: 187.25,  platform: "", ask: 0, sold: false, kept: false, purchaseDate: "2026-01-21", targetAsk: 675, targetPlatform: "StubHub", targetSellDate: "2026-07-26" },
  // Bruno Mars Oct 7 — Order #13-17572/WES — True cost $653.90/ticket (Floor FL-A5)
  { id: 10, event: "Bruno Mars - The Romantic Tour", date: "2026-10-07", section: "FL-A5",row: "6", seats: "—", qty: 6, face: 653.90,  platform: "", ask: 0, sold: false, kept: true, purchaseDate: "2026-01-15" },
  // R&B Tour — Sep 25, 2026 — Order #26-43198/WES — True cost $212.30/ticket ($169.50 face + $42.80 fee)
  { id: 11, event: "The R&B Tour - Usher & Chris Brown", date: "2026-09-25", section: "512", row: "4", seats: "9-12", qty: 4, face: 212.30, platform: "TickPick", ask: 239, sold: false, kept: false, alert: "below_cost", purchaseDate: "2026-04-21", targetAsk: 275, targetPlatform: "Vivid Seats", targetSellDate: "2026-08-26" },
  // R&B Tour — Sep 25, 2026 — Order #26-43483/WES — True cost $500.20/ticket ($399.50 face + $100.70 fee) — CLUB LEVEL
  { id: 12, event: "The R&B Tour - Usher & Chris Brown", date: "2026-09-25", section: "C134", row: "9", seats: "10-11", qty: 2, face: 500.20, platform: "TickPick", ask: 768, sold: false, kept: false, alert: null, purchaseDate: "2026-04-21", targetAsk: 625, targetPlatform: "Vivid Seats", targetSellDate: "2026-08-26" },
  // Karol G — Aug 15, 2026 (Saturday) — Order 1 — VIP220 — True cost $450.15/ticket
  { id: 14, event: "Karol G - Tropitour", date: "2026-08-15", section: "VIP220", row: "8", seats: "11-12", qty: 2, face: 450.15, platform: "", ask: 0, sold: false, kept: false, alert: null, purchaseDate: "2026-04-29", targetAsk: 650, targetPlatform: "Vivid Seats", targetSellDate: "2026-07-16" },
  // Karol G — Aug 15, 2026 (Saturday) — Order 2 — C249 Club — True cost $450.15/ticket
  { id: 15, event: "Karol G - Tropitour", date: "2026-08-15", section: "C249", row: "3", seats: "12-13", qty: 2, face: 450.15, platform: "", ask: 0, sold: false, kept: false, alert: null, purchaseDate: "2026-04-29", targetAsk: 800, targetPlatform: "StubHub", targetSellDate: "2026-07-16" },
  // Karol G — Aug 15, 2026 (Saturday) — Order 3 — FL-B6 Floor — True cost $512.75/ticket
  { id: 16, event: "Karol G - Tropitour", date: "2026-08-15", section: "FL-B6", row: "23", seats: "10-11", qty: 2, face: 512.75, platform: "", ask: 0, sold: false, kept: false, alert: null, purchaseDate: "2026-04-29", targetAsk: 850, targetPlatform: "Vivid Seats", targetSellDate: "2026-07-16" },
  // R&B Tour — Sep 26, 2026 — Order #28-16903/WES — True cost $500.20/ticket ($399.50 face + $100.70 fee) — Club 100 Level
  { id: 13, event: "The R&B Tour - Usher & Chris Brown", date: "2026-09-26", section: "C134", row: "12", seats: "7-10", qty: 4, face: 500.20, platform: "TickPick", ask: 901, sold: false, kept: false, alert: null , purchaseDate: "2026-04-21", targetAsk: 901, targetPlatform: "TickPick", targetSellDate: "2026-08-27" },
];

export default function TicketManager() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [inventory, setInventory] = useState(() => {
    try {
      const ver = localStorage.getItem("sofi_inv_version");
      const saved = localStorage.getItem("sofi_inventory");
      if (ver === "v24" && saved) return JSON.parse(saved);
    } catch(e) {}
    localStorage.setItem("sofi_inv_version", "v24");
    return INITIAL_INVENTORY;
  });
  const [calcFace, setCalcFace] = useState("");
  const DEFAULT_NOTES = [
    { id: 1, event: "YE - Live in Los Angeles", date: "2026-04-03", ts: "Apr 3", note: "✅ FULLY CLOSED — ALL 4 PAIRS SOLD\n\nFINAL RESULTS:\nSec 212 Row 7 Seats 11-12 → Direct sale to Rove @ $509 | No fee | +$268\nSec 212 Row 8 Seats 15-16 → Direct sale to Rove @ $509 | No fee | +$268\nSec 213 Row 5 Seats 5-6 → TickPick @ $499 | Payout $848.30 | +$98.30\nSec 213 Row 6 Seats 5-6 → TickPick @ $480 | Payout $816.00 | +$66.00\n\nTOTAL PAYOUT: $4,700.30 | COST: $3,000 | PROFIT: +$700.30 | ROI: 23%" },
    { id: 2, event: "Monster Jam", date: "2026-04-11", ts: "Apr 11", note: "✅ CLOSED — Sold at break even via direct sale.\n\nSec C215 Row 6 Seats 1-4 → Direct @ $116.45/ticket | $0 profit." },
    { id: 3, event: "Bruno Mars - The Romantic Tour", date: "2026-09-30", ts: "May 4", note: "🔥 MAJOR UPWARD REVISION — Bruno Mars more bullish than expected.\n\nMARKET UPDATE (May 4):\nTour broke Live Nation single-day record: 2.1M tickets in 24 hrs. Tour-wide median asking price $922. SoFi median $500-$600 (cheapest among major markets like Vegas/Detroit). Range $377-$2,458 across listings. 31 dates added due to overwhelming demand.\n\nSep 30 Wed is 5th of 5 LA dates (Sep 30, Oct 2, 3, 6, 7) — still weakest night but premium demand has lifted floor for ALL nights significantly.\n\nHoldings:\nSec 234 Row 7 (qty 2) — FOR SALE | Cost $187.25/ea | Invested $374.50\nSec 234 Row 8 (qty 4) — PERSONAL KEEP\n\nREVISED TARGET: $425/ticket on Vivid Seats\n→ Net $382.50/ea | +$195.25/ticket | +$390.50 total | ~104% ROI\n(Previously targeted $265 → +$103. Updating based on confirmed SoFi $500+ median.)\n\nPlaybook:\n• Now–July: Hold\n• Early Aug (60 days out): Pull fresh Sec 234 comps\n• Late Aug (30 days out): List Row 7 at $425/ea on Vivid Seats\n• Mid-Sept (14 days out): Hold or +5% if strong\n• 7 days out: Cut 5-10% if stale\n• Wed nights still weakest — be ready to flex" },
    { id: 4, event: "BTS World Tour \'Arirang\'", date: "2026-09-05", ts: "May 4", note: "🔥 BEST FLIP IN PORTFOLIO — RESALE CONFIRMED ELITE.\n\nMARKET UPDATE (May 4):\nAll 4 SoFi dates SOLD OUT instantly Jan 24 general sale. Resale ceiling now $3,000 confirmed. StubHub get-in $167. ARMY paying $1,700 for premium. Goyang opener tickets hit $7K resale (40x face value!). Tour active since April 9 — fan reviews glowing.\n\nLA dates have MORE inventory than single-night markets (Arlington $354 floor, Chicago $259 floor). Sep 5 Saturday strongest of 4 LA nights.\n\nSec 343 Row 6 (qty 2) — FOR SALE | Cost $187.25/ea\nSec 343 Row 7 (qty 2) — FOR SALE | Cost $187.25/ea\nTotal invested: $749\n\nREVISED TARGET: $675/ticket → Net $607.50/ea | +$420/ticket | +$1,680 total | ROI 224%\n(Up from $625. Resale data supports higher ceiling.)\n\nREVISED PLAYBOOK:\n• Now–July: HOLD HARD, do not list\n• Late July (40 days out): List Row 6 on Vivid @ $625 + Row 7 on StubHub @ $625\n• Mid-Aug (21 days out): Raise to $700-750 if demand strong\n• Late Aug (14 days out): Drop 5% only if stale\n• 7 days out: Hold — ARMY buys to showtime\n\n⚠ ABSOLUTE CEILING: $750. ARMY boycotts above this." },
    { id: 5, event: "The R&B Tour - Usher & Chris Brown", date: "2026-09-25", ts: "May 4", note: "⬇️ DOWNGRADED TARGETS — Soft demand confirmed.\n\nMARKET UPDATE (May 4):\nStubHub get-in $121 (down from $210 in late April). Vivid avg Chris Brown ticket only $253. 3 SoFi dates total (Sep 25, Sep 26, Nov 15) creating supply pressure. Tour starts June 26 Denver — wait for early date data.\n\nPOSITION 1: Sec 512 Row 4 Seats 9-12 (Upper Deck)\nQty: 4 | Cost: $212.30/ea | Invested: $849.20\nREVISED TARGET: $275/ea on Vivid Seats (was $310)\n→ Net $247.50 | +$35/ticket | +$140 total | ~17% ROI\n\nPOSITION 2: Sec C134 Row 9 Seats 10-11 (Club Level)\nQty: 2 | Cost: $500.20/ea | Invested: $1,000.40\nREVISED TARGET: $625/ea on Vivid Seats (was $700)\n→ Net $562.50 | +$62/ticket | +$125 total | ~12% ROI\n\nCOMBINED Sep 25 target: +$265 (down from +$528)\n\nThis is the laggard. Consider direct-sell options if margins compress further. Don\'t wait until 7 days out.\n\nPlaybook:\n• Now: Hold, monitor early tour reviews\n• Late June: Pull comps from Denver opener\n• Early July: Reassess vs Nov 15 listings\n• Mid-July: Begin watching for direct buyer opportunities\n• Early Aug: List proactively if market hasn\'t recovered\n• 14 days out: Cut aggressively if stale\n\n⚠ Risk: Chris Brown controversy + 3 dates + lukewarm pre-tour signals" },
    { id: 6, event: "The R&B Tour - Usher & Chris Brown", date: "2026-09-26", ts: "May 4", note: "⬇️ DOWNGRADED — Saturday Club still best R&B position but soft.\n\nMARKET UPDATE (May 4):\nSame R&B Tour pressure: 3 LA dates, soft pre-tour demand. Saturday still commands premium over Friday/Sunday. Club level limited supply protects pricing somewhat.\n\nSec C134 Row 12 Seats 7-10 (Club Level)\nQty: 4 | Cost: $500.20/ea | Invested: $2,000.80\n\nREVISED TARGET: $675/ea (was $750)\n→ Net Vivid $607.50 | Net StubHub $573.75 | Avg $590\n→ +$90/ticket avg | +$359 total | ~18% ROI\n\nThis is the largest single position by capital. Watch Denver/early dates closely.\n\nPlaybook:\n• Now–June: Hold, monitor\n• Late June: Pull C134 comps from Denver opener\n• Mid-July: Reassess — consider listing earlier if market firms\n• Late Aug (30 days out): List 2 on Vivid @ $675 + 2 on StubHub @ $675\n• Mid-Sept (14 days out): Cut 5% if stale\n• 7 days out: Hold firm — Sat Club buyers pay to showtime\n\n⚠ Largest capital exposure. Consider direct sale options if available." },
    { id: 7, event: "Karol G - Tropitour", date: "2026-08-15", ts: "May 4", note: "📊 EARLY DATA — Tour hasn\'t started yet. Hold for clarity.\n\nMARKET UPDATE (May 4):\nGen sale was Apr 29. SoFi get-in $254 across all 3 dates (Aug 14/15/16). First Latina Coachella headliner 2026. Tour kicks off July 24 Chicago — Denver-style early signal won\'t come until late July.\n\nTour is 40+ dates with European/Latam legs through 2027. US-only legs run July-October. Lots of inventory tour-wide.\n\nPOSITION 1: Sec VIP220 Row 8 Seats 11-12\nQty: 2 | Cost: $450.15/ea | Invested: $900.30\nTarget: $650 on Vivid Seats → Net $585 | +$135/ea | +$270 | ~30% ROI\n\nPOSITION 2: Sec C249 Row 3 Seats 12-13 (Club Level)\nQty: 2 | Cost: $450.15/ea | Invested: $900.30\nTarget: $800 on StubHub → Net $680 | +$230/ea | +$460 | ~51% ROI\n\nPOSITION 3: Sec FL-B6 Row 23 Seats 10-11 (Floor — back row)\nQty: 2 | Cost: $512.75/ea | Invested: $1,025.50\nREVISED TARGET: $850 on Vivid (was $900) → Net $765 | +$252/ea | +$504 | ~49% ROI\n\nCOMBINED: $2,826.10 invested | Target +$1,234 | Blended ROI ~44%\n\nPlaybook:\n• Now–late July: HOLD — wait for tour opener data\n• Late July (post-Chicago): Pull comps from Vegas (Aug 7) and Chicago (Jul 24)\n• Early Aug: Reassess all 3 targets\n• Mid-Aug (1-2 weeks out): List all 3 pairs\n  VIP220 → Vivid @ $650\n  C249 → StubHub @ $800\n  FL-B6 → Vivid @ $850\n• Day before: Aggressive on VIP if unsold\n\n⚠ 3 LA dates = supply pressure. Watch Aug 21 SF date for nearby market signal." },
  ];
  const [compNotes, setCompNotes] = useState(() => {
    try {
      const saved = localStorage.getItem("sofi_notes");
      if (saved) {
        const parsed = JSON.parse(saved);
        // If saved data is stale (only 1 old note), use fresh defaults
        if (parsed.length < 8) return DEFAULT_NOTES;
        return parsed;
      }
    } catch(e) {}
    return DEFAULT_NOTES;
  });
  const [calcAsk, setCalcAsk] = useState("");

  const active = inventory.filter(t => !t.sold && !t.kept);
  const sold = inventory.filter(t => t.sold);
  const kept = inventory.filter(t => t.kept);
  const totalInvested = active.reduce((s, t) => s + t.face * t.qty, 0);
  const totalAsk = active.reduce((s, t) => s + (t.ask || 0) * t.qty, 0);
  const totalProfit = sold.reduce((s, t) => s + ((t.ask * (1 - (PLATFORM_FEES[t.platform]?.seller ?? 0.12))) - t.face) * t.qty, 0);

  // Calculate annualized IRR for a single position
  function calcIRR(cost, payout, days) {
    if (!cost || !days || days <= 0 || payout <= 0) return 0;
    const ratio = payout / cost;
    if (ratio <= 0) return 0;
    return Math.pow(ratio, 365 / days) - 1;
  }

  // Cost-weighted blended IRR for sold positions (realized)
  const realizedIRR = (() => {
    let totalCostWeight = 0;
    let weightedIRR = 0;
    sold.forEach(t => {
      if (!t.purchaseDate || !t.soldDate) return;
      const cost = t.face * t.qty;
      const fee = PLATFORM_FEES[t.platform]?.seller ?? 0.12;
      const payout = t.ask * (1 - fee) * t.qty;
      const days = Math.max(1, (new Date(t.soldDate) - new Date(t.purchaseDate)) / 86400000);
      const irr = calcIRR(cost, payout, days);
      weightedIRR += irr * cost;
      totalCostWeight += cost;
    });
    return totalCostWeight > 0 ? weightedIRR / totalCostWeight : 0;
  })();

  // Projected P&L for active (unsold, not kept) positions
  const projectedProfit = active.reduce((s, t) => {
    if (!t.targetAsk) return s;
    const fee = PLATFORM_FEES[t.targetPlatform]?.seller ?? 0.12;
    const net = t.targetAsk * (1 - fee);
    return s + (net - t.face) * t.qty;
  }, 0);

  // Cost-weighted projected IRR for active positions
  const projectedIRR = (() => {
    let totalCostWeight = 0;
    let weightedIRR = 0;
    active.forEach(t => {
      if (!t.targetAsk || !t.purchaseDate || !t.targetSellDate) return;
      const cost = t.face * t.qty;
      const fee = PLATFORM_FEES[t.targetPlatform]?.seller ?? 0.12;
      const payout = t.targetAsk * (1 - fee) * t.qty;
      const days = Math.max(1, (new Date(t.targetSellDate) - new Date(t.purchaseDate)) / 86400000);
      const irr = calcIRR(cost, payout, days);
      weightedIRR += irr * cost;
      totalCostWeight += cost;
    });
    return totalCostWeight > 0 ? weightedIRR / totalCostWeight : 0;
  })();

  // Format IRR as percentage consistently
  function fmtIRR(irr) {
    if (!irr || !isFinite(irr)) return "—";
    const pct = irr * 100;
    return `${pct.toLocaleString("en-US", { maximumFractionDigits: 0 })}%`;
  }

  // Group active tickets by event for dashboard summary
  const eventGroups = active.reduce((acc, t) => {
    const key = `${t.event}|${t.date}`;
    if (!acc[key]) acc[key] = { event: t.event, date: t.date, qty: 0, invested: 0, items: [] };
    acc[key].qty += t.qty;
    acc[key].invested += t.face * t.qty;
    acc[key].items.push(t);
    return acc;
  }, {});

  // Auto-save to localStorage on every inventory/notes change
  useEffect(() => {
    try { localStorage.setItem("sofi_inventory", JSON.stringify(inventory)); } catch(e) {}
  }, [inventory]);

  useEffect(() => {
    try { localStorage.setItem("sofi_notes", JSON.stringify(compNotes)); } catch(e) {}
  }, [compNotes]);


  const inputStyle = { background: "#0d1117", border: "1px solid #1e2530", borderRadius: 6, color: "#cdd6f4", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "monospace", width: "100%", boxSizing: "border-box" };
  const btnPrimary = { background: "#F0C040", color: "#0d1117", border: "none", borderRadius: 6, padding: "10px 20px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" };
  const btnGhost = { ...btnPrimary, background: "#1e2530", color: "#cdd6f4" };
  const lbl = { color: "#5a6478", fontSize: 10, marginBottom: 4, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", display: "block" };

  function urgencyColor(daysOut) {
    if (daysOut < 7) return "#f87171";
    if (daysOut < 14) return "#F0C040";
    if (daysOut < 30) return "#60a5fa";
    return "#4ade80";
  }
  function urgencyLabel(daysOut) {
    if (daysOut < 0) return "PAST";
    if (daysOut < 7) return `${daysOut}d ⚠ URGENT`;
    if (daysOut < 14) return `${daysOut}d — list now`;
    if (daysOut < 30) return `${daysOut}d — prime window`;
    return `${daysOut}d — hold/list high`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0d12", color: "#cdd6f4", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e2530", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d1117", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, #F0C040, #e08000)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: "#0a0d12" }}>S</div>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: "#F0C040", lineHeight: 1 }}>SoFi Ticket Desk</div>
            <div style={{ fontSize: 10, color: "#5a6478", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>Daily Manager · Mark</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#5a6478", fontFamily: "monospace" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e2530", background: "#0d1117", paddingLeft: 24, overflowX: "auto" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", borderBottom: activeTab === tab ? "2px solid #F0C040" : "2px solid transparent", color: activeTab === tab ? "#F0C040" : "#5a6478", padding: "11px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace", whiteSpace: "nowrap" }}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 980, margin: "0 auto" }}>

        {/* ── DASHBOARD ── */}
        {activeTab === "Dashboard" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#F0C040", marginBottom: 3 }}>Good morning, Mark.</div>
              <div style={{ color: "#5a6478", fontSize: 13 }}>{inventory.filter(t => !t.sold && !t.kept).reduce((s,t) => s+t.qty, 0)} tickets active · ${totalInvested.toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})} invested · ${totalProfit.toFixed(0)} realized P&L</div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              <StatCard label="For Sale" value={active.reduce((s, t) => s + t.qty, 0)} sub={`${Object.keys(eventGroups).length} events`} />
              <StatCard label="Capital In" value={`$${totalInvested.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} sub="resale inventory" />
              <StatCard label="Personal Keep" value={kept.reduce((s, t) => s + t.qty, 0)} sub={`${kept.length} sets aside`} accent="#60a5fa" />
              <StatCard label="Realized P&L" value={`$${totalProfit.toFixed(0)}`} irr={fmtIRR(realizedIRR)} sub={`${sold.length} sold`} accent={totalProfit >= 0 ? "#4ade80" : "#f87171"} />
              <StatCard label="Projected P&L" value={`$${projectedProfit.toFixed(0)}`} irr={fmtIRR(projectedIRR)} sub="if all sell at target" accent="#F0C040" />
            </div>


            {/* Monthly Roadmap */}
            {(() => {
              const now = new Date();
              const ROADMAP = [
                {
                  month: "April 2026",
                  dateKey: "2026-04",
                  actions: [
                    { event: "R&B Tour Sep 25", action: "Apr 27 — Pull primary sale prices for upper deck (500-level) AND club level (C134). Sets ceiling for all 3 positions.", urgency: "high" },
                    { event: "R&B Tour Sep 26", action: "Apr 27 — Check Club C134 primary price. Saturday premium vs Friday — expect $50–100 higher.", urgency: "high" },
                  ]
                },
                {
                  month: "May 2026",
                  dateKey: "2026-05",
                  actions: [
                    { event: "R&B Tour Sep 25", action: "Check resale floor — calibrate $335 (upper deck) and $750 (Club C134) targets.", urgency: "low" },
                    { event: "R&B Tour Sep 26", action: "Check Club C134 Sep 26 resale floor. Adjust $800 target based on market.", urgency: "low" },
                  ]
                },
                {
                  month: "June 2026",
                  dateKey: "2026-06",
                  actions: [
                    { event: "R&B Tour Sep 25", action: "Tour starts Jun 26 (Denver). Pull 500-level AND club-level comps from early dates to validate targets.", urgency: "medium" },
                    { event: "R&B Tour Sep 26", action: "Pull C134 club comps from Denver/Detroit. Saturday shows command ~10–15% premium over Friday.", urgency: "medium" },
                  ]
                },
                {
                  month: "July 2026",
                  dateKey: "2026-07",
                  actions: [
                    { event: "Karol G Aug 15", action: "Early July (45 days out) — Pull section comps for VIP220, C249, FL-B6. Confirm $650/$800/$950 targets.", urgency: "high" },
                    { event: "Karol G Aug 15", action: "Mid-July (30 days out) — List all 3 pairs: VIP220 on Vivid @ $650 | C249 on StubHub @ $800 | FL-B6 on Vivid @ $950.", urgency: "high" },
                    { event: "BTS Sep 5", action: "Late July (40 days out) — List Sec 343 Row 6 + Row 7 at $550/ticket on Vivid Seats. One platform per pair.", urgency: "high" },
                  ]
                },
                {
                  month: "August 2026",
                  dateKey: "2026-08",
                  actions: [
                    { event: "BTS Sep 5", action: "Mid-Aug (21 days out) — Raise to $600/ticket if demand strong. Drop 5% only if stale at 14 days.", urgency: "high" },
                    { event: "Karol G Aug 15", action: "Late July (14 days out) — Cut 5% if stale. Hold Club + Floor firm. Drop VIP220 if needed to move.", urgency: "high" },
                    { event: "Bruno Mars Sep 30", action: "Early Aug (60 days out) — Pull fresh Sec 234 comps vs. Oct dates. Confirm $265 target.", urgency: "medium" },
                    { event: "R&B Tour Sep 25", action: "Late Aug — List Sec 512 (2 Vivid @ $335 + 2 StubHub @ $335). List C134 Club (2 Vivid @ $750).", urgency: "high" },
                    { event: "R&B Tour Sep 26", action: "Late Aug — List C134 Club Sep 26 (2 Vivid @ $800 + 2 StubHub @ $800). Saturday premium hold.", urgency: "high" },
                    { event: "Bruno Mars Sep 30", action: "Late Aug (30 days out) — List Sec 234 Row 7 (qty 2) at $265/ticket on Vivid Seats.", urgency: "high" },
                  ]
                },
                {
                  month: "September 2026",
                  dateKey: "2026-09",
                  actions: [
                    { event: "R&B Tour Sep 25", action: "14 days out — Cut 5% if stale. Sep 25 buyers may carryover to Sep 26 demand.", urgency: "medium" },
                    { event: "R&B Tour Sep 26", action: "14 days out — Hold Club level firm. Saturday buyers pay up last minute. Cut 5% only if zero views.", urgency: "medium" },
                    { event: "BTS Sep 5", action: "7 days out — Hold firm. ARMY buys up to showtime. Do NOT exceed $700 (boycott risk).", urgency: "medium" },
                    { event: "Bruno Mars Sep 30", action: "14 days out — Cut 5-10% if stale. 7 days out → aggressive if still holding.", urgency: "medium" },
                  ]
                },
              ];

              const urgencyStyle = (u) => ({
                high: { color: "#f87171", bg: "#f8717112", border: "#f8717130" },
                medium: { color: "#F0C040", bg: "#F0C04012", border: "#F0C04030" },
                low: { color: "#4ade80", bg: "#4ade8012", border: "#4ade8030" },
              }[u]);

              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: "#5a6478", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 12 }}>📅 Monthly Action Roadmap</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ROADMAP.map(({ month, dateKey, actions }) => {
                      const isCurrentMonth = now.toISOString().startsWith(dateKey);
                      const isPast = dateKey < now.toISOString().slice(0, 7);
                      return (
                        <div key={month} style={{ background: isCurrentMonth ? "#111e14" : "#111418", border: `1px solid ${isCurrentMonth ? "#4ade8040" : "#1e2530"}`, borderRadius: 10, overflow: "hidden", opacity: isPast ? 0.45 : 1 }}>
                          <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1a1f2a" }}>
                            <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: isCurrentMonth ? "#4ade80" : "#5a6478", letterSpacing: 1 }}>
                              {isCurrentMonth ? "▶ " : ""}{month.toUpperCase()}
                            </div>
                            {isCurrentMonth && <span style={{ background: "#4ade8022", color: "#4ade80", border: "1px solid #4ade8044", borderRadius: 4, fontSize: 9, fontFamily: "monospace", padding: "1px 6px", fontWeight: 700 }}>NOW</span>}
                            {isPast && <span style={{ color: "#2e3545", fontSize: 9, fontFamily: "monospace" }}>COMPLETED</span>}
                          </div>
                          <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
                            {actions.map((a, i) => {
                              const s = urgencyStyle(a.urgency);
                              return (
                                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                  <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 4, fontSize: 9, fontFamily: "monospace", fontWeight: 700, padding: "2px 6px", whiteSpace: "nowrap", marginTop: 1 }}>{a.event}</span>
                                  <span style={{ color: "#a8b3cf", fontSize: 12, lineHeight: 1.5 }}>{a.action}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Event Cards with Embedded Research Notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              {Object.values(eventGroups).sort((a, b) => new Date(a.date) - new Date(b.date)).map(group => {
                const daysOut = Math.ceil((new Date(group.date) - new Date()) / 86400000);
                const sections = [...new Set(group.items.map(t => t.section))].join(", ");
                const note = compNotes.find(n => n.event === group.event && n.date === group.date);
                return (
                  <div key={group.event + group.date} style={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 10, overflow: "hidden" }}>
                    {/* Event Header */}
                    <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                          <div style={{ color: "#cdd6f4", fontWeight: 700, fontSize: 14 }}>{group.event}</div>
                          <div style={{ color: urgencyColor(daysOut), fontFamily: "monospace", fontSize: 10, fontWeight: 700 }}>{urgencyLabel(daysOut)}</div>
                        </div>
                        <div style={{ color: "#5a6478", fontSize: 11, fontFamily: "monospace" }}>
                          {group.date} · Sec {sections} · {group.qty} tickets · <span style={{ color: "#F0C040", fontWeight: 700 }}>${group.invested.toFixed(0)} in</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {!note && (
                          <button onClick={() => setCompNotes(p => [...p, { id: Date.now(), event: group.event, date: group.date, note: "", ts: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) }])}
                            style={{ background: "#1e2530", color: "#5a6478", border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>
                            + Add Strategy Note
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Strategy Note */}
                    {note && (
                      <div style={{ borderTop: "1px solid #1a1f2a", background: "#0d1117", padding: "12px 18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ color: "#5a6478", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>📋 Strategy · Updated {note.ts}</div>
                          <button onClick={() => setCompNotes(p => p.filter(x => x.id !== note.id))}
                            style={{ background: "none", border: "none", color: "#f87171", fontSize: 11, cursor: "pointer", padding: 0 }}>✕</button>
                        </div>
                        <textarea
                          value={note.note}
                          onChange={e => {
                            setCompNotes(p => p.map(x => x.id === note.id ? { ...x, note: e.target.value } : x));
                            e.target.style.height = "auto";
                            e.target.style.height = e.target.scrollHeight + "px";
                          }}
                          ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                          placeholder="Paste strategy from chat here..."
                          style={{ background: "transparent", border: "none", color: "#a8b3cf", fontSize: 12, fontFamily: "monospace", outline: "none", width: "100%", resize: "none", lineHeight: 1.7, minHeight: 0, overflow: "hidden", display: "block" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Orphan notes (events not in active inventory) */}
              {compNotes.filter(n => !Object.values(eventGroups).some(g => g.event === n.event && g.date === n.date)).map(n => (
                <div key={n.id} style={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <input value={n.event} onChange={e => setCompNotes(p => p.map(x => x.id === n.id ? { ...x, event: e.target.value } : x))} placeholder="Event name" style={{ background: "transparent", border: "none", color: "#F0C040", fontWeight: 700, fontSize: 13, fontFamily: "monospace", outline: "none" }} />
                      <div style={{ color: "#5a6478", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>{n.date} · Standalone note</div>
                    </div>
                    <button onClick={() => setCompNotes(p => p.filter(x => x.id !== n.id))} style={{ background: "none", border: "none", color: "#f87171", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                  <div style={{ borderTop: "1px solid #1a1f2a", background: "#0d1117", padding: "12px 18px" }}>
                    <textarea value={n.note} onChange={e => { setCompNotes(p => p.map(x => x.id === n.id ? { ...x, note: e.target.value } : x)); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }} ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }} placeholder="Notes..." style={{ background: "transparent", border: "none", color: "#a8b3cf", fontSize: 12, fontFamily: "monospace", outline: "none", width: "100%", resize: "none", lineHeight: 1.7, minHeight: 0, overflow: "hidden", display: "block" }} />
                  </div>
                </div>
              ))}
              <button onClick={() => setCompNotes(p => [...p, { id: Date.now(), event: "", date: "", note: "", ts: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) }])}
                style={{ background: "#111418", border: "1px dashed #1e2530", borderRadius: 10, padding: "10px", color: "#5a6478", fontSize: 11, cursor: "pointer", fontFamily: "monospace", textAlign: "center" }}>
                + Add Standalone Note
              </button>
            </div>
          </div>
        )}

        {/* ── INVENTORY ── */}
        {activeTab === "Inventory" && (
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#F0C040", marginBottom: 6 }}>Inventory</div>
            <div style={{ color: "#5a6478", fontSize: 13, marginBottom: 18 }}>All holdings. Face = true cost including all Ticketmaster fees.</div>

            {/* Upload notice */}
            <div style={{ background: "#111418", border: "1px dashed #1e2530", borderRadius: 10, padding: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 22 }}>📎</div>
              <div>
                <div style={{ color: "#5a6478", fontSize: 11, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>To Add New Tickets</div>
                <div style={{ color: "#5a6478", fontSize: 12, lineHeight: 1.6 }}>Upload your Ticketmaster order confirmation PDF in chat — I'll parse it and update your inventory automatically.</div>
              </div>
            </div>

            {/* Inventory Table */}
            <div style={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 10, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ color: "#5a6478", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>All Tickets ({inventory.length})</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#5a6478" }}>
                  For Sale: <span style={{ color: "#4ade80" }}>{active.reduce((s,t)=>s+t.qty,0)}</span> · Keep: <span style={{ color: "#60a5fa" }}>{kept.reduce((s,t)=>s+t.qty,0)}</span> · Sold: <span style={{ color: "#5a6478" }}>{sold.reduce((s,t)=>s+t.qty,0)}</span>
                </span>
              </div>
              {[...inventory].sort((a, b) => {
                const now = new Date();
                const aDate = new Date(a.date);
                const bDate = new Date(b.date);
                const aPast = aDate < now;
                const bPast = bDate < now;
                if (aPast && !bPast) return 1;
                if (!aPast && bPast) return -1;
                return aDate - bDate;
              }).map(t => {
                const fee = PLATFORM_FEES[t.platform]?.seller ?? 0;
                const profit = (t.ask * (1 - fee) - t.face) * t.qty;
                const daysOut = Math.ceil((new Date(t.date) - new Date()) / 86400000);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 10px", borderBottom: "1px solid #1a1f2a", opacity: t.sold ? 0.4 : 1, flexWrap: "wrap", background: t.alert === "hidden" || t.alert === "not_competitive" ? "#f8717108" : "transparent", borderLeft: t.alert === "hidden" ? "3px solid #f87171" : t.alert === "not_competitive" ? "3px solid #fb923c" : t.alert === "upload_needed" ? "3px solid #f59e0b" : "3px solid transparent", marginLeft: -10 }}>
                    <div style={{ flex: 2, minWidth: 170 }}>
                      <div style={{ color: "#cdd6f4", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                        {t.event}
                        {t.sold && <span style={{ color: "#4ade80", fontSize: 10, marginLeft: 6 }}>[SOLD]</span>}
                        {t.kept && <span style={{ color: "#60a5fa", fontSize: 10, marginLeft: 6 }}>[PERSONAL]</span>}
                        {t.alert === "hidden" && <span style={{ background: "#f8717122", color: "#f87171", border: "1px solid #f8717144", borderRadius: 4, fontSize: 9, fontFamily: "monospace", fontWeight: 700, padding: "1px 6px", marginLeft: 6, letterSpacing: 1, whiteSpace: "nowrap", display: "inline-block" }}>⚠ LIKELY HIDDEN</span>}
                        {t.alert === "not_competitive" && <span style={{ background: "#fb923c22", color: "#fb923c", border: "1px solid #fb923c44", borderRadius: 4, fontSize: 9, fontFamily: "monospace", fontWeight: 700, padding: "1px 6px", marginLeft: 6, letterSpacing: 1, whiteSpace: "nowrap", display: "inline-block" }}>⚠ NOT COMPETITIVE</span>}
                        {t.alert === "upload_needed" && <span style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", borderRadius: 4, fontSize: 9, fontFamily: "monospace", fontWeight: 700, padding: "1px 6px", marginLeft: 6, letterSpacing: 1, whiteSpace: "nowrap", display: "inline-block" }}>⚠ UPLOAD TICKETS</span>}
                      </div>
                      <div style={{ color: "#5a6478", fontSize: 11, fontFamily: "monospace" }}>Sec {t.section} · Row {t.row}{t.seats ? ` · Seats ${t.seats}` : ""} · {t.qty}x · {t.date}</div>
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#5a6478" }}>Cost: <span style={{ color: "#cdd6f4" }}>${t.face.toFixed(0)}</span></span>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: t.alert ? "#f87171" : "#5a6478" }}>Ask: <span style={{ color: t.alert === "hidden" ? "#f87171" : t.alert === "not_competitive" ? "#fb923c" : "#F0C040", fontWeight: t.alert ? 800 : 400 }}>{t.ask > 0 ? `$${t.ask}` : "—"}</span></span>
                    {t.platform && <PlatformBadge name={t.platform} />}
                    {t.ask > 0 && !t.kept && (() => {
                      const netPayout = t.ask * (1 - (PLATFORM_FEES[t.platform]?.seller ?? 0));
                      const profitPerTicket = netPayout - t.face;
                      const totalProfit = profitPerTicket * t.qty;
                      const roi = ((profitPerTicket / t.face) * 100).toFixed(0);
                      return (
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#5a6478" }}>
                          Net Profit: <span style={{ color: profitPerTicket >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{profitPerTicket >= 0 ? "+" : ""}${totalProfit.toFixed(0)}</span>
                          <span style={{ color: profitPerTicket >= 0 ? "#4ade80" : "#f87171", marginLeft: 6 }}>
                            ({roi}% ROI)
                          </span>
                        </span>
                      );
                    })()}
                    {!t.sold && !t.kept && <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: urgencyColor(daysOut) }}>{urgencyLabel(daysOut)}</span>}
                    <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
                      {!t.sold && !t.kept && <button onClick={() => setInventory(p => p.map(x => x.id === t.id ? { ...x, sold: true } : x))} style={{ background: "#4ade8011", color: "#4ade80", border: "1px solid #4ade8030", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>Sold</button>}
                      {!t.sold && !t.kept && <button onClick={() => setInventory(p => p.map(x => x.id === t.id ? { ...x, kept: true } : x))} style={{ background: "#60a5fa11", color: "#60a5fa", border: "1px solid #60a5fa30", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>Keep</button>}
                      {t.kept && <button onClick={() => setInventory(p => p.map(x => x.id === t.id ? { ...x, kept: false } : x))} style={{ background: "#60a5fa22", color: "#60a5fa", border: "1px solid #60a5fa44", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>Undo Keep</button>}
                      <button onClick={() => setInventory(p => p.filter(x => x.id !== t.id))} style={{ background: "#f8717111", color: "#f87171", border: "1px solid #f8717130", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {/* ── PLATFORM COMPARE ── */}
        {activeTab === "Platform Compare" && (
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#F0C040", marginBottom: 6 }}>Platform Compare</div>
            <div style={{ color: "#5a6478", fontSize: 13, marginBottom: 18 }}>Exact net payout at any price point across all platforms.</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 10, marginBottom: 20 }}>
              {Object.entries(PLATFORM_FEES).map(([name, p]) => (
                <div key={name} style={{ background: "#111418", border: `1px solid ${p.color}33`, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: p.color, fontSize: 13, fontWeight: 700, fontFamily: "monospace", marginBottom: 10 }}>{name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#5a6478", fontSize: 11 }}>Seller fee</span>
                    <span style={{ color: "#f87171", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{(p.seller * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#5a6478", fontSize: 11 }}>Buyer fee</span>
                    <span style={{ color: "#F0C040", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{(p.buyer * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ padding: "5px 7px", background: "#0d1117", borderRadius: 5, fontSize: 10, color: p.buyer === 0 ? "#4ade80" : "#5a6478", fontFamily: "monospace" }}>
                    {p.buyer === 0 ? "✓ Zero buyer fees" : `Buyer pays +${(p.buyer * 100).toFixed(0)}%`}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 10, padding: 18, marginBottom: 14 }}>
              <div style={{ color: "#5a6478", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, fontFamily: "monospace" }}>Net Payout Calculator</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <span style={lbl}>TRUE COST / TICKET</span>
                  <input type="number" value={calcFace} onChange={e => setCalcFace(e.target.value)} placeholder="375" style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <span style={lbl}>YOUR ASK PRICE</span>
                  <input type="number" value={calcAsk} onChange={e => setCalcAsk(e.target.value)} placeholder="600" style={inputStyle} />
                </div>
              </div>
              <NetCalc face={calcFace} ask={calcAsk} />
              {calcFace && calcAsk && (() => {
                const best = Object.entries(PLATFORM_FEES).sort((a, b) => a[1].seller - b[1].seller)[0];
                const net = parseFloat(calcAsk) * (1 - best[1].seller);
                const profit = net - parseFloat(calcFace);
                const roi = ((profit / parseFloat(calcFace)) * 100).toFixed(0);
                return (
                  <div style={{ marginTop: 12, background: "#0d1117", borderRadius: 8, padding: 12, border: "1px solid #1e2530", fontSize: 13, color: "#a8b3cf", lineHeight: 1.8 }}>
                    <span style={{ color: "#5a6478", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Recommendation</span>
                    Best net on <strong style={{ color: best[1].color }}>{best[0]}</strong> ({(best[1].seller * 100).toFixed(0)}% fee) → keep <strong style={{ color: "#4ade80" }}>${net.toFixed(2)}</strong>/ticket.
                    {profit >= 0 ? <span style={{ color: "#4ade80" }}> +${profit.toFixed(2)} profit · {roi}% ROI.{parseInt(roi) >= 30 ? " ✓ Meets 30% target." : " ⚠ Below 30% target."}</span> : <span style={{ color: "#f87171" }}> ⚠ Below cost — raise ask.</span>}
                  </div>
                );
              })()}
            </div>

            <div style={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 10, padding: 18 }}>
              <div style={{ color: "#5a6478", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, fontFamily: "monospace" }}>Sell Timing Guide</div>
              {[
                ["30+ days", "Hold or list high — maximum leverage window", "#4ade80"],
                ["14–30 days", "List at market — peak demand for most events", "#4ade80"],
                ["7–14 days", "List now — late buyers appear, cut 5% if stale after 48h", "#F0C040"],
                ["3–7 days", "Price 10–15% below best comp — urgency mode", "#F0C040"],
                ["24–72 hrs", "Aggressive — better to move than hold, -20% if needed", "#f87171"],
                ["Day of", "Last resort — SeatGeek best for last-minute buyers", "#f87171"],
              ].map(([range, action, color]) => (
                <div key={range} style={{ display: "flex", gap: 14, padding: "9px 0", borderBottom: "1px solid #1a1f2a" }}>
                  <div style={{ color, fontFamily: "monospace", fontSize: 11, fontWeight: 700, minWidth: 95 }}>{range}</div>
                  <div style={{ color: "#a8b3cf", fontSize: 12, lineHeight: 1.5 }}>{action}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        input::placeholder, textarea::placeholder { color: #2e3545; }
        select option { background: #0d1117; color: #cdd6f4; }
        button:disabled { opacity: 0.35; cursor: not-allowed; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0a0d12; }
        ::-webkit-scrollbar-thumb { background: #1e2530; border-radius: 3px; }
      `}</style>
    </div>
  );
}
