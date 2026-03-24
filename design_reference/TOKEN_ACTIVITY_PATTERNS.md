# Token & Activity Patterns
*Holdings display, token details, and activity rows.*

---

## Holdings Horizontal Scroll

**Source:** wallet_1/2/3 holdings sections

Horizontal row of token pills, scrollable.

```tsx
<SectionCard title="Holdings">
  <div style={{
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 4
  }}>
    {assets.map(asset => (
      <button
        key={asset.id}
        onClick={() => { setSelectedTokenId(asset.id); setScreen("token-details"); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.03)",
          flexShrink: 0
        }}
      >
        {/* Token icon circle */}
        <div style={{
          width: 32, height: 32,
          borderRadius: "50%",
          background: asset.isPrimary
            ? "rgba(220,232,122,0.15)"
            : "rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16
        }}>
          {asset.symbol === "CTN" ? "🔷"
           : asset.symbol === "ETH" ? "◇"
           : "●"}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {asset.amount} {asset.symbol}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {formatUsdReference(asset.usdReference)}
          </div>
        </div>
      </button>
    ))}
  </div>
</SectionCard>
```

---

## Token Icon (Emoji Fallbacks)

| Token | Icon | Source color |
|---|---|---|
| CTN | 🔷 | `rgba(220,232,122,0.15)` accent tint |
| ETH | ◇ | `rgba(255,255,255,0.08)` white tint |
| USDC | ● | `rgba(96,165,250,0.12)` blue tint |
| Default | ● | varies |

**Material Symbols names (for reference, not loaded):**
- CTN: `hexagon`
- ETH: `diamond`
- USDC: `monetization_on`

---

## Token Details Screen

**Source:** wallet_3 card pattern — not a full source screen, recreated from card grammar.

**Structure:**
1. Token header: icon circle + symbol + name
2. Balance card: amount, USD value, network
3. Actions: Send / Receive buttons

```tsx
<SectionCard>
  {/* Token header */}
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <div style={{ width: 52, height: 52, borderRadius: "50%", ... }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", uppercase }}>Token</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{symbol}</div>
    </div>
  </div>
</SectionCard>
```

---

## Activity Row

**Source:** wallet_1/2/3 recent activity

Compact single-row, icon + title/time + signed amount.

```tsx
<button
  onClick={() => { setSelectedActivity(item.id); setOverlay("activity-detail"); }}
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: "12px 8px",
    borderRadius: 14,
    background: "transparent",
    border: 0,
    cursor: "pointer"
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{
      width: 36, height: 36,
      borderRadius: "50%",
      border: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      {kind === "send" ? "↑" : kind === "receive" ? "↓" : "⇄"}
    </div>
    <div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        {formatDate(createdAt)}
      </div>
    </div>
  </div>
  <div style={{
    fontSize: 12,
    fontWeight: 600,
    color: kind === "receive" ? "var(--accent)" : undefined
  }}>
    {amount ?? status}
  </div>
</button>
```

---

## Signed Amount Display

- **Send (outbound):** Neutral text color, amount with minus sign: `- 50 USDC`
- **Receive (inbound):** Accent color: `+ 100 CTN`
- **Pending:** Secondary text color, italic or muted

---

## Sample Activity Data

When live activity is unavailable, use isolated sample data with honest disclaimer:

```tsx
const SAMPLE_ACTIVITY = [
  { id: "sample-send-1", title: "Sent to 0x8a...2e1", amount: "- 50 USDC", kind: "send" },
  { id: "sample-receive-1", title: "Received from Canton", amount: "+ 100 CTN", kind: "receive" }
];

// Disclaimer shown below:
// "Sample activity — live data will appear when connected."
```

Always label sample data as sample/seed — never imply it's live.

---

## Quick Action Button

**Source:** wallet_1/2/3 Quick Action button

Collapsible — bolt icon + "Quick Action" text + chevron ›.

```tsx
<button
  onClick={() => setQaOpen(!qaOpen)}
  style={{
    width: "100%",
    height: 56,
    background: "var(--accent)",
    border: 0,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    cursor: "pointer"
  }}
>
  <span style={{ color: "#11151c", fontWeight: 800, fontSize: 14 }}>
    ⚡ Quick Action
  </span>
  <span style={{
    color: "#11151c",
    opacity: 0.5,
    fontSize: 18,
    transform: qaOpen ? "rotate(90deg)" : "none",
    transition: "transform 0.2s"
  }}>›</span>
</button>
```

Collapsible content: 3-column grid of SecondaryButtons, animated `max-height` + `opacity` transition.
