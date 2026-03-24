# Jutis Design Audit

Date: 2026-03-21

Scope reviewed:

- `designed_source/carbon_main_wallet_1/code.html`
- `designed_source/carbon_main_wallet_2/code.html`
- `designed_source/carbon_main_wallet_3/code.html`
- `designed_source/carbon_main_wallet_4/code.html`
- `designed_source/carbon_main_wallet_5/code.html`
- `designed_source/carbon_main_wallet_6/code.html`
- `designed_source/carbon_main_wallet_7/code.html`
- all seven matching `screen.png` files

## Summary

The design source is a tightly controlled dark wallet language centered on:

- graphite backgrounds
- lime-yellow primary actions
- dense rounded cards
- compact uppercase labels
- oversized numeric balance displays
- restrained motion through hover, opacity, and press-scale feedback

Jutis must inherit this language directly. The wallet should not introduce a bright theme, glossy gradients, glassmorphism-heavy ornamentation, or a generic exchange dashboard aesthetic.

## Layout Patterns

### Primary shell

- The dominant frame is a narrow mobile wallet shell around `360x640`.
- The shell usually has a single sticky header, a vertically stacked content column, and a persistent bottom navigation or a bottom action dock.
- Sections are separated by generous vertical rhythm instead of hard dividers.

### Expansion shell

- `carbon_main_wallet_6` shows a wider split-pane workspace with a left portfolio rail and a right ecosystem/app surface.
- This is the best reference for Jutis `options` or expanded management surfaces, not the popup default.

### Header behavior

- Brand mark sits top-left with a narrow accent pill.
- Network/account chip sits top-right or top-center.
- Settings/search/filter icons are lightweight and secondary.
- Headers often use soft blur or translucent overlays rather than opaque bars.

## Spacing Logic

Observed spacing rhythm is consistent and should be preserved as tokens:

- `4px` micro gaps
- `8px` icon/label separation
- `12px` compact row spacing
- `16px` default card padding
- `20px` prominent surface padding
- `24px` section gap
- `32px` major block separation

Component-specific patterns:

- action cards use `16px` to `20px` padding
- portfolio hero blocks use `20px` to `24px`
- token pills and asset chips use `10px` to `14px`
- modal/sheet interiors should feel denser than standard web app forms

## Typography Style

### Fonts

- Body font: `Inter`
- Display font: `Plus Jakarta Sans`

### Typographic hierarchy

- Large balance numbers use display font, tight tracking, and visually anchor the screen.
- Section labels are micro uppercase labels, typically `9px` to `11px`, with wide letter spacing.
- Supporting metadata uses subdued gray copy at `10px` to `12px`.
- Brand wordmark is uppercase, compact, slightly italicized.

### What this means for Jutis

- Portfolio totals, send amounts, swap quotes, and receive identifiers should use the display hierarchy from the source.
- Do not replace the micro-label system with ordinary sentence-case section titles.

## Surface Treatment

### Colors observed

- Main background: `#1a1d23` to `#1c1f26`
- Secondary card background: `#232730` to `#242933`
- Border color: `#2e323c` or `rgba(255,255,255,0.05)`
- Primary text: `#e6e8ec` to `#e7e9ee`
- Secondary text: `#9aa1ac`
- Accent: `#dce87a`

### Shapes

- Cards are heavily rounded, usually `20px` to `32px`.
- Pills are frequent: network chips, address chips, action docks.
- Borders are subtle and nearly always present on secondary surfaces.

### Depth

- Depth comes from contrast and a few controlled drop shadows, not large layered elevations.
- Backdrop blur appears in headers and floating panels, but should be used sparingly.

## Color System

### Core palette

- `bg-main`: deep graphite
- `surface`: muted charcoal
- `surface-strong`: slightly brighter charcoal for grouped actions
- `text-primary`: soft off-white
- `text-secondary`: cool muted gray
- `accent`: acid-lime

### Semantic accents

- Blue is used for USDC or companion token accents.
- Green appears for trust, secure, verified, or positive state.
- Neutral gray is preferred over red-heavy warning design until the user reaches a truly risky state.

### Preservation rule

- Jutis should keep the dark graphite + lime accent identity even when Base assets are shown.
- Base content should not force a blue-first palette over the Canton-derived wallet brand.

## Motion and Interaction Patterns

Observed interaction language:

- hover background shift from `white/5` to `white/10`
- press scaling around `0.95` to `0.98`
- opacity changes for inactive navigation and utility actions
- border color emphasis on interactive cards
- bottom sheet transform animations in `carbon_main_wallet_7`

Rules for Jutis:

- use fast, subtle transitions
- prefer transform + opacity over dramatic page motion
- keep action feedback tactile on buttons, rows, and chips

## Component Patterns

### Portfolio hero

- Large total balance
- small gain/loss pill
- account chip nearby

### Action hub

- One dominant primary action
- secondary send/receive/swap row beneath
- grouped inside a nested rounded card

### Asset list

- either horizontal token pills or vertical rows
- icon container + symbol + secondary amount/value
- light border and soft hover state

### Activity list

- compact rows
- action icon at left
- timestamp/value/status at right
- rows read more like wallet events than exchange fills

### Ecosystem/app cards

- ecosystem apps appear as trusted cards with verification markers and connect buttons
- this is a useful model for future Canton integrations or partner modules

### Bottom navigation

- compact icon-first navigation
- active state uses accent, inactive states use reduced opacity
- labels are micro uppercase, sometimes hidden unless active

## Navigation Model

- Popup shell should use bottom navigation between portfolio, activity, swap, and settings.
- Deep tasks such as send, receive, transaction detail, and unlock should appear as routed overlays or sheets.
- Expanded views can use split-pane layouts inspired by `carbon_main_wallet_6`.

## What Must Be Preserved In Jutis

- dark graphite visual base
- lime accent for primary actions and focus moments
- dense rounded cards and pills
- compact uppercase metadata labels
- oversized portfolio and amount typography
- tactile press-scale interactions
- wallet-native layout density rather than dashboard sprawl

## What Can Be Adapted For Extension Constraints

- Popup height can exceed the original mock to improve usability in Chromium popup panels.
- Bottom sheets can become routed overlays inside a constrained popup.
- Wide split-pane variants should move to the options page instead of the popup.
- Canton/Base network switcher can be made more explicit than the source because Jutis is multi-network, not single-network.
- Security confirmations need more explanatory copy than the source mockups show.

## Jutis UI Translation Rules

1. Portfolio home follows the mobile shells from `carbon_main_wallet_1`, `2`, `3`, and `7`.
2. Settings and advanced management borrow structural ideas from `carbon_main_wallet_6`.
3. Send/receive and ecosystem surfaces may borrow grouped-card treatments from `carbon_main_wallet_4` and `5`.
4. Typography, spacing, and accent treatment must stay consistent across Canton and Base surfaces.
