# Jutis Extension — Design Changes Rollback Guide

*Every changed design/UI file, why it changed, how to revert safely.*

---

## Files Changed in This Phase

| File | What Changed | How to Revert |
|---|---|---|
| `src/app/popup/App.tsx` | HomeScreen completely rewritten; FriendScreen added; BottomNav updated; render tree updated | See rollback instructions below |
| `src/state/use-jutis-store.ts` | `"friend"` added to `PopupScreen` type union | Remove `"friend"` from type union |
| `src/app/popup/App.tsx` | `Header` visibility condition updated to include `"friend"` | Revert to old condition |
| `src/app/popup/App.tsx` | `BottomNav` now shows Friend NavButton | Remove Friend NavButton |
| `src/app/popup/App.tsx` | `FriendScreen` component added | Remove entire FriendScreen function |
| `src/app/popup/App.tsx` | `OverlaySheet` render condition updated for friend | See revert notes |
| `src/core/models/social-types.ts` | New file — `JutisHandle`, `FriendSearchResult`, `FriendConnection`, `FriendReadiness` types | Delete file; remove imports from App.tsx |
| `src/core/services/jutis-name-service.ts` | New file — `JutisNameService` | Delete file; remove imports from App.tsx |

---

## App.tsx Rollback — HomeScreen

### What Changed

The entire `HomeScreen` function was rewritten to match `designed_source/main wallet 3`:
- Address pill added above balance
- Balance display changed from `Metric` to centered large `$X,XXX.XX`
- Canton support card removed
- Quick Action Hub restored (glass-morphic card)
- Hub section added (Assets + Discover tiles)
- Holdings changed from vertical list to horizontal scroll pills
- Recent Activity changed from SectionCard to compact icon list

### How to Revert

Find the old `HomeScreen` in git history and restore it. The old version was approximately lines 234–412 before this change.

The new version starts with:
```tsx
function HomeScreen() {
  const cantonIdentity = useJutisStore((state) => state.cantonIdentity);
  const snapshot = useJutisStore((state) => state.snapshot);
  ...
```

### What to Watch Out For

- If reverting, also revert the Header visibility condition and BottomNav changes
- The old HomeScreen uses `getCantonFeatureEntry()` heavily — if Canton feature matrix is removed, those calls will break
- The old HomeScreen had Canton-specific `SupportBadge` arrays and verbose copy

---

## App.tsx Rollback — FriendScreen

### What Changed

`FriendScreen` component was added:
- Uses `jutisNameService` (from `src/core/services/jutis-name-service.ts`)
- Uses `FriendConnection`, `FriendSearchResult`, `FriendReadiness` (from `src/core/models/social-types.ts`)
- Reads/writes to `chrome.storage.local` via `jutisNameService`

### How to Revert

1. Remove the `FriendScreen` function from App.tsx
2. Remove `"friend"` from the `PopupScreen` type union in `use-jutis-store.ts`
3. Remove the `FriendScreen` render condition:
   ```tsx
   // REMOVE THIS:
   {screen === "friend" ? <FriendScreen /> : null}
   ```
4. Remove `Friend` NavButton from `BottomNav`
5. Revert Header visibility to exclude `"friend"`
6. Delete `src/core/models/social-types.ts`
7. Delete `src/core/services/jutis-name-service.ts`
8. Remove imports:
   ```tsx
   // REMOVE FROM App.tsx imports:
   import { jutisNameService } from "@/core/services/jutis-name-service";
   import type { FriendConnection, FriendReadiness, FriendSearchResult } from "@/core/models/social-types";
   ```

### Risky Changes

- `chrome.storage.local` will still contain `jutis:friends` data after removal — manual cleanup needed if truly removing the feature
- `OverlaySheet` render tree has no changes related to Friend — safe to leave

---

## Riskiest Changes

| Change | Risk | Severity |
|---|---|---|
| HomeScreen rewrite | Could break Canton-specific flows (Swap, Activity rely on home screen context) | Medium |
| `"friend"` in PopupScreen | If other code does screen string comparisons, may break | Low |
| `JutisNameService` storage key | `jutis:friends` in chrome.storage.local — harmless if left | Low |

---

## Structures Recovered from `designed_source/main wallet 3`

| Source Element | App Element | Restoration Method |
|---|---|---|
| Address pill `0x34A...8F2D` | Canton party id pill | New component added to HomeScreen |
| Large centered balance `$3,482.20` | `formatUsdReference()` display | HomeScreen rewritten |
| Quick Action Hub glass card | SectionCard with glass styling | HomeScreen rewritten |
| Send / Receive / Swap 3-col grid | 3-column grid of SecondaryButtons | HomeScreen rewritten |
| Assets tile + Discover tile | 2-column grid of buttons | HomeScreen rewritten |
| Horizontal holdings scroll | Flex row with overflow-x scroll | HomeScreen rewritten |
| Compact activity list with icons | List of buttons with icon divs | HomeScreen rewritten |

---

## Git Rollback Commands

```bash
# Revert App.tsx to previous version
git checkout HEAD~1 -- src/app/popup/App.tsx

# Revert store type
git checkout HEAD~1 -- src/state/use-jutis-store.ts

# Remove new files
rm src/core/models/social-types.ts
rm src/core/services/jutis-name-service.ts
```

---

## Pre-Rollback Checklist

- [ ] Verify HomeScreen Canton-specific features still work after revert (Swap, Activity links)
- [ ] Verify BottomNav still shows correct tabs
- [ ] Verify Header still shows on correct screens
- [ ] Remove `jutis:friends` from chrome.storage.local if truly removing feature
- [ ] Check for any other files that import `social-types.ts` or `jutis-name-service.ts`
