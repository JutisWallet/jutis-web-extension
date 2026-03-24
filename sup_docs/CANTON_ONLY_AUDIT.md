# Jutis Extension — Canton-Only Transition Audit

*Analysis date: 2026-03-23*
*Popup/output wiring assumed fixed. Strict evidence-based audit.*

---

## Executive Summary

Jutis has a Canton-primary product direction but Canton is not operational as a live wallet. Base is more operational at every layer of the stack — it has real account derivation, real balance fetching via RPC, real send submission, and a real transaction lifecycle. Canton has fixture data, stubbed adapters, and no party identity wiring.

The codebase is structurally Canton-ready in its abstractions (types, store, controller branching, UI labels, support-state vocabulary) but Canton itself is not implemented at the runtime level. Calling Jutis a "Canton wallet" today would be inaccurate.

---

## Current Product Reality

### What the UI says
- Extension name: "Jutis Wallet"
- Tagline: "Build your secure multi-network wallet"
- WelcomeScreen: "Canton + Base"
- Network switcher in header: Canton button, Base button
- HomeScreen for Canton: "Canton support status" card showing Canton feature matrix
- Send overlay for Canton: "Canton transfer planning" with "Live transfer unavailable" button
- Receive overlay for Canton: "Canton receive status" showing party ID or "not linked"
- Swap overlay: Both Canton and Base shown with readiness states

### What is actually operational

| Function | Canton | Base |
|---|---|---|
| Vault creation | ✅ (creates Base mnemonic) | ✅ (same flow) |
| Vault unlock | ✅ | ✅ |
| Account derivation | ❌ (returns `partyId: null` or stored stub) | ✅ (real EVM address from mnemonic) |
| Asset balance | ❌ (CANTON_DEMO_ASSETS fixture) | ✅ (live RPC) |
| Send submission | ❌ (throws AdapterCapabilityError) | ✅ (wallet.sendTransaction) |
| Receive address | ❌ (no live party linked) | ✅ (QR + address) |
| Activity | ❌ (CANTON_DEMO_ACTIVITY fixture) | ✅ (tracked sent txs) |
| Swap | ❌ (throws, no live path) | ⚠️ (stub only) |

---

## Is Jutis a Real Canton Wallet Today?

**No. Definitively not.**

Evidence:
1. `CantonWalletAdapter.getAccounts()` — returns `partyId: null` from `DEFAULT_CANTON_IDENTITY` unless explicitly linked. There is no party derivation from vault secret.
2. `DEFAULT_CANTON_IDENTITY` — `partyId: null`, `authMode: "mock"`, `support: "partial"`. No live Canton topology exists.
3. `CantonWalletAdapter.submitSend()` — throws: *"Canton transfer submission is intentionally blocked until a live signer and ledger topology are configured."*
4. `CantonSwapAdapter.quote()` — throws: *"Canton swap quoting is disabled for canton-mainnet until a live quote and settlement path are configured."*
5. `CantonActivityIndexer.list()` — returns `CANTON_DEMO_ACTIVITY` fixture only.
6. `CantonReferenceDataService` — explicitly documents for every feature: "reference-only", "unsupported", or "no live [X] is configured."

What Canton has: scaffold, abstractions, type definitions, UI surfaces, feature matrix, and fixture data. These are real foundations, not fake capabilities. But the live execution path is entirely Base.

---

## Top Blockers to Canton-Only Launch

### P0 — Cannot ship

**No Canton party identity derivation.** The vault creates a BIP-39 mnemonic that produces a Base EVM address. There is no path from this secret to a Canton partyId. The `WalletVaultSecret` type only holds `baseMnemonic` or `basePrivateKey`. A Canton wallet requires a Canton partyId, which this vault cannot produce.

**No Canton ledger submission path.** `CantonWalletAdapter.submitSend()` throws unconditionally. Even if a partyId existed, there is no Canton signer, no ledger API endpoint, and no transaction construction for Canton's Daml-based ledger model.

