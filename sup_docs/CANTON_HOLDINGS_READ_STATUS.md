# Jutis Extension — Canton Holdings Read (T4.3) Status

*Post-implementation. Build verified.*

---

## Files Changed

| File | Change |
|---|---|
| `src/app/shared/runtime-types.ts` | Added `scanApiUrl?: string \| null` to `jutis:update-canton-identity` runtime request |
| `src/app/shared/runtime-dispatcher.ts` | Passes `scanApiUrl` through to `writeCantonIdentity()` when linking |
| `src/state/use-jutis-store.ts` | Updated `linkParty(partyId, scanApiUrl?)` to accept and forward optional scanApiUrl |
| `src/app/popup/App.tsx` | `LinkPartyScreen` now has optional "Scan API URL" input; shows current scanApiUrl when party is linked |
| `src/adapters/canton/canton-wallet-adapter.ts` | `getAssets()` now delegates to `CantonHoldingsService` instead of returning fixture directly |
| `src/adapters/canton/services/canton-holdings-service.ts` | **New file** — `CantonHoldingsService` fetches live holdings from configured Canton scan API, falls back to demo fixtures |
| `src/adapters/canton/services/canton-reference-data-service.ts` | Feature matrix "balances" entry now shows `"live"` support state when `scanApiUrl && partyId` are both set |

---

## Storage Path

**Key**: `"jutis:canton-identity"` in `chrome.storage.local`

**Written structure after linking with scanApiUrl**:
```typescript
{
  networkId: "canton-mainnet",
  partyId: "party::test-party-123",
  scanApiUrl: "https://canton-scan.example/participant/one",  // stored if provided
  authMode: "unlinked",
  support: "partial",
  capabilities: DEFAULT_CANTON_CAPABILITIES
}
```

**Without scanApiUrl** (party only):
```typescript
{
  networkId: "canton-mainnet",
  partyId: "party::test-party-123",
  scanApiUrl: undefined,
  authMode: "unlinked",
  support: "partial",
  capabilities: DEFAULT_CANTON_CAPABILITIES
}
```

---

## How Live Holdings Work

### CantonHoldingsService.getAssets(identity)

1. If `!identity.scanApiUrl || !identity.partyId` → returns `CANTON_DEMO_ASSETS` (unchanged behavior)
2. If both are set → calls `GET {scanApiUrl}/api/v1/accounts?party={partyId}` with 8s timeout
3. On success (HTTP 200): normalizes response into `AssetRecord[]` with `trustLevel: "live"`, `sourceType: "market-feed"`
4. On failure (non-200 or network error): falls back to `CANTON_DEMO_ASSETS` with a console.warn

### Expected Canton Scan API Response Shape

```
GET {scanApiUrl}/api/v1/accounts?party={partyId}

Response:
{
  "accounts": [
    {
      "id": "cc-account-1",
      "assetId": "CC",
      "balance": "1240.00",
      "name": "Canton Coin",
      "decimals": 2,
      "usdValue": 1240,
      "instrumentAdmin": "dso::mainnet"
    }
  ]
}
```

**Note**: This is the assumed API shape. The actual Canton participant/scan node HTTP API endpoint may differ. The service uses `GET /api/v1/accounts` — adjust the path if the actual deployment uses a different endpoint.

### Fallback Behavior

| Condition | Result |
|---|---|
| No `scanApiUrl` configured | Demo fixtures returned |
| `scanApiUrl` configured but unreachable | Demo fixtures returned, warning logged |
| API returns non-200 | Demo fixtures returned, warning logged |
| API returns empty accounts | Demo fixtures returned |

---

## UI Changes

### LinkPartyScreen — New Scan API URL Field

When linking a new party, an optional second input field appears below "Party identifier":

```
┌─ Link Canton party ────────────────────────┐
│ A Canton party identifier links this       │
│ wallet to a specific identity...            │
│                                             │
│ Provide a Canton scan API URL to read       │
│ live holdings. Without it, demo balances   │
│ are shown.                                  │
│                                             │
│ ┌ Party identifier ──────────────────────┐ │
│ │ party::1234567890                        │ │
│ └─────────────────────────────────────────┘ │
│ ┌ Scan API URL (optional) ───────────────┐ │
│ │ https://canton-scan.example/participant  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [ Link party ]                              │
│ [ Cancel ]                                  │
└─────────────────────────────────────────────┘
```

When a party is already linked with a scanApiUrl:
```
┌─ Link Canton party ────────────────────────┐
│ ...                                        │
│ ┌─────────────────────────────────────────┐│
│ │ Party: party::test-party-123           ││
│ │ Scan API: https://canton-scan.example/  ││
│ │ Unlink to remove...                     ││
│ └─────────────────────────────────────────┘│
│                                             │
│ [ Unlink party ]  [ Cancel ]               │
└─────────────────────────────────────────────┘
```

---

## Feature Matrix Update

| Feature | Before T4.3 | After T4.3 |
|---|---|---|
| Balances support state | `"reference-only"` (always) | `"live"` when `scanApiUrl && partyId`; `"reference-only"` otherwise |
| Balances source | `CANTON_DEMO_ASSETS` always | Live API when configured, demo otherwise |
| Balances blocker text | "No live Scan, validator..." | Updated to reflect actual state |

---

## Extension Loadability

Build verified: `npm run build` succeeds with no TypeScript errors. `popup.js` increased from ~48KB to ~49KB (LinkPartyScreen grew slightly with new input). `controller.js` increased due to new `CantonHoldingsService` bundle (~377KB).

---

## Known Limitations

1. **No real Canton scan API endpoint**: The `CantonHoldingsService` is wired for live reads, but no actual Canton scan node URL is known. Linking with a placeholder URL will log a warning and fall back to demo fixtures.

2. **No ACS (Active Contract Set) polling**: Canton holdings are derived from active Daml contracts. A single REST call to `/accounts` may not capture the full ACS state. Real integration may require a Canton console query or an indexer that tracks contract state.

3. **No USD pricing for Canton assets**: Live holdings from the scan API include `usdValue` as a raw number. This is assumed to be pre-computed by the scan node. If the scan node does not provide USD conversion, the `usdValue` will be used as-is (no external price feed).

4. **No retry or background refresh**: Holdings are fetched on every `refresh()` call. There is no background polling or caching strategy for live Canton holdings.

5. **Auth not handled**: The `CantonHoldingsService` does not currently attach any auth headers (JWT, Bearer token) to the scan API request. Canton participant nodes typically require a valid JWT. Future work (T4.x — auth mode upgrade) will add this.

6. **scanApiUrl is optional**: Users who don't provide a scanApiUrl see demo balances. There is no prompt or nudge to configure one.
