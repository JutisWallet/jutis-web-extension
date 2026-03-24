# Jutis Extension — Canton-Only Transition Plan

*Analysis date: 2026-03-23*
*Popup/output wiring assumed fixed. Strict phase discipline.*

---

## Phase T1: Audit Complete ✅

**Done**: Full codebase audit — CANTON_ONLY_AUDIT.md, CANTON_GAP_MATRIX.md, BASE_DEACTIVATION_IMPACT.md, this document.

**Key findings established**:
- Canton is scaffold-only; Base is the only operational network
- No Canton live partyId derivation exists
- No Canton ledger submission path exists
- No Canton holdings source exists
- Base is deeply embedded in runtime but safely hideable at UI/selection level
- Full Base removal requires Canton live implementations as prerequisites

---

## Phase T2: Hide Base Safely (UI + Selection Lock)

**Goal**: Make Canton the only visible and selectable network without touching runtime logic.

### T2.1 — Remove Base from network switcher

**File**: `src/app/popup/App.tsx`

**Change**: In `Header()`, filter or hide the Base button from the network selector.

```typescript
// Example approach (do not remove the button permanently — hide it)
{networks
  .filter(n => n.id !== "base-mainnet")  // hide Base
  .map((network) => (
    <button key={network.id} ...>
      {network.name}
    </button>
  ))}
```

**Risk**: None. Pure UI.

### T2.2 — Update WelcomeScreen text

**File**: `src/app/popup/App.tsx` — `WelcomeScreen()`

**Change**: Remove "Canton + Base" tagline and "Base live local custody path" chip. Replace with Canton-only messaging.

**Risk**: None.

### T2.3 — Lock selectedNetworkId to Canton

**File**: `src/state/use-jutis-store.ts`

**Change**: In `bootstrap()`, if `payload.preferences.selectedNetworkId === "base-mainnet"`, force to `"canton-mainnet"`:

```typescript
screen: deriveScreen(payload.hasVault, payload.session),
preferences: {
  ...payload.preferences,
  selectedNetworkId: payload.preferences.selectedNetworkId === "base-mainnet"
    ? "canton-mainnet"
    : payload.preferences.selectedNetworkId
}
```

**Risk**: Low — this is a preference override on read, no storage change.

### T2.4 — Change DEFAULT_SWAP_REQUEST to Canton

**File**: `src/state/use-jutis-store.ts`

**Change**:
```typescript
const DEFAULT_SWAP_REQUEST: SwapQuoteRequest = {
  networkId: "canton-mainnet",    // was "base-mainnet"
  fromAssetId: "canton-cc",       // was "base-eth"
  toAssetId: "canton-usdc",       // was "canton-cc"
  amount: "1",
  slippageBps: 50
};
```

**Risk**: Low — Canton swap is already blocked and returns properly.

### T2.5 — Remove Base from host_permissions

**File**: `public/manifest.json`

**Change**: Remove `"https://mainnet.base.org/*"` from `host_permissions`.

**Risk**: None — the permission is only needed when Base RPC is actually called.

### T2.6 — Add feature flag for Canton-only mode

**File**: `src/core/models/fixtures.ts` — `DEFAULT_FEATURE_FLAGS`

**Add**: `cantonOnlyMode: true` — this provides a kill-switch to re-enable Base for debugging without code changes.

**Risk**: Low.

### T2.7 — Update manifest description

**File**: `public/manifest.json`

**Change**: `"description"` from "A protocol-aware extension wallet for Canton and Base." → "A protocol-aware extension wallet for Canton."

**Risk**: None.

**Dependencies**: None. All T2 steps are independent and safe.

---

## Phase T3: Make Canton-First UI Honest

**Goal**: Ensure every Canton UI surface correctly communicates its real state. No fake live claims.

### T3.1 — Audit Canton HomeScreen for misleading "live" claims

**File**: `src/app/popup/App.tsx` — `HomeScreen()`

**Check**:
- When Canton selected, portfolio shows fixture CC balance — ensure no "live" badge appears
- Support badge on Canton assets must show `"reference-only"` or `"partial"`, never `"live"`
- Canton "Quick action" button → should route to Settings or Canton info, not pretend to enable Base send

**Evidence from current code**: Line 290: `{isCantonSelected ? <SupportBadge state={cantonBalances?.supportState ?? "reference-only"} /> : <Chip accent>EVM live path</Chip>}` — Base shows "EVM live path" chip. Remove that chip for Canton-selected state.

### T3.2 — Verify Canton feature matrix is shown by default

**File**: `src/app/popup/App.tsx` — `HomeScreen()`

