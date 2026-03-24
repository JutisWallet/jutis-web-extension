# Layout Patterns
*How screens and sections are structured and spaced.*

---

## Page Structure

```
<div> (full height, flex column)
  <Header /> (sticky, optional per screen)
  <main> (flex-1, overflow-y: auto)
    [SectionCard or custom content]
  </main>
  <BottomNav /> (fixed height 64px, outside main scroll)
  <OverlaySheet /> (position: absolute, full overlay)
```

**Scrollable main:** `overflow-y: auto`, uses `hide-scrollbar` for no scrollbar.
**Bottom padding:** `pb-96` (~96px) accounts for BottomNav (64px) + breathing room.

---

## Section Card

Primary content container. Used to group related content.

**Source:** wallet_1/2/3 `bg-card-bg rounded-3xl border border-border-ui p-4`

**Jutis equivalent:**
```tsx
<SectionCard>
  {content}
</SectionCard>
```

**Variants:**
- `title="..."` prop → renders eyebrow label + title
- `action={<SupportBadge ... />}` → renders badge top-right

---

## Grid Layouts

**2-column hub grid** (Hub tiles):
```tsx
display: "grid",
gridTemplateColumns: "1fr 1fr",
gap: 10–14px
```

**3-column action grid** (Quick Action Send/Receive/Swap):
```tsx
display: "grid",
gridTemplateColumns: "repeat(3, 1fr)",
gap: 8
```

---

## Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `gap-2` | 8px | Tight inner spacing |
| `gap-3` | 12px | Between related elements |
| `gap-4` | 16px | Standard section gap |
| `gap-5` | 20px | Screen-level padding |
| `gap-8` | 32px | Bottom nav pill gap |
| `p-4` | 16px | Card inner padding |
| `p-5–6` | 20–24px | Section padding |

---

## Screen Padding

**Standard screen:** `padding: 18px 20px 96px`
**Header:** `padding: 28px 24px 16px` (top/bottom asymmetric)
**SectionCard inner:** `padding: 16px` (compact) or `20px` (standard)

---

## Horizontal Scroll (Holdings)

```tsx
display: "flex",
gap: 10,
overflowX: "auto",
paddingBottom: 4  // space for scrollbar
```

Items use `flexShrink: 0` with fixed min-width.

---

## Glassmorphism Card

Used for the Quick Action container and hub tiles:
```tsx
background: "rgba(35,39,48,0.9)",
border: "1px solid rgba(255,255,255,0.05)",
borderRadius: 28,
padding: 12
```

---

## Accent Dot Indicator

Small 4px dot below the active bottom nav icon:
```tsx
position: "absolute",
bottom: 0,
left: "50%",
transform: "translateX(-50%)",
width: 4,
height: 4,
borderRadius: "50%",
background: "var(--accent)"
```

---

## Divider / Separator

```tsx
height: 1,
background: "var(--border-soft)",  // rgba(255,255,255,0.06)
```

---

## Screen Width

All screens assume 360px popup width. No responsive breakpoints needed within the popup.

---

## Z-Index Layers

| Layer | Value | Usage |
|---|---|---|
| Header | z-5 | Sticky top |
| BottomNav | z-20 | Fixed nav |
| OverlaySheet backdrop | z-10 | Semi-transparent backdrop |
| OverlaySheet panel | z-20 | Bottom sheet |
| Home indicator | z-40 | iOS home pill |
