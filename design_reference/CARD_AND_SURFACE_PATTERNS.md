# Card & Surface Patterns
*SectionCard, glass cards, control tiles, and surface treatments.*

---

## SectionCard

Standard content container. Rounded corners, subtle border, card-bg surface.

**Jutis usage:** `<SectionCard>` — wraps related content groups.

**With title:**
```tsx
<SectionCard title="Hub">
  {children}
</SectionCard>
```

**With action (top-right badge):**
```tsx
<SectionCard title="Canton swap" action={<SupportBadge state="live" />}>
  {children}
</SectionCard>
```

---

## Glass Card (Quick Action Container)

Used for the Quick Action pill/card container.

**Source:** wallet_2 `glass-card`

```tsx
{
  background: "rgba(35,39,48,0.9)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 28,
  padding: 12
}
```

---

## Control Tile

Used for Hub section tiles (Assets, Discover, Security Shield).

**Source:** wallet_2 `.control-tile`

```tsx
{
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: 16,
  borderRadius: 20,  // 3xl
  aspectRatio: "1/1" or "auto",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
  cursor: "pointer",
  transition: "all 0.15s"
}
```

**Hover:** `background: rgba(255,255,255,0.06)`
**Active/pressed:** `transform: scale(0.95–0.98)`

---

## Surface Colors

| Token | Value | Usage |
|---|---|---|
| `bg-main` | `#1a1d23` | Page background |
| `card-bg` | `#232730` | SectionCard, tiles |
| `border` / `border-soft` | `rgba(255,255,255,0.05)` | Subtle borders |
| `border-ui` | `#2e323c` | Slightly stronger border |
| Overlay surface | `rgba(26,29,35,0.98)` | Bottom sheet |

---

## Asset Pill (Holdings)

Horizontal scroll items showing token + amount.

```tsx
{
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.05)",
  background: "rgba(255,255,255,0.03)",
  flexShrink: 0,
  minWidth: 130
}
```

---

## Activity Row

Compact single-row item for activity/transaction lists.

```tsx
{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 8px",
  borderRadius: 14,
  cursor: "pointer",
  hover: "background: rgba(255,255,255,0.05)"
}
```

Icon circle: 36–40px, `borderRadius: "50%"`, `border: "1px solid rgba(255,255,255,0.05)"`.

---

## DApp Tile

Full-width card for dApp listing (DappConnect screen).

```tsx
{
  background: "rgba(35,39,48,0.9)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 20,
  padding: 20,
  display: "grid",
  gap: 14
}
```

**Verified badge:** top-right, `bg-accent/10 text-accent px-2 py-0.5 rounded-md`.

**Connect button:**
```tsx
{
  width: "100%",
  padding: "12px",
  borderRadius: 14,
  border: 0,
  background: "var(--accent)",
  color: "#11151c",
  fontWeight: 700
}
```

---

## Address Pill

Monospace text in a rounded pill, used for wallet addresses.

```tsx
{
  fontSize: 11,
  fontFamily: "monospace",
  color: "var(--text-secondary)",
  background: "rgba(255,255,255,0.05)",
  padding: "5px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.05)"
}
```