**Current behavior**: Lines 293-310 show Canton support status card only when `isCantonSelected`. This is correct — ensure it remains and displays accurate states.

**Check**: `cantonBalances?.supportState` shows `"reference-only"`; `cantonSend?.supportState` shows `"partial"` (planning); `cantonReceive?.supportState` shows `"unsupported"`.

### T3.3 — Review swap screen Canton messaging

**File**: `src/app/popup/App.tsx` — `SwapScreen()`

**Current behavior**: Lines 531-544 show Canton swap as `"unsupported"` with correct blocker text. Ensure this remains accurate.

### T3.4 — Settings Canton identity panel

**File**: `src/app/popup/App.tsx` — `SettingsScreen()`

**Current behavior**: Shows partyId, authMode, and capability badges. Shows "Link a live Canton party when validator, wallet-session, or external-party infrastructure is available."

**Action**: Keep exactly as is. This is already honest.

### T3.5 — Remove "EVM live path" chip from Base assets

**File**: `src/app/popup/App.tsx` — `HomeScreen()` line 290

**Change**: When Base is selected (if ever re-enabled via debug), replace `<Chip accent>EVM live path</Chip>` with something that reflects Base's actual state (partial, rate-limited).

**Risk**: Low.

---

## Phase T4: Implement Missing Canton Runtime Capabilities

**Prerequisite**: T2 and T3 must be complete and stable. Canton must be the only network visible.

### T4.1 — Canton Party Identity Linkage

**What**: Create a UI flow and storage mechanism to link a real Canton partyId to the wallet.

**Files to create/modify**:
- `src/core/services/canton-identity-service.ts` — new service to manage partyId linking
- `src/app/popup/Screens/LinkPartyScreen.tsx` — new screen in popup
- `src/storage/vault-repository.ts` — `writeCantonIdentity()` already exists; wire it to the new flow
- `src/app/popup/App.tsx` — add `LinkPartyScreen` to screen navigation

**What "linking" means**:
- User provides a Canton partyId (and optionally auth token, validator URL)
- `CantonIdentity` is stored in `chrome.storage.local`
- `cantonIdentity.partyId !== null` unlocks Canton account display
- `cantonIdentity.authMode !== "mock"` changes Canton support states

**Milestone**: User can link a Canton partyId and see it reflected in Settings and HomeScreen.

### T4.2 — Canton Account Derivation

**What**: Make `CantonWalletAdapter.getAccounts()` return a real account when `cantonIdentity.partyId` is set.

**Current behavior**: Returns `partyId: identity.partyId ?? undefined` — returns undefined if not linked.

**Expected behavior**: Once T4.1 is done, return the linked `partyId` as a proper Canton account.

**Note**: This does NOT derive a partyId from the vault mnemonic. Canton partyId comes from the Canton network topology, not from local derivation. The vault creates a separate Base EVM identity for the EVM path.

### T4.3 — Canton Holdings Read

**What**: Replace `CANTON_DEMO_ASSETS` fixture with a live holdings read from a Canton participant node or validator API.

**Files to modify**:
- `src/adapters/canton/canton-wallet-adapter.ts` — `getAssets()` method
- `src/adapters/canton/services/canton-holdings-service.ts` — new service (optional intermediary)

**API dependency**: Canton participant node gRPC or HTTP API that returns account holdings for the linked `partyId`.

**Milestone**: When a partyId is linked, Canton asset balances show real holdings, not "1240.00 CC".

### T4.4 — Canton Send Submission

**What**: Implement `CantonWalletAdapter.submitSend()` to construct and submit real Canton transfers.

**Files to modify**:
- `src/adapters/canton/canton-wallet-adapter.ts` — replace `throw AdapterCapabilityError` with actual submission
- `src/adapters/canton/services/canton-transfer-service.ts` — new service for Daml command construction
- `src/core/services/session-service.ts` — may need Canton-specific session data

**Dependency**: T4.1 (partyId linked) + T4.3 (holdings visible to check balance) + Canton ledger API access.

**Milestone**: User can send Canton assets to another partyId.

### T4.5 — Canton Activity / History

**What**: Replace `CANTON_DEMO_ACTIVITY` fixture with a live transaction history read.

**Files to modify**:
- `src/adapters/canton/services/canton-activity-indexer.ts` — replace fixture return with live query
- `src/adapters/canton/services/canton-scan-service.ts` — new service for Canton participant/validator query

**API dependency**: Canton scan API or participant node transaction query API.

**Milestone**: Activity screen shows real Canton transaction history.

### T4.6 — Canton Transaction Lifecycle Service

**What**: Create a Canton equivalent to `BaseTransactionLifecycleService` for tracking pending Canton transactions.