**No Canton holdings source.** `getAssets()` returns `CANTON_DEMO_ASSETS` — hardcoded fixture data (`"1240.00 CC"`, `"500.00 USDC"`). A Canton wallet needs a live holdings read from a Canton node, participant, or validator API.

**No Canton activity source.** `CantonActivityIndexer.list()` returns `CANTON_DEMO_ACTIVITY` — two fixture entries. No path to real Canton transaction history.

### P1 — Must implement before production

**No Canton identity linking flow.** `DEFAULT_CANTON_IDENTITY` is stored at bootstrap. There is no UI or runtime path to attach a real `partyId`, `authMode`, `validatorApiUrl`, `ledgerApiUrl`, or `scanApiUrl`.

**No Canton network configuration in registry.** `BUILT_IN_NETWORKS` has Canton with `kind: "canton"` but no Canton-specific topology URLs. Compare to Base which has `rpcUrl: "https://mainnet.base.org"` and `chainId: 8453`. Canton has `explorerUrl: "https://sync.global/"` but no API endpoint.

**No Canton-specific storage for pending transactions.** `BaseTrackedTransactionRecord` and `jutis:base-transactions` have no Canton equivalent. Background reconciliation only handles Base (`reconcileBackgroundActivity` → `baseActivityIndexer.reconcilePendingTransactions()`).

**No live Canton pricing.** `UsdReferenceService` uses static $3,420/ETH. There is no Canton Coin (CC) price source. The `CANTON_DEMO_ASSETS` use `trustLevel: "demo"` references.

---

## A. Base-Coupled Runtime Paths

These flows assume Base is available and would break if Base were simply removed:

**`src/core/orchestration/jutis-controller.ts`**:
- `loadPortfolio()` — always calls `this.baseAdapter.getAccounts()`, `this.baseAdapter.getAssets()`, `this.baseActivityIndexer.list(baseAccounts)` in parallel with Canton calls. Removing Base would break portfolio load.
- `previewSend()` — branches `if (draft.networkId === "base-mainnet")` → `baseAdapter.getSendPreview()`. Missing Base would throw.
- `submitSend()` — branches `if (draft.networkId === "base-mainnet")` → `baseTransactionService.submit()`. Missing Base would throw.
- `reconcileBackgroundActivity()` — calls only `baseActivityIndexer.reconcilePendingTransactions()`. No Canton equivalent exists.
- `hasPendingBackgroundActivity()` — calls only `baseActivityIndexer.hasPendingTransactions()`. No Canton equivalent exists.
- `getSupportNotes()` — branches `if (networkId === "base-mainnet")` → `baseAdapter.getSupportNotes()`. Missing Base adapter would throw.

**`src/core/models/types.ts`**:
- `WalletVaultSecret` — field names are `baseMnemonic` and `basePrivateKey`. These are the vault's secret material for Base EVM derivation. While Canton does not use these fields, renaming them would require updating every usage site.
- `BaseTrackedTransactionRecord` extends `ActivityRecord` with Base-specific fields (`hash: 0x...`, `accountAddress: 0x...`, `submittedAt`). No Canton equivalent type exists.

**`src/storage/vault-repository.ts`**:
- `readBaseTransactions()` / `writeBaseTransactions()` — storage keys for Base pending transaction records. `reconcileBackgroundActivity()` depends on this. No Canton transaction storage exists.

**`src/app/shared/runtime-dispatcher.ts`**:
- `refresh` handler calls `controller.loadPortfolio()` which always fetches Base accounts/assets. No conditional.

**`src/adapters/base/services/base-transaction-lifecycle-service.ts`**:
- `reconcilePendingTransactions()` is the only transaction reconciliation implementation in the codebase.
- `BaseTrackedTransactionRecord` type used throughout. Canton has no equivalent record type.

**`src/core/models/fixtures.ts`**:
- `base-mainnet` network config with `rpcUrl: "https://mainnet.base.org"`, `chainId: 8453`.
- `DEFAULT_SWAP_REQUEST` uses `networkId: "base-mainnet"`, `fromAssetId: "base-eth"`, `toAssetId: "canton-cc"`.

