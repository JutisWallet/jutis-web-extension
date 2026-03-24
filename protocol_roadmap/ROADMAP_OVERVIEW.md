# Jutis Protocol Roadmap — Overview

*What Jutis is built on today, where it needs to go, and the path to a native Jutis protocol.*

---

## Where Jutis Is Today

Jutis is a Canton-focused browser wallet with:
- **Canton identity layer:** Party-based identity linkage (`party::...`) via LinkPartyScreen
- **Canton holdings:** Read via Canton participant/scan API (T4.3)
- **Canton environment diagnostics:** Probe-based verification of validator/scan/ledger endpoints (T4.3-EV)
- **Social/Friend layer:** Local-only @username friend list (current phase)
- **Extension runtime:** MV3 service worker, chrome.storage, session-based vault

---

## What Jutis Depends On

| Component | Dependency | Status |
|---|---|---|
| Canton ledger API | Canton participant node REST API | Partially probed; no confirmed production endpoint |
| Canton name service | @username → partyId resolution | Not implemented |
| Canton social graph | Friend relationships on ledger | Not implemented |
| Jutis own identity | Domain name / @username on Jutis ledger | Not implemented |

---

## Three-Layer Architecture

```
Layer 1: Extension Runtime (NOW)
  chrome.storage.local · MV3 service worker · session vault
  ↕

Layer 2: Canton Protocol (CURRENT)
  Canton ledger · participant node REST API · party identity
  ↕

Layer 3: Jutis Native Protocol (FUTURE)
  Jutis name service · social graph · custom ledger contracts
```

Jutis today lives across Layer 1 and Layer 2. The goal is to evolve Layer 3
without abandoning the Canton foundation underneath.

---

## Roadmap Phases

### Phase 1 — Foundation (COMPLETE)
- Vault, session, bootstrap
- Canton identity linkage
- Canton holdings read
- Environment diagnostics
- Local friend list

### Phase 2 — Canton Integration (BLOCKED)
- Confirmed Canton ledger API
- Live holdings reads
- Activity/history integration
- Send submission

### Phase 3 — Social Identity (CURRENT PHASE)
- @username / friend UI
- JutisNameService adapter layer
- Local friend storage

### Phase 4 — Jutis Native Protocol (FUTURE)
- Jutis ledger contract for @username registration
- Canton-party → JutisHandle mapping
- Friend graph on Jutis ledger
- Social features beyond local list

---

## Key Open Questions

1. Will Jutis use Canton as its only ledger, or will it deploy its own?
2. Should @username registration happen on the Canton ledger or a Jutis-specific ledger?
3. Can the Canton participant node expose a name service, or must Jutis deploy its own?
4. Is there a plans to use Splice's name resolution, or build something new?
