# Navigation Patterns
*Bottom nav, screen routing, and overlay behavior.*

---

## Bottom Navigation (Icon-Only)

**Source:** wallet_2, wallet_4

**Structure:**
```tsx
<footer height={64}>
  <nav apple-blur pill style={{ gap: 32, padding: "8px 24px" }}>
    {NAV_ITEMS.map(({ screen, icon }) => (
      <button>
        <Icon active={screen === current} />
        {active && <ActiveDot />}
      </button>
    ))}
  </nav>
</footer>
```

**Apple-blur pill:**
```tsx
{
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(35,39,48,0.8)",
  backdropFilter: "blur(20px)",
  padding: "8px 24px",
  display: "flex",
  gap: 32
}
```

**Icon button:**
```tsx
{
  background: "transparent",
  border: 0,
  padding: "6px 8px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  position: "relative"  // for active dot
}
```

**Active dot:** 4×4px accent circle, bottom of button, `translateX(-50%)`.

---

## Nav Items

| Icon | Screen | Source |
|---|---|---|
| 🏠 | home | wallet_2 grid_view → emoji |
| 📋 | activity | wallet_2 history → emoji |
| ⇄ | swap | wallet_4 swap_horiz → emoji |
| 👤 | friend | wallet_4 account_circle → emoji |
| ⚙ | settings | wallet_1/4 settings → emoji |

---

## Screen Routing

**State:** `useJutisStore.screen: PopupScreen`

**Navigation methods:**
- `setScreen("home")` — navigate to a full screen
- `setOverlay("send")` — open bottom sheet overlay
- `setOverlay(null)` — close overlay

---

## Overlay Sheet (Bottom Drawer)

**Source:** wallet_4 `#connection-request` div

**Structure:**
```tsx
<div style={{
  position: "absolute",
  inset: 0,
  background: "rgba(8,10,14,0.6)",
  display: "flex",
  alignItems: "flex-end",
  padding: 10
}}>
  <div style={{
    width: "100%",
    borderRadius: "28px 28px 0 0",
    border: "1px solid var(--border)",
    background: "rgba(26,29,35,0.98)",
    padding: 18,
    display: "grid",
    gap: 14
  }}>
    {/* Drag handle */}
    <div class="w-16 h-1 bg-white/10 rounded-full" />
    {/* Content */}
  </div>
</div>
```

**Entry animation:** Slide up from bottom (CSS transform or JS transition).

---

## Back Navigation

- Sub-screens (link-party, environment): `← Back to settings` button → `setScreen("settings")`
- Overlays: `× Close` button → `setOverlay(null)`
- No hardware back button in extension context

---

## Screen Visibility

Header and BottomNav shown for: `home | activity | swap | friend | settings | dapp-connect | token-details`

Welcome/create/import/unlock/register: no Header, no BottomNav.

---

## iOS Home Indicator

Small pill at bottom center of popup, `pointer-events: none`:
```tsx
position: "absolute",
bottom: 6–8,
left: "50%",
transform: "translateX(-50%)",
width: 80,
height: 4,
background: "rgba(255,255,255,0.1)",
borderRadius: 999
```
