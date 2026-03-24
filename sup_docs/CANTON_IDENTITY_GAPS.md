# Jutis Extension — Canton Identity Gaps

*Post-implementation audit.*

---

## What This Phase Solved

| What | Status |
|---|---|
| Party ID input UI | ✅ Added — `LinkPartyScreen` with input, save, cancel, unlink |
| Party ID persistence | ✅ Working — stored at `jutis:canton-identity` in chrome.storage.local |
| Unlink / clear flow | ✅ Working — resets to `DEFAULT_CANTON_IDENTITY` |
| Settings status display | ✅ Updated — "Link party" / "Change party" button reflects linked state |
| Receive screen with party | ✅ Updated — `getReceiveInfo()` uses `account.partyId` from linked identity |
| Account display with party | ✅ Updated — `CantonWalletAdapter.getAccounts()` shows party id when linked |
| Bootstrap/restore on reopen | ✅ Working — `readCantonIdentity()` restores linked party from storage |
| Validation (empty input) | ✅ Added — trims whitespace, rejects empty string |
| Error handling | ✅ Added — error banner on failure, store error state |

---

## What Remains Blocked

### Canton live capabilities still require:

| Capability | Blocker |
|---|---|
| **Live Canton holdings** | `CantonWalletAdapter.getAssets()` still returns `CANTON_DEMO_ASSETS` fixture. No live Scan/validator/participant node API call. Party linkage enables the account, but not the balance. |
| **Live Canton activity** | `CantonActivityIndexer.list()` still returns `CANTON_DEMO_ACTIVITY` fixture. Party linkage doesn't trigger live history fetch. |
| **Live Canton send submission** | `CantonWalletAdapter.submitSend()` still throws `AdapterCapabilityError`. Party linkage doesn't enable ledger submission. |
| **Live Canton swap** | `CantonSwapAdapter` still throws. No CC pricing or settlement path. |
| **Ledger verification** | No `validatorApiUrl`, `ledgerApiUrl`, or `scanApiUrl` configured. Party id is stored without verifying it exists on any Canton network. |
| **Auth mode upgrade** | Party is stored with `authMode: "unlinked"`. No path to upgrade to `"validator-jwt"`, `"wallet-session"`, or `"external-party"`. |
| **Party ID format validation** | No format check. Any non-empty string is accepted. |
| **Topology URL configuration** | No UI to configure `validatorApiUrl`, `ledgerApiUrl`, `scanApiUrl`. These remain `undefined` in the stored identity. |

---

## Why Linked Identity Still Does NOT Mean Live Canton Wallet

**Critical distinction**: `partyId` is now stored, but the following are still fixture/demo:

1. **Balances**: HomeScreen still shows "1240.00 CC" and "500.00 USDC" from `CANTON_DEMO_ASSETS`. Linking a party does not fetch real Canton holdings.

2. **Activity**: Still shows two fixture entries from `CANTON_DEMO_ACTIVITY`. Linking a party does not trigger a Canton scan API call.

3. **Send**: Submit button still shows "Live transfer unavailable" and is disabled. Party linkage does not enable ledger submission.

4. **Receive**: Shows the party id correctly in the receive overlay — this part works. But it is informational only; there is no live verification that this party can receive.

5. **Support state**: `support` remains `"partial"` even after linking. The Canton feature matrix still shows `reference-only` for balances and activity, `partial` for send, `unsupported` for swap.

**Analogy**: Adding a partyId is like adding a username to a profile — it gives the system something to call you, but doesn't give you money in your account or enable any actions.

---

## Exact Next Step After This Phase

### T4.1 (from CANTON_ONLY_TRANSITION_PLAN.md) is already complete ✅

This phase IS T4.1 — Canton Party Identity Linkage. The next step is:

### T4.3 — Canton Holdings Read (Live)

**What**: Replace `CANTON_DEMO_ASSETS` fixture with a live holdings read from a Canton participant node or validator API.

**Why after party linkage**: Because a real Canton holdings read requires a `partyId` to query against. Now that partyId is storable and restorable, the next work can use it.

**Minimum viable next step**:
1. Define a Canton holdings API endpoint (participant node HTTP or gRPC)
2. Store `validatorApiUrl` or `scanApiUrl` in `CantonIdentity` (alongside partyId)
3. `CantonWalletAdapter.getAssets()` calls that API with the `partyId`
4. Return real `AssetRecord[]` instead of `CANTON_DEMO_ASSETS`

**Dependency chain**:
```
Party linkage (T4.1) ✅
     ↓
Holdings read (T4.3) ← NEXT
     ↓
Send submission (T4.4) ← requires holdings (to check balance)
     ↓
Activity read (T4.5) ← requires partyId + scanApiUrl
     ↓
Transaction lifecycle (T4.6)
     ↓
Background reconcile (T4.7)
```

---

## Summary

| Question | Answer |
|---|---|
| Is a linked party shown in UI? | Yes — Receive overlay, Settings, HomeScreen Canton card |
| Is party persisted across popup close? | Yes — chrome.storage.local |
| Is party persisted across browser restart? | Yes — chrome.storage.local |
| Does linking enable live Canton balances? | No — still fixture data |
| Does linking enable Canton send? | No — still blocked with "Live transfer unavailable" |
| Does linking enable Canton activity? | No — still fixture data |
| Does linking enable Canton swap? | No — still unsupported |
| What is the honest state after linking? | Party is linked and visible in UI; all Canton features remain fixture/demo/unsupported |
