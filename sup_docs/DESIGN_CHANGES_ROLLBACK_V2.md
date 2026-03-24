# Jutis Extension — Design Changes Rollback V2
*Design pass V2 changes — what changed, how to revert safely.*

---

## Files Changed in V2

| File | What Changed | How to Revert |
|---|---|---|
| `src/app/popup/App.tsx` | BottomNav restructured: `<footer h-64>` + inner `<nav apple-blur pill>` with `gap-32` | Replace with old `<nav position:absolute>` structure |
| `src/app/popup/App.tsx` | ActivityScreen completely rewritten: compact icon rows, SAMPLE_ACTIVITY array, honest disclaimer | Restore old SectionCard-per-item version |
| `src/app/popup/App.tsx` | Quick Action Hub: custom button with bolt glyph (⚡) + chevron (›) | Replace with `PrimaryButton` with text-only label |
| `src/app/popup/App.tsx` | Header padding corrected: `padding: "28px 24px 16px"`, border: `rgba(255,255,255,0.04)"` | Revert to previous padding/border values |

---

## BottomNav Rollback

### What Changed

The `<nav>` element was replaced with a `<footer>` outer wrapper plus an inner `<nav>` pill:

**Before V2:**
```tsx
<nav style={{
  position: "absolute",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(35,39,48,0.8)",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "8px 20px",
  display: "flex",
  gap: 20,
  backdropFilter: "blur(20px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  zIndex: 50,
}}>
```

**After V2:**
```tsx
<footer style={{
  height: 64,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexShrink: 0,
  padding: "0 18px",
}}>
  <nav style={{
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(35,39,48,0.8)",
    backdropFilter: "blur(20px)",
    padding: "8px 24px",
    display: "flex",
    gap: 32,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  }}>
    {/* NavButtons */}
  </nav>
</footer>
```

### How to Revert

Replace the `<footer>` wrapper and inner `<nav>` with the original `<nav>` element shown above. Restore `position: absolute`, `bottom: 24`, `transform: translateX(-50%)`, `gap: 20`, `padding: "8px 20px"`.

---

## ActivityScreen Rollback

### What Changed

The entire `ActivityScreen` component was replaced with a source-faithful compact row layout. `SAMPLE_ACTIVITY` array was added with two sample items (send/receive) and an honest disclaimer. Verbose Canton labels ("Canton Network Transfer", etc.) were replaced with simple descriptions.

### How to Revert

Restore the old `ActivityScreen` function that used `SectionCard` per activity item with verbose Canton labels. The old version rendered `activities.map(activity => <SectionCard key={activity.id} ...>)` with `activity.title`, `activity.description`, `activity.amount`, `networkId`, and Canton verbose copy.

Key elements to restore:
- `SectionCard` per activity item
- Verbose `activity.title` and `activity.description`
- `networkId` badge with full "Local Development Network" text
- Activity item timestamps in verbose format

Remove:
- `SAMPLE_ACTIVITY` constant
- Honest disclaimer section
- Compact icon+text row structure
- `kind` and `status` simplified badges

---

## Quick Action Hub Rollback

### What Changed

**Before V2:**
```tsx
<PrimaryButton
  label="Quick action"
  onClick={handleQuickAction}
  style={{ padding: "12px 24px" }}
/>
```

**After V2:**
```tsx
<button
  onClick={handleQuickAction}
  style={{
    background: "linear-gradient(135deg, #5E5CE6 0%, #7D7AFF 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 20px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    justifyContent: "center",
  }}
>
  ⚡ Quick Action ›
</button>
```

### How to Revert

Replace the custom `<button>` element with the original `PrimaryButton` component with `label="Quick action"`. Remove inline gradient styles and icon characters (⚡, ›).

---

## Header Rollback

### What Changed

**Before V2:**
```tsx
style={{
  padding: "22px 22px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  ...
}}
```

**After V2:**
```tsx
style={{
  padding: "28px 24px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  ...
}}
```

### How to Revert

Change `padding` back to `"22px 22px 14px"` and `borderBottom` back to `"1px solid rgba(255,255,255,0.05)"`.

---

## Git Rollback Commands

```bash
# Revert App.tsx to before V2 changes
git checkout HEAD~1 -- src/app/popup/App.tsx
```

---

## Pre-Rollback Checklist

- [ ] Verify BottomNav still anchors correctly after revert
- [ ] Verify ActivityScreen still shows items after revert
- [ ] Verify Quick Action button still responds after revert
- [ ] Verify Header padding looks acceptable after revert
