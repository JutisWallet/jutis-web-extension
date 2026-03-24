# Jutis Extension — Design Changes Rollback V3
*Every file changed in this phase, why, source reference, and how to revert.*

---

## Files Changed

| File | Change | Source Reference |
|---|---|---|
| `src/app/popup/App.tsx` | BottomNav restructured: icon-only with emoji + active dot | wallet_2 nav pill |
| `src/app/popup/App.tsx` | HomeScreen Quick Action: collapsible with `max-height`/`opacity` transition | wallet_2 Quick Action |
| `src/app/popup/App.tsx` | HomeScreen holdings: items now clickable → token-details | wallet_3 token card |
| `src/app/popup/App.tsx` | HomeScreen Discover tile: navigates to `dapp-connect` | wallet_6 Discover |
| `src/app/popup/App.tsx` | New `DappConnectScreen` added | wallet_6 dApp listing + wallet_4 overlay |
| `src/app/popup/App.tsx` | New `TokenDetailsScreen` added | wallet_3 card pattern |
| `src/app/popup/App.tsx` | New `RegisterScreen` added | new (social sign-in) |
| `src/app/popup/App.tsx` | `OverlaySheet`: `connection-request` overlay added | wallet_4 connection panel |
| `src/app/popup/App.tsx` | Render tree: new screen renders + Header visibility updated | — |
| `src/state/use-jutis-store.ts` | `PopupScreen` exported (was internal) | — |
| `src/state/use-jutis-store.ts` | `Overlay` exported (was internal) | — |
| `src/state/use-jutis-store.ts` | `"dapp-connect" \| "token-details" \| "register"` added to PopupScreen | — |
| `src/state/use-jutis-store.ts` | `"connection-request"` added to Overlay | — |
| `src/state/use-jutis-store.ts` | `selectedTokenId: string \| null` added to state | — |
| `src/state/use-jutis-store.ts` | `setSelectedTokenId()` action added | — |

---

## BottomNav Rollback — Icon-Only

**What changed:** `<NavButton>Home</NavButton>` text labels → icon-only emoji buttons with active dot.

**Before V3:**
```tsx
<NavButton active={screen === "home"} onClick={() => setScreen("home")}>
  Home
</NavButton>
```

**After V3:**
```tsx
const NAV_ITEMS = [
  { screen: "home", icon: "🏠" },
  { screen: "activity", icon: "📋" },
  // ...
];
{NAV_ITEMS.map(({ screen: s, icon }) => (
  <button onClick={() => setScreen(s)}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    {active && <ActiveDot />}
  </button>
))}
```

**How to revert:** Restore `<NavButton active={...}>Label</NavButton>` per item. Restore `NAV_ITEMS` → text labels.

---

## Quick Action Collapsible Rollback

**What changed:** Quick Action section now toggles open/close. Added `qaOpen` useState.

**How to revert:** Remove `qaOpen` state from HomeScreen, change toggle button back to `onClick={() => setScreen("settings")}`, restore always-visible Send/Receive/Swap grid.

---

## DappConnectScreen Rollback

**What changed:** New `DappConnectScreen` function + `"dapp-connect"` in PopupScreen.

**How to revert:**
1. Remove `DappConnectScreen` function from App.tsx
2. Remove `dapp-connect` from PopupScreen union in store
3. Remove `DappConnectScreen` render condition
4. Remove from Header/BottomNav visibility check
5. Change Discover tile back to `onClick={() => setScreen("settings")}`

---

## TokenDetailsScreen Rollback

**What changed:** New `TokenDetailsScreen` + `"token-details"` in PopupScreen + `selectedTokenId` in store.

**How to revert:**
1. Remove `TokenDetailsScreen` function from App.tsx
2. Remove `"token-details"` from PopupScreen
3. Remove `selectedTokenId` state and `setSelectedTokenId` from store
4. Revert holdings item from `<button>` back to `<div>`, remove `onClick`

---

## RegisterScreen Rollback

**What changed:** New `RegisterScreen` + `"register"` in PopupScreen.

**How to revert:**
1. Remove `RegisterScreen` function
2. Remove `"register"` from PopupScreen
3. Remove render condition
4. Remove render from Header/BottomNav visibility check

---

## Connection Request Overlay Rollback

**What changed:** `OverlaySheet` handles `"connection-request"` overlay type.

**How to revert:**
1. Remove `"connection-request"` from Overlay union
2. Remove the `{overlay === "connection-request" ? (...) : null}` block from OverlaySheet

---

## Store Changes Rollback

```bash
# Revert store type exports
git checkout HEAD~1 -- src/state/use-jutis-store.ts
```

**What to check after revert:**
- `PopupScreen` is no longer exported — App.tsx import will break (use local type)
- `"dapp-connect"`, `"token-details"`, `"register"` removed from screen union
- `"connection-request"` removed from Overlay
- `selectedTokenId` removed from state

---

## Git Rollback Command

```bash
git checkout HEAD~1 -- src/app/popup/App.tsx src/state/use-jutis-store.ts
```

---

## Pre-Rollback Checklist

- [ ] Verify BottomNav still responds after revert (icon-only vs text labels)
- [ ] Verify Quick Action still navigates after revert
- [ ] Verify DappConnect screen removed from render tree
- [ ] Verify TokenDetails screen removed from render tree
- [ ] Verify `PopupScreen` type is consistent after revert (App.tsx uses it)
- [ ] Check no broken imports from store type changes
