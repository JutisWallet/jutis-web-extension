# Jutis Extension — Canton Holdings Read Gaps (T4.3)

*Post-implementation audit for Canton live holdings read (T4.3).*

---

## What This Phase Solved

| What | Status |
|---|---|
| Live Canton holdings wiring | ✅ Added — `CantonHoldingsService` calls scan API when configured |
| `scanApiUrl` persistence | ✅ Working — stored in `chrome.storage.local` at `jutis:canton-identity` alongside `partyId` |
| Demo fallback when no URL | ✅ Working — returns `CANTON_DEMO_ASSETS` if `scanApiUrl` is undefined |
| Demo fallback on API failure | ✅ Working — catches network errors, logs warning, returns demo fixtures |
| Feature matrix reflects live state | ✅ Updated — balances entry shows `"live"` when `scanApiUrl && partyId` are both set |
| Build verification | ✅ `npm run build` succeeds with no TypeScript errors |

---

## What Remains Blocked

### Canton live holdings still have these gaps:

| Gap | Blocker |
|---|---|
| **No real Canton scan API endpoint** | No known live Canton participant/scan node URL is configured. Service is wired but not connected to a real network. |
| **No Canton authentication** | `CantonHoldingsService` does not attach JWT/Bearer auth headers. Canton participant nodes require valid authentication. |
| **No ACS-aware holdings query** | Canton holdings are derived from Daml ACS. A REST `/accounts` endpoint may not capture the full active contract state. Real integration may need Canton console queries or an indexer. |
| **No USD pricing for live CC/USDC** | Live accounts include `usdValue` assumed pre-computed by scan node. If scan node doesn't provide it, no external price feed is consulted. |
| **No background refresh of holdings** | Holdings are fetched only on explicit refresh. No background polling or caching strategy. |
| **No `ledgerApiUrl` / `validatorApiUrl` wiring** | Only `scanApiUrl` is plumbed through. `ledgerApiUrl` and `validatorApiUrl` remain unused in `CantonIdentity` but are defined in the type. |
| **Send still blocked** | T4.4 (Canton Send Submission) is still needed. Holdings read does not enable ledger submission. |
| **Activity still fixture** | T4.5 (Canton Activity/History) is still needed. Activity returns `CANTON_DEMO_ACTIVITY` regardless of scanApiUrl. |

---

## Why Live Wiring Does NOT Mean Live Balances

**Critical distinction**: `CantonHoldingsService` is wired for live reads, but:

1. **No real endpoint**: The scan API URL entered in LinkPartyScreen is likely a placeholder or unreachable. The 8-second timeout will trigger and fall back to demo fixtures.

2. **No auth headers**: Even if a real Canton participant node URL is available, the request has no authentication. Most Canton APIs require a valid JWT session token.

3. **ACS complexity**: Canton is Daml-based. "Holdings" aren't a simple account balance — they're the aggregate of active `Fungible` contracts a party holds. A single REST endpoint may not correctly compute this.

4. **USD reference**: If `usdValue` is not returned by the scan API, the service has no way to compute USD values for Canton assets.

**Analogy**: Installing a bank ATM card reader doesn't mean you have money in the account — it just means the system is capable of reading your balance when connected to the bank's network.

---

## Exact Next Step After This Phase

### T4.3 (this phase) — COMPLETE ✅

The live holdings read infrastructure is now in place. The next step is:

### T4.4 — Canton Send Submission (Live)

**What**: Replace the `AdapterCapabilityError` thrown by `CantonWalletAdapter.submitSend()` with a real Canton ledger submission call.

**Why after T4.3**: Because send submission needs to:
1. Check that the sender has sufficient holdings (requires `partyId` and `scanApiUrl`)
2. Construct a valid Canton transfer transaction
3. Submit to the Canton ledger via the participant/validator API

**Minimum viable next step**:
1. Add `ledgerApiUrl` to `CantonIdentity` (wiring exists in the type, not yet in the UI)
2. `CantonWalletAdapter.submitSend()` calls `{ledgerApiUrl}/v1/transfers` with the transfer request
3. Use the Canton identity's partyId as the sender
4. On success, return `SubmittedTransaction` with the Canton transaction ID
5. On failure, throw appropriate error with Canton ledger message

**Dependency chain**:
```
Party linkage (T4.1) ✅
     ↓
Holdings read (T4.3) ✅ ← DONE
     ↓
Send submission (T4.4) ← NEXT
     ↓
Activity read (T4.5)
     ↓
Transaction lifecycle (T4.6)
     ↓
Background reconcile (T4.7)
```

---

## Summary

| Question | Answer |
|---|---|
| Is live Canton holdings wiring in place? | Yes — `CantonHoldingsService` calls scan API when configured |
| Does linking a party enable live holdings? | No — requires a real, reachable Canton scan API URL with valid auth |
| Is demo fallback working? | Yes — returns `CANTON_DEMO_ASSETS` when no URL or API unreachable |
| Is `scanApiUrl` persisted across popup close? | Yes — `chrome.storage.local` |
| Is `scanApiUrl` persisted across browser restart? | Yes |
| Does `scanApiUrl` show in UI? | Yes — shown in LinkPartyScreen and Settings when party is linked |
| Does feature matrix reflect live state? | Yes — shows `"live"` when both `partyId` and `scanApiUrl` are set |
| What is the honest state after T4.3? | Infrastructure is wired; without a real Canton scan API URL, holdings remain demo fixtures |
