# Jutis Native Protocol Path

*How Jutis can evolve from Canton-integrated wallet into a Canton-backed wallet with its own social identity protocol.*

---

## Why Jutis Needs Its Own Protocol

Canton provides:
- A privacy-preserving blockchain ledger
- Party-based identity (party::...)
- Transfer submission and smart contracts

Canton does NOT provide:
- Human-readable @username / handle identity
- Social graph (friend relationships, follows, etc.)
- Display name and profile metadata
- A name service (DNS for Canton parties)

Jutis's differentiated value is the **social identity layer** on top of Canton.
This layer requires its own protocol.

---

## What a Jutis Native Protocol Would Provide

| Feature | Description |
|---|---|
| `@username` registration | Register a human-readable handle on the Jutis ledger |
| Handle → partyId resolution | Resolve a @username to a Canton party identifier |
| Display profile | Store display name, avatar, bio on ledger |
| Social graph | Follow/ friend relationships as Daml contracts |
| Permissioned reveal | Share partyId with specific friends only |

---

## Two Options for the @username Ledger

### Option A: Jutis Ledger (New)

Deploy a dedicated Canton participant node for Jutis-specific contracts:
- Jutis ledger runs a set of Daml templates for name registration and social graph
- Jutis ledger and the user's main Canton ledger are separate participant nodes
- User needs two party identities: one for the main ledger, one for the Jutis ledger

**Pros:** Full control; clean separation
**Cons:** User onboarding complexity; two party identities

### Option B: Jutis Contracts on Main Canton Ledger

Deploy Jutis Daml templates on the same Canton ledger as everything else:
- A `JutisName` contract template registered on the Canton ledger
- A `FriendRequest` / `FriendConnection` contract template
- The user's Canton party identity is used for both Canton and Jutis features

**Pros:** Single party identity; simpler UX
**Cons:** Jutis contracts mixed with application contracts

**Recommendation: Option B** — simpler onboarding; aligns with Jutis's identity continuity goal

---

## Proposed Daml Contract Templates

```daml
template JutisHandle
  with
    handle : Text  -- e.g., "@alice"
    displayName : Text
    avatarUrl : Optional Text
    bio : Optional Text
    owner : Party
    registeredAt : Time
  where
    signatory owner
    key handle : Text
    maintainer key

template FriendRequest
  with
    requester : Party
    recipientHandle : Text
    status : Text  -- "pending" | "accepted" | "rejected"
  where
    signatory requester

template FriendConnection
  with
    partyA : Party
    partyB : Party
    handleA : Text
    handleB : Text
    connectedAt : Time
  where
    signatory partyA, partyB
```

---

## Resolution Flow (Future)

```
User searches "@alice" in Friend tab
       ↓
Jutis queries Jutis ledger:
  GET /v0/contracts/JutisHandle where handle = "@alice"
       ↓
Returns JutisHandle contract:
  { handle: "@alice", displayName: "Alice", owner: party::123 }
       ↓
If alice's owner partyId matches a Canton party on the network:
  Show as Canton friend (can send CC)
If not on Canton network:
  Show as Jutis-only contact (can send Jutis messages later)
```

---

## Migration Notes

See `MIGRATION_NOTES.md` for details on migrating from the current
local/mock name service to the Canton-backed Jutis protocol.