**`public/manifest.json`**:
- `host_permissions: ["https://mainnet.base.org/*"]` — Base RPC URL permission. Only network-specific permission in the manifest.

**`src/state/use-jutis-store.ts`**:
- `DEFAULT_SWAP_REQUEST` hardcodes `networkId: "base-mainnet"` and Base asset IDs.

---

## B. Canton Existing Foundation

These abstractions are genuinely prepared for Canton:

**Types** (`src/core/models/types.ts`):
- `NetworkKind: "canton" | "evm"` — Canton kind exists
- `CantonIdentity` interface with `partyId`, `authMode`, `scanApiUrl`, `validatorApiUrl`, `ledgerApiUrl`, `CantonCapabilities`
- `CantonCapabilities: { canReadHoldings, canReadActivity, canPrepareTransfers, canSubmitTransfers, canQuoteSwaps, canExecuteSwaps, canResolveNames }`
- `CantonFeatureMatrixEntry` type for capability gating UI
- `WalletNetworkAdapter` interface implemented by both Canton and Base adapters

**Controller branching** (`jutis-controller.ts`):
- `loadPortfolio()` calls both Canton and Base adapters in parallel — correct dual-network aggregation
- `previewSend()` / `submitSend()` branch correctly on `networkId` for both Canton and Base
- `getReceiveInfo()` branches: `account.networkId === "base-mainnet"` → Base, else Canton
- `getSwapReadiness()` / `getSwapQuotes()` route through `quoteEngine` which has Canton adapter registered

**Store** (`use-jutis-store.ts`):
- `DEFAULT_SEND_DRAFT: { networkId: "canton-mainnet", assetId: "canton-cc" }` — Canton default
- `cantonIdentity` stored and passed through the full bootstrap/refresh chain
- `cantonBalances`, `cantonReceive`, `cantonSend`, `cantonSwap` feature matrix queries in HomeScreen
- `deriveScreen()` uses Canton-primary logic

**UI surfaces** (`App.tsx`):
- HomeScreen shows Canton feature matrix (`getCantonFeatureEntry()` calls) with support states
- Canton send overlay: "Canton transfer planning" + "Live transfer unavailable" button (correctly disabled)
- Canton receive overlay: party info or "not linked" state
- Settings screen: Canton identity management panel showing partyId, authMode, capability badges
- Activity screen: Canton-specific support-state annotations
- `isCantonSelected` used throughout to conditionally render Canton-specific content

**Support state vocabulary**:
- `ProductSupportState: "live" | "partial" | "reference-only" | "unsupported"` — used by Canton feature matrix
- `AdapterSupportLevel: "real" | "partial" | "mocked" | "unsupported"` — used by CantonIdentity support
- `CantonReferenceDataService.getFeatureMatrix()` — returns structured Canton capability entries with blocker descriptions and next steps

**Session/vault layer**:
- Vault creation uses `Wallet.createRandom()` (ethers) — produces BIP-39 mnemonic
- Session stored in `chrome.storage.session` — network-agnostic
- Canton identity persisted separately in `chrome.storage.local` via `jutis:canton-identity`
- Preferences (`selectedNetworkId`, `showMockData`, etc.) stored persistently

**Background service worker**:
- `chrome.runtime.onMessage` routes all requests through `executeRuntimeRequest` — no Base assumption at this layer
- `chrome.alarms` for auto-lock — network-agnostic
- `onStartup` locks session — network-agnostic

---

## C. Canton Missing Live Requirements

### Ledger endpoint / topology requirements

**Missing**: No Canton ledger API URL in `CantonIdentity` is populated at runtime. The `DEFAULT_CANTON_IDENTITY` has all topology URLs as `undefined`. Even if a user manually linked a partyId, there is no `ledgerApiUrl` to submit to.

**Evidence**: `src/core/models/fixtures.ts:DEFAULT_CANTON_IDENTITY` — all Canton API URLs are absent.

