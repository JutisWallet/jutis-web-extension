# Jutis Extension — Jutis Name Integration Plan

*What ready-made foundation was adopted, how it was wrapped, and what remains replaceable.*

---

## Foundation Decision

**Decision: Build from scratch (local storage + service adapter pattern) — no existing ready-made @name/friend library was found in the repository.**

After inspecting the codebase:
- No existing handle/username resolution library was found
- No identity mapping or social graph service exists
- No canton-specific name service was implemented

**Rationale for building locally rather than adopting an external library:**
- An external library would create a hard dependency on a third-party identity schema
- Jutis's social identity needs are minimal at this stage: local friend list + @username search
- A clean adapter/service boundary makes it trivial to replace the backend later
- The scope (local friend management) does not warrant引入 a third-party social graph

---

## How It Was Wrapped Inside Jutis-Owned Interfaces

All social types use Jutis-owned naming, not external library naming:

```
JutisHandle           — not "UserProfile" or "IdentityRecord"
JutisNameService      — not "ThirdPartyNameService"
FriendSearchResult    — not "SearchResponse"
FriendConnection      — not "Contact"
FriendReadiness       — not "CapabilityReport"
```

### Type Mapping (External → Jutis)

| Concept | External (if any) | Jutis Type |
|---|---|---|
| Resolved identity | Any | `JutisHandle` |
| Search result | Any | `FriendSearchResult` |
| Confirmed connection | Any | `FriendConnection` |
| Capability report | Any | `FriendReadiness` |

---

## How the Resolver Is Pluggable

The `JutisNameService.resolveHandle()` and `searchFriends()` methods are the plug points:

```typescript
// Current implementation (LOCAL only):
async searchFriends(query: string): Promise<FriendSearchResult[]> {
  const friends = await this.loadFriends();
  // Local substring match...
}

// Future: inject CantonNameResolver
async searchFriends(query: string): Promise<FriendSearchResult[]> {
  const results = await this.cantonNameResolver.search(query);  // when available
  return results.map(toJutisFriendSearchResult);
}
```

**To add a real Canton name resolver:**
1. Implement `CantonNameResolver` with `resolveHandle(handle)` and `search(query)` methods
2. Inject it into `JutisNameService` via constructor or setter
3. Update `getReadiness()` to reflect `canSearch: true` when resolver is injected

---

## What Is Currently Local/Mock

| Feature | Implementation |
|---|---|
| Friend list storage | `chrome.storage.local` under `jutis:friends` |
| @username search | Local substring match against stored handles |
| Handle resolution | Local lookup in stored friends |
| Friend count | Count of locally stored friends |
| Add friend | Append to local storage |
| Remove friend | Filter from local storage |

---

## What Is Future Canton-Backed

| Feature | Required Next Step |
|---|---|
| Live @username resolution | Confirm Canton name service endpoint; inject resolver |
| Handle-to-party mapping | Canton ledger query for registered handles |
| Social graph sync | Canton Daml contract for friend relationships |
| Handle registration | Canton ledger submit for registering a @username |

---

## JutisOwned Interface Boundaries

```
┌─────────────────────────────────────┐
│  FriendScreen (React UI)            │
│  - reads FriendReadiness           │
│  - calls jutisNameService methods   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  JutisNameService                   │
│  - owns JutisHandle, FriendConnection│
│  - wraps resolver adapter           │
│  - chrome.storage.local persistence │
└──────────────┬──────────────────────┘
               │ (resolver adapter — pluggable)
┌──────────────▼──────────────────────┐
│  CantonNameResolver (future)         │
│  - resolveHandle()                   │
│  - searchFriends()                   │
│  - Canton ledger / name contract     │
└─────────────────────────────────────┘
```

---

## Next Steps to Enable Live Resolution

1. **Confirm endpoint:** Identify the Canton/Splice name service REST endpoint
2. **Implement resolver:** Create `CantonNameResolver` class
3. **Inject resolver:** Pass resolver instance to `JutisNameService`
4. **Update readiness:** Change `canSearch: true` when resolver is live
5. **Persist handles:** Optionally store resolved handles in Canton ledger as a Daml contract
