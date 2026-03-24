# Jutis Extension — Design Restoration Audit

*What was restored from `designed_source/main wallet 3` and what was changed.*

---

## Source Reference

**Primary source:** `designed_source/carbon_main_wallet_3/code.html`
**Design brand:** Carbon (the product design name; Jutis is the extension/product name)
**Dimensions:** 360×640px mobile layout, dark theme, lime accent `#dce87a`

---

## What Differed From Source

| Aspect | Source Design | Previous App | Restoration Status |
|---|---|---|---|
| **Address pill** | Shown above balance as `0x34A...8F2D` in a pill badge | Not shown on home screen | ✅ Restored — party id pill added above portfolio balance |
| **Balance display** | Centered, large `$3,482.20` with dollar prefix, `.20` in secondary color | Metric component with verbose labels and notes | ✅ Restored — centered large balance with dollar prefix |
| **24h change** | `+$82.40 (2.4%) today` with trending_up icon | Not shown | ❌ Not restored — no live price feed available |
| **Quick Action Hub** | Glass card with "Quick Action" button + Send/Receive/Swap grid | Generic "Quick action" button + Canton-specific labels | ✅ Restored — glass-morphic card with clean action buttons |
| **Hub section** | Assets + Discover tiles + Security Shield row with chevron | "Canton support status" verbose card | ✅ Restored — Hub tiles (Assets + Discover) added; Security Shield simplified |
| **Holdings display** | Horizontal scroll of token pills (CTN/ETH/USDC) | Vertical list with full details and SupportBadge | ✅ Restored — horizontal scroll pills; full detail list removed |
| **Recent Activity** | Compact 2-item list with icon circles, colored +/- amounts, timestamps | Full SectionCard with verbose Canton activity labels | ✅ Restored — compact icon+text list; Canton labels removed |
| **Canton support card** | Not present in source | Bloated "Canton support status" with 5 badges and explanatory paragraph | ✅ Removed |
| **Canton balances card title** | "Holdings" | "Canton balances" with Canton-specific badge | ✅ Simplified to generic "Holdings" |
| **Canton activity card title** | "Recent Activity" | "Canton activity" with Canton-specific badge | ✅ Simplified to generic "Recent activity" |
| **Bottom nav icons** | Material Symbols (grid_view, history, account_circle) | Text-only NavButtons (Home, Activity, Swap, Settings) | ⚠️ Partially restored — text labels kept; icons not added (icon font not loaded) |

---

## What Was Removed as Filler

| Removed Text | Reason |
|---|---|
| `"Canton remains a protocol-aware reference surface in this build."` | Bloated explanatory copy not in source |
| `"Canton balances and activity are reference/demo-backed, send is planning-only, and swap is unsupported."` | Excessive product caveat copy |
| `"Jutis provides Canton party identity management..."` (welcome screen) | Marketing copy not in source |
| `"Canton is intentionally fail-closed..."` (swap screen) | Verbose explanation not in source |
| Full Canton feature matrix in home screen | Not in source; adds cognitive load |
| Multiple `SupportBadge` arrays on home screen | Not in source; creates "developer dashboard" feel |

---

## What Was Intentionally Left Unchanged

| Element | Reason |
|---|---|
| Header with network button + settings | Source has settings; network selector is Jutis-specific Canton feature |
| Welcome/Create/Import/Unlock screens | Not in source reference (source is home-screen focused) |
| Settings screen structure | Not in source reference |
| Swap and Activity screens | Not in source reference |
| LinkParty and EnvironmentConfig screens | Not in source reference |
| OverlaySheet send/receive flow | Not in source reference |
| Extension runtime/bootstrap logic | Preserved — not touched during design restoration |
| BrandMark component | Already close to source: accent bar + italic uppercase tracked text |

---

## Visual/Structural Elements Restored

1. **Address pill** — party id displayed as `party::1234...abcd` in pill above balance
2. **Balance** — `$X,XXX.XX` format, large centered display
3. **Quick Action Hub** — glass-morphic rounded card, primary "Quick action" button, Send/Receive/Swap secondary grid
4. **Hub section** — 2-column grid with Assets and Discover tiles
5. **Holdings** — horizontal scrollable pills showing symbol, amount, USD value
6. **Recent Activity** — compact list with icon circles, title, timestamp, and signed amount

---

## What Still Does Not Match Source

| Gap | Reason |
|---|---|
| Bottom nav icons | Source uses Material Symbols icons; app uses text-only labels. Icon font not loaded in build |
| 24h change indicator | No live price feed; requires real Canton price oracle |
| Security Shield tile | Simplified but not fully implemented |
| Emoji-based asset icons | Used as placeholders (🔷, ◇, ●); source uses Material Symbol icons |
| Source has 2 recent transactions | App shows `slice(0, 2)` — matches |
| Source background gradient accent | Not implemented (subtle top blur effect in source) |

---

## Files Changed for Design Restoration

| File | Change |
|---|---|
| `src/app/popup/App.tsx` | HomeScreen completely rewritten to match source structure; bloated Canton sections removed; address pill added; quick action hub restored; hub tiles added; holdings scroll restored; compact activity list restored |

---

## How to Verify Restoration

1. Open Jutis popup → unlock → home screen
2. Compare against `designed_source/carbon_main_wallet_3/screen.png`
3. Key checkpoints:
   - Address pill visible above balance
   - Balance is large and centered with $ prefix
   - Quick Action Hub has glass-morphic styling
   - Send/Receive/Swap buttons are clean (not labeled with Canton-specific text)
   - Hub tiles visible (Assets, Discover)
   - Holdings scroll visible
   - Recent activity is compact (not full Canton activity card)
   - Bottom nav present (text labels)