**Files to create**:
- `src/adapters/canton/services/canton-transaction-lifecycle-service.ts`
- Storage equivalent: add Canton transaction record type to `vault-repository.ts`

**Dependency**: T4.4 (Canton send must exist to track it).

### T4.7 — Canton Background Reconciliation

**What**: Add Canton branch to `reconcileBackgroundActivity()` and `hasPendingBackgroundActivity()`.

**Files to modify**:
- `src/core/orchestration/jutis-controller.ts` — add Canton transaction reconciliation

**Dependency**: T4.6 (Canton lifecycle service exists).

### T4.8 — Canton Receive Flow

**What**: Verify and display Canton receive instructions for the linked partyId.

**Current behavior**: Shows partyId text or "not linked" — already exists but informational only.

**Expected behavior**: Display Canton-specific receive instructions (party-based, not address-based). QR encoding of Canton reference may be needed.

**Dependency**: T4.1 (partyId linked).

---

## Phase T5: Production Hardening

### T5.1 — CC Live Pricing

**What**: Integrate a Canton Coin (CC) price feed into `UsdReferenceService`.

**Note**: CC is not an ERC-20 on Ethereum — it is a Canton ledger asset. Pricing requires a Canton-specific price source or a market data integration.

### T5.2 — Remove Base Code (after Canton is live)

**Prerequisite**: All T4 items complete and stable; Canton is genuinely operational.

**What**: Full Level 3 deactivation — remove `src/adapters/base/` directory, remove Base from `SwapProviderRegistry`, remove Base from `BUILT_IN_NETWORKS`, rename `baseMnemonic`/`basePrivateKey` fields in `WalletVaultSecret` to something network-agnostic.

**Risk**: High — requires thorough testing to ensure no Canton code paths still reference Base assumptions.

### T5.3 — Canton Identity Verification UI

**What**: Verify that a linked partyId actually exists on the configured Canton topology before enabling send/receive.

### T5.4 — Error Handling for Canton API Failures

**What**: Add graceful degradation for Canton API failures (node unreachable, invalid partyId, etc.) — similar to how Base RPC failures are handled.

---

## Dependency Order

```
T2 (hide Base) ────────────────────────────── Immediate, safe, no dependencies
   │
T3 (make UI honest) ───────────────────────── Immediate, safe, no dependencies
   │
T4.1 (party linkage) ─────────────────────── Entry point for Canton live features
   │
   ├── T4.2 (account display) ─────────────── Depends on T4.1
   │      └── T4.3 (holdings read) ─────────── Depends on T4.2
   │             └── T4.4 (send submission) ─── Depends on T4.3 + T4.1
   │                    └── T4.5 (activity) ─── Depends on T4.1
   │                           └── T4.6 (Canton lifecycle) ── Depends on T4.4
   │                                  └── T4.7 (Canton reconcile) ── Depends on T4.6
   │
   └── T4.8 (receive flow) ─────────────────── Depends on T4.1
           └── T5.1 (CC pricing) ─────────────── Depends on T4.3

T5.2 (remove Base) ───────────────────────── Only after T4.4 + T4.5 stable
T5.3 (identity verification) ─────────────── Depends on T4.1
T5.4 (Canton error handling) ─────────────── Depends on T4.3 + T4.4
```

---

## Risks and Rollback Notes

### T2 Rollback
- If Canton fixture state causes issues, re-enable Base button in Header (single line change)
- Revert `host_permissions` change
- Revert `DEFAULT_SWAP_REQUEST`
- **Rollback risk**: Very low. All changes are additive or read-level.

### T3 Rollback
- If UI changes accidentally hide Canton status, revert the specific text/visibility changes
- **Rollback risk**: Very low.

### T4.x Rollback
- Each T4 step is additive — adding Canton capabilities, not modifying Base
- Rollback = disable the new Canton feature (revert to fixture/default identity)
- **Rollback risk**: Low to medium — depends on how deeply Canton APIs are integrated

### T5.2 (Base removal) Rollback
- **Rollback**: Re-enable Base by restoring the adapter files from git history
- **Rollback risk**: High — by this stage, significant refactoring may have occurred
- **Mitigation**: Do not attempt until Canton is production-stable with real user assets

### Biggest Risk: T4.1 (Party Linkage)
- If the party linkage flow is designed poorly (e.g., accepts any string as partyId), Canton could display a fake account
- **Mitigation**: Validate partyId format, verify against topology before storing, show clear "unverified" state

### Most Dangerous Mistake to Avoid
**Removing Base before Canton has an operational send path.** This would leave the wallet with no operational network — Canton is non-operational, Base is removed. The wallet would be purely a fixture-displaying scaffold with no real actions possible.
