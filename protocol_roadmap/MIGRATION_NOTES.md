# Jutis Name Service — Migration Notes

*How to migrate from the current local/mock JutisNameService to a Canton-backed Jutis protocol.*

---

## Current State

| Component | Implementation |
|---|---|
| Storage | `chrome.storage.local` (key: `jutis:friends`) |
| Resolver | None — local substring match only |
| Handle type | `JutisHandle` with handle, displayName, partyId, avatarUrl, bio, addedAt |
| Search | `JutisNameService.searchFriends()` — local storage scan |
| Friend list | `JutisNameService.listFriends()` — from local storage |

**No Canton ledger is involved.**

---

## Target State

| Component | Implementation |
|---|---|
| Storage | Canton ledger (Daml contracts) + optional local cache |
| Resolver | Canton participant node REST API |
| Handle type | `JutisHandle` (same type, same fields) |
| Search | `JutisNameService.searchFriends()` — delegates to CantonNameResolver |
| Friend list | `FriendConnection` Daml contracts on Canton ledger |

---

## Migration Stages

### Stage 1 — Add Resolver Adapter (Non-Breaking)

```typescript
class JutisNameService {
  private resolver: NameResolver; // injected, default: LocalNameResolver

  async searchFriends(query: string): Promise<FriendSearchResult[]> {
    // Try resolver first, fall back to local
    if (this.resolver) {
      const results = await this.resolver.search(query);
      if (results.length > 0) return results;
    }
    return this.localSearch(query);
  }
}
```

**What this does:** Local storage still works; resolver is additive

### Stage 2 — Mirror to Ledger (Opt-In)

When a user adds a friend locally, also create a `FriendConnection` Daml contract on Canton:

```typescript
async addFriend(handle: JutisHandle): Promise<void> {
  // 1. Save locally (still works)
  await this.localAdd(handle);

  // 2. If Canton connected, create ledger contract
  if (this.cantonConnected) {
    await this.cantonLedger.createFriendConnection({
      partyA: myPartyId,
      partyB: resolveToPartyId(handle.handle),
      handleA: myHandle,
      handleB: handle.handle
    });
  }
}
```

**What this does:** Friends list is backed up to Canton; no breaking change

### Stage 3 — Switch to Ledger-Primary (Breaking Change)

Flip the priority: ledger is the source of truth, local is cache:

```typescript
async listFriends(): Promise<FriendConnection[]> {
  if (this.cantonConnected) {
    const ledgerFriends = await this.cantonLedger.listFriendConnections(myPartyId);
    await this.localSync(ledgerFriends); // refresh local cache
    return ledgerFriends;
  }
  return this.localLoad(); // fallback only
}
```

**What this does:** Ledger becomes primary; local fallback still works offline

### Stage 4 — Drop Local Fallback (Full Migration)

When Canton connectivity is consistently available, remove local-only code paths.

---

## What to Replace When Migrating

| Replace This | With This |
|---|---|
| `LocalNameResolver` class | `CantonNameResolver` class implementing `NameResolver` interface |
| `chrome.storage.local` friend storage | Canton ledger `FriendConnection` contracts |
| `JutisHandle.addedAt` (client timestamp) | `connectedAt` from ledger contract metadata |
| Local substring search | Canton ledger query by handle index |

---

## Risks and Compatibility Concerns

| Risk | Mitigation |
|---|---|
| Canton ledger unavailable (offline) | Keep local cache as fallback during migration |
| Handle uniqueness not enforced locally | Canton ledger template enforces unique handle keys |
| User has friends added before ledger sync | Stage 2 retroactively mirrors all local friends to ledger |
| Migration requires user action | Transparent — `JutisNameService` handles both transparently |
| Multiple Jutis instances (same handle) | Canton ledger `key` enforces uniqueness; duplicate rejected |

---

## Compatibility Summary

| Phase | Local | Ledger | UX Impact |
|---|---|---|---|
| Current | ✅ Primary | ❌ None | Works offline |
| Stage 1 | ✅ Fallback | ⚠️ Added | No UX change |
| Stage 2 | ✅ Backup | ⚠️ Mirror | No UX change |
| Stage 3 | ⚠️ Cache | ✅ Primary | Offline degraded |
| Stage 4 | ❌ Removed | ✅ Only | Ledger required |
