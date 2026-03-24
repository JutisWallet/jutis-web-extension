# Jutis Extension — Friend Feature Integration (Phase: Social Identity)

*Friend screen structure, bottom-nav integration, handle search flow, capability states.*

---

## Friend Screen Structure

**Screen name:** `friend` (PopupScreen type)
**Navigation:** Bottom nav bar, between Swap and Settings
**Route:** Settings → bottom nav → Friend tab

### Screen Sections

1. **Friend search** — `@username` search input with Find button
2. **Search results** — list of found handles (when results exist)
3. **Friends list** — all added friends with remove action

### UI Layout

```
┌─────────────────────────────────┐
│  @username  [Find]             │  ← Search section
│  [reference-only badge]         │
├─────────────────────────────────┤
│  Search results                 │
│  @alice         [Add]          │
│  @bob           [Add]          │
├─────────────────────────────────┤
│  Friends                        │
│  @alice         [Remove]       │
│  @carol         [Remove]       │
│  No friends added yet.          │  ← Empty state
│  Search @usernames above.        │
└─────────────────────────────────┘
```

---

## Bottom Navigation Integration

**NavButton added:** Friend (between Swap and Settings)

```tsx
<NavButton active={screen === "friend"} onClick={() => setScreen("friend")}>
  Friend
</NavButton>
```

**Screen visibility condition updated:**
```tsx
// Friend screen shows header + bottom nav (same as home/activity/swap/settings)
{screen === "home" || screen === "activity" || screen === "swap" || screen === "friend" || screen === "settings" ? <Header /> : null}
```

---

## Handle Search Flow

```
User types @username
       ↓
Clicks "Find"
       ↓
jutisNameService.searchFriends(query)
       ↓
Local substring match against stored friends
       (Future: delegate to CantonNameResolver adapter)
       ↓
Results displayed as FriendSearchResult[]
       with state: "reference-only"
```

---

## Add Friend Flow

```
User clicks "Add" on a search result
       ↓
jutisNameService.addFriend({ handle, displayName })
       ↓
Stored in chrome.storage.local as JutisHandle[]
       (Future: confirm with live Canton name service)
       ↓
Friends list refreshed
       Search results cleared
```

---

## Remove Friend Flow

```
User clicks "Remove" on a friend
       ↓
jutisNameService.removeFriend(handle)
       ↓
Removed from chrome.storage.local
       ↓
Friends list refreshed
```

---

## Capability State

| State | Meaning |
|---|---|
| `live` | Real Canton @name resolver confirmed and connected |
| `reference-only` | Local/mock list only — no live resolver |
| `partial` | Partial resolver available (future) |
| `unsupported` | Feature not available |

Current implementation: **all results are `reference-only`**

---

## What Is Real vs Scaffolded

| Feature | Status | Notes |
|---|---|---|
| @username search | Scaffolded | Local-only substring match; no live resolver |
| Add friend | Scaffolded | Stored in chrome.storage.local only |
| Remove friend | Real (local) | Removes from local storage |
| Friends list | Scaffolded | Read from local storage only |
| Live Canton name resolution | Not implemented | No confirmed Canton name service endpoint |
| Canton party-to-handle mapping | Not implemented | No confirmed resolver endpoint |

---

## Files Added

| File | Purpose |
|---|---|
| `src/core/models/social-types.ts` | `JutisHandle`, `FriendSearchResult`, `FriendConnection`, `FriendReadiness` types |
| `src/core/services/jutis-name-service.ts` | `JutisNameService` with local storage backend; plug-in point for real resolver |

## Files Changed

| File | Change |
|---|---|
| `src/state/use-jutis-store.ts` | Added `"friend"` to `PopupScreen` type union |
| `src/app/popup/App.tsx` | Added `FriendScreen` component; added to render tree; added NavButton for Friend; updated header/nav visibility condition |

---

## UI Honest Labels Used

- "No live name resolver configured" — in readiness blockers
- "Found in local friend list. Live resolution unavailable." — on search results
- `SupportBadge state="reference-only"` — on all friend entries
