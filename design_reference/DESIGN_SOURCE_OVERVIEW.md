# Jutis Design Source Overview
*Source: `designed_source/` — canonical visual library for Jutis*

---

## Source Files

| File | Role | Key Elements |
|---|---|---|
| `carbon_main_wallet_1/code.html` | Primary home screen | Balance, Quick Action, Holdings scroll, Recent Activity, bottom nav with labels |
| `carbon_main_wallet_2/code.html` | Icon-only nav reference | apple-blur pill nav, glass-card hub tiles, compact activity rows |
| `carbon_main_wallet_3/code.html` | Hub + ecosystem reference | 2-col hub grid, Send/Receive/Connect tiles, Ecosystem Hub with verified dApp cards |
| `carbon_main_wallet_4/code.html` | Send wizard + connection overlay | Full-page send flow, bottom-sheet connection-request panel |
| `carbon_main_wallet_5/code.html` | Minimal/evening variant | Minimal balance display, "Start Transaction" CTA |
| `carbon_main_wallet_6/code.html` | Dapp Navigator | Verified dApp listing (Canton Trade, Global Ledger, Canton Insure), bottom action bar |
| `carbon_main_wallet_7/code.html` | Command panel (desktop) | Split-panel layout, left sidebar with balance/actions, right main area with dApp list |

---

## Color System

```css
--bg-main:      #1a1d23   /* primary background */
--card-bg:       #232730   /* card/panel surface */
--border-ui:     #2e323c   /* subtle border */
--text-primary:  #e6e8ec   /* main text */
--text-secondary: #9aa1ac   /* muted text */
--accent:        #dce87a   /* Jutis accent (lime/chartreuse) */
```

**Accent usage:** Active nav items, positive indicators, primary CTAs, Canton indicator dot.

**Secondary usage:** Bordered pills, muted labels, secondary buttons.

---

## Typography

- **Display font:** `Plus Jakarta Sans` — headings, balance display, card titles
- **Body font:** `Inter` — labels, body copy, descriptions
- **Mono font:** `monospace` — addresses, amounts, code values

**Scale (px):**
| Usage | Size |
|---|---|
| Balance display (large) | 44–56px |
| Section title | 17–22px |
| Card heading | 14px bold |
| Body | 13px |
| Label/eyebrow | 10–11px uppercase |
| Mono/address | 10–11px mono |

---

## Border Radius System

| Token | Value | Usage |
|---|---|---|
| `2xl` | 1.25rem (20px) | Cards, buttons |
| `3xl` | 1.75rem (28px) | Overlay sheets, main cards |
| `4xl` | 2.25rem (36px) | Full-screen modals |

---

## Icon Font

**Material Symbols Outlined** — loaded in source via Google Fonts.
Weight: `FILL@100..700, 0..1` (variable weight + fill).

Icon font is **NOT** loaded in the Jutis build. Fallbacks used:
- Text labels or emoji for navigation icons
- Emoji (🔷, ◇, ●) for token icons
- Emoji (⚡, ↑, ↓, ⇄, 🔒, ✓) for action icons

---

## Key Design Tokens (CSS)

```css
.apple-blur {
  backdrop-filter: blur(20px);
  background: rgba(35, 39, 48, 0.8);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 999px; /* full pill */
}

.apple-shadow {
  box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar { display: none; }
```

---

## Active/Inactive States

**Nav active:**
- Accent color icon/text
- Small 4px accent dot below icon (wallet_2 pattern)
- `opacity: 1` vs `opacity: 0.45` for inactive

**Button states:**
- Default: bg-surface or accent
- Hover: `opacity: 0.9` or `bg: rgba(255,255,255,0.1)`
- Active/pressed: `scale: 0.97–0.98`
- Disabled: reduced opacity

---

## Overlay/Sheet Pattern

Full-screen overlay with semi-transparent backdrop `rgba(8,10,14,0.6)`:
- Bottom-anchored sheet, `borderRadius: 28px` top corners
- Draggable handle: `w-16 h-1 bg-white/10 rounded-full` centered at top
- `z-index: 30+`

---

## Extension Frame

Extension popup: `360px × 640px` (mobile-first).

Outer shell: `border-radius: 32–40px`, `border: 1px solid rgba(255,255,255,0.05–0.1)`.

Home indicator pill (iOS-style): `w-20 h-1 bg-white/10 rounded-full` centered at bottom, `pointer-events: none`.
