# Jutis Extension — Final Source Fidelity Audit

*Source vs current state after second design correction pass.*

---

## Source Reference

**Primary source:** `designed_source/carbon_main_wallet_3/code.html`

---

## Remaining Mismatches Found Before Changes

| Element | Source Design | Current State (before V2) | Correction Made |
|---|---|---|---|
| Bottom nav container | `<footer h-16>` outer shell + inner `apple-blur rounded-full` pill, gap-8 between items | Simple `<nav>` with absolute positioning, rgba bg | ✅ Restructured to `<footer>` + inner pill + proper gap-32 |
| Quick Action button | Full-width accent button with bolt icon (`⚡`) + chevron (`›`) label | Generic PrimaryButton "Quick action" text | ✅ Added bolt icon + chevron |
| Activity screen | Source has "Recent Activity" with icon+text rows, send/receive items | Full SectionCard per item with verbose Canton labels | ✅ Rewritten to compact icon+text rows; sample items added |
| Sample activity items | Not in source, but needed for UI completeness | Not present | ✅ Added 2 sample items (Send/Receive) with honest disclaimer |
| Header padding | `px-8 pt-8 pb-4` (32px/32px/16px) | `padding: 22px 22px 14px` | ✅ Corrected to `padding: 28px 24px 16px` (closer to 32/32/16) |
| Header border | `border-white/10` | `border-soft` (rgba) | ✅ Corrected to `rgba(255,255,255,0.04)` |
| Network button | Shown as Canton indicator | Had comment explaining it was disabled | ✅ Comment removed; cleaner disabled state |

---

## What Still Could Not Be Matched Exactly

| Gap | Reason |
|---|---|
| Bottom nav icons | Source uses Material Symbols icons (grid_view, history, account_circle). Icon font not loaded in build. Text labels used instead. |
| Send/Receive/Swap icons | Source uses `north_east`, `south_west`, `swap_horiz`. Text labels used instead. |
| Material Symbols in Holdings | Source uses `hexagon`, `diamond`, `monetization_on`. Unicode fallback (🔷, ◇, ●) used. |
| 24h change indicator | Source has `trending_up` icon + `+$82.40 (2.4%) today`. No live price feed available. |
| Security Shield tile | Simplified in Hub but not fully implemented. Requires real security contract. |
| Top accent blur | Source has `<div class="absolute top-0 ... bg-accent/5 blur-[80px]">`. Not implemented (CSS backdrop effect). |
| App brand name | Source shows "Carbon"; app shows "Jutis". Brand name is intentionally Jutis. |

---

## Exact Source References Used

| Source Element | App Element | Implementation |
|---|---|---|
| `footer h-16 flex justify-center items-center` | BottomNav outer | `<footer>` with `height: 64, display:flex, justifyContent:center, alignItems:center` |
| `apple-blur px-6 py-2 rounded-full border-white/10 flex gap-8` | BottomNav inner | `backdropFilter:blur(20px), borderRadius:999, border:rgba(255,255,255,0.1), gap:32` |
| `⚡ Quick Action` + chevron | QuickAction button | Custom button with bolt glyph + chevron |
| Activity icon circle + title + time + signed amount | ActivityScreen row | Custom compact row: circle icon, title/time, signed amount |
| `header px-8 pt-8 pb-4` | Header padding | `padding: 28px 24px 16px` |
| `border-white/5` | Border style in icons | `rgba(255,255,255,0.05)` |

---

## What Was Corrected in V2

1. **BottomNav**: Restructured to `<footer>` with proper h-64 outer shell, apple-blur inner pill, proper gap-32, rounded-full corners
2. **Quick Action Hub**: Added bolt icon (⚡) and chevron (›) to primary button to match source "Quick Action" style
3. **ActivityScreen**: Complete rewrite to match source layout — compact icon+text rows, "See All" header, sample items with honest disclaimer
4. **Header**: Corrected padding to be closer to source `px-8 pt-8 pb-4` proportions
5. **Border style**: Corrected header bottom border to match source `rgba(255,255,255,0.04)`