**What is needed**: A Canton ledger node gRPC endpoint, Daml session management, and transaction submission API client.

### Party identity requirements

**Missing**: No path from vault secret (BIP-39 mnemonic) to Canton partyId. The vault creates Base EVM key material. There is no derivation to a Canton party identifier.

**Evidence**: `CantonWalletAdapter.getAccounts()` — returns `partyId: identity.partyId ?? undefined`. `DEFAULT_CANTON_IDENTITY.partyId: null`. No derivation logic exists.

**What is needed**: Either (a) a separate Canton identity creation/import flow that produces a partyId, or (b) an external Canton wallet integration that provides a partyId.

### Signing model requirements

**Missing**: No Canton transaction signer. Base uses `Wallet.fromPhrase(privateKey).connect(provider)` — standard EVM signing. Canton uses Daml model with specific authorization gates. No signer service exists.

**Evidence**: `CantonWalletAdapter.submitSend()` — throws unconditionally: *"Canton transfer submission is intentionally blocked until a live signer and ledger topology are configured."*

**What is needed**: A Canton signing service (likely involving Daml ledger authentication, participant node authorization, and transaction submission via gRPC or HTTP).

### Transfer flow requirements

**Missing**: No Canton `TransferService` equivalent to `BaseTransactionService`. No transaction construction for Canton-specific transfer types (which are Daml commands, not EVM transactions).

**Evidence**: `CantonWalletAdapter.submitSend()` throws `AdapterCapabilityError`. No `CantonTransactionService` class exists.

**What is needed**: Canton transfer command construction, participant node submission, and on-ledger settlement tracking.

### Activity/indexing requirements

**Missing**: No Canton activity indexer. `CantonActivityIndexer.list()` returns only `CantonDemoActivity` fixture.

**Evidence**: `src/adapters/canton/services/canton-activity-indexer.ts` — single method, returns fixture only. No Canton scan API, validator API, or participant node query.

**What is needed**: A Canton `ScanService` or `ParticipantQueryService` that returns real transaction history for the linked partyId.

### Receive flow requirements

**Missing**: Canton receive is informational only. It shows the partyId if stored, but there is no verification that the partyId is valid, live, or correctly configured for receiving.

**Evidence**: `App.tsx:overlay === "receive"` — for Canton: shows `partyId` if present, otherwise "No live Canton party is linked." The partyId is whatever was stored — no verification.

**What is needed**: Receive instruction display (party-based, not address-based) with topology verification. Possibly QR encoding of Canton party reference.

### Swap limitations

**Missing**: No Canton swap path. `CantonSwapAdapter` throws unconditionally. No CC (Canton Coin) pricing, no settlement topology, no liquidity provider integration.

**Evidence**: `canton-swap-adapter.ts` — `throw new AdapterCapabilityError(...)` on `quote()`. `canton-reference-data-service.ts` — swap matrix entry: `supportState: "unsupported"`.

**What is needed**: CC live pricing feed, Canton settlement backend, and executable swap orchestration.

### Pricing limitations

**Missing**: No CC (Canton Coin) price. ETH has static $3,420. CC is not priced at all.

**Evidence**: `UsdReferenceService` only handles ETH reference conversion. `CANTON_DEMO_ASSETS` use `demoUsdReference()` with hardcoded values.

**What is needed**: Live CC/USD price feed integration.

---

## D. Safe-to-Disable Base Surfaces

These can be disabled or hidden in this phase without breaking Canton:

**UI layer**:
- WelcomeScreen tagline — change from "Canton + Base" to Canton-only messaging (no code removal, just text change)
- `Header` network switcher — disable or hide the Base button (requires UI state change, no logic removal)
- `HomeScreen` Canton-specific content — already Canton-primary; no change needed
- `SwapScreen` Base provider cards — already show Base as "Base Development Quote Adapter" with `executionReadiness: "blocked"` — no change needed
- BottomNav "Swap" tab — already shows Canton swap as unavailable — no change needed

**Store defaults** (`use-jutis-store.ts`):
- `DEFAULT_SWAP_REQUEST` — change from `base-mainnet` to `canton-mainnet` — safe change since Canton swap is already blocked

**Feature flags** (`fixtures.ts:DEFAULT_FEATURE_FLAGS`):
- `cantonReferenceMode: true` — already Canton-primary
- `baseExplorerEnrichment: false` — already disabled

**Manifest `host_permissions`** (`public/manifest.json`):
- `https://mainnet.base.org/*` — can be removed if Base is disabled at the network selection level. This removes the only network-specific host permission.

**Preferences** (`DEFAULT_PREFERENCES`):
- `selectedNetworkId: "canton-mainnet"` — already correct
- `showMockData: true` — Canton fixture data will show; this is correct for Canton-primary

**`getSupportNotes()` in controller**:
- Safe to return Canton notes if Base is hidden, but the Base branch is never reached if Base network is removed from UI

---

## E. Dangerous-to-Remove Base Surfaces

These will break if Base is removed naively:

**`WalletVaultSecret` type fields** (`types.ts:53-56`):
- Fields named `baseMnemonic` and `basePrivateKey` — but these are the vault's actual secret material. The vault creates and stores these. Canton does not use separate secret material. Removing these fields would break vault creation and unlock.

**`loadPortfolio()` parallel fetch** (`jutis-controller.ts:86-101`):
- Always fetches `baseAdapter.getAccounts(secret, cantonIdentity)` and `baseAdapter.getAssets(secret, cantonIdentity)` in `Promise.all()` with Canton calls. If Base adapter is removed, this line throws. Cannot be removed until Canton adapter returns real accounts and assets.

**`reconcileBackgroundActivity()` / `hasPendingBackgroundActivity()`** (`jutis-controller.ts:143-150`):
- Only call `baseActivityIndexer`. No Canton equivalent exists. If these are removed, Canton pending transactions (when Canton send is implemented) will never reconcile.

**`BaseTrackedTransactionRecord` storage** (`vault-repository.ts:63-68`):
- `readBaseTransactions()` / `writeBaseTransactions()` — Canton has no equivalent. Until Canton has a transaction lifecycle service and storage record type, Base transaction tracking cannot be removed.

**`BaseSwapAdapter` in `SwapProviderRegistry`** (`jutis-controller.ts:29-31`):
- Registered alongside `CantonSwapAdapter`. The registry requires at least one adapter per network. Removing BaseSwapAdapter without replacing it breaks the registry.

**`submitSend` journal entry for Canton** (`jutis-controller.ts:132-149`):
- The `else` branch (Canton) writes a journal entry using `"canton-primary"` as `accountId`. This is fine — but the `if` (Base) branch writes to `base-transactions` storage. Both paths exist correctly.

**`WalletNetworkAdapter` interface**:
- Both Canton and Base implement this interface. The interface itself is correct and should be kept. Removing Base from the codebase would leave Canton as the sole implementer, which is fine.

**`sendDraft` / `sendPreview` network routing**:
- All `networkId === "base-mainnet"` branches in controller are matched by Canton `else` branches. The routing is correct and removing Base would simplify it — but only after Canton is live.

---

## Can Jutis Honestly Ship as Canton-Only Today?

**No. Three hard blockers:**

1. **No Canton partyId** — the vault creates a BIP-39 mnemonic that produces a Base EVM address. There is no derivation to a Canton party. The Canton account is a null-reference stub.
2. **No Canton submit path** — `submitSend()` throws unconditionally. Canton cannot send anything.
3. **No Canton holdings** — `getAssets()` returns fixture data. The balance shown is not real.

Jutis can be presented as a Canton-primary wallet with honest "coming soon" states. It cannot be presented as an operational Canton wallet.

---

## Top Canton Blocker

**Canton party identity linkage.** The entire Canton product is blocked on this single missing piece. Without a partyId, Canton has no account, no receive target, no send destination, and no activity. Everything else (ledger API, signer, holdings scan) depends on having a real partyId to query and submit against.
