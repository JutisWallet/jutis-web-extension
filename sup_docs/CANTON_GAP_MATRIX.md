# Jutis Extension — Canton Gap Matrix

*Analysis date: 2026-03-23*

## Capability Matrix

| Capability | Current Status | Evidence | Blocking Severity | Needed for Launch? |
|---|---|---|---|---|
| **Wallet creation** | Real | `VaultService.createFromRandomMnemonic()` creates BIP-39 mnemonic → stored in vault | None | Yes — ✅ working |
| **Unlock / session** | Real | `VaultService.unlock()` decrypts vault, `SessionService.start()` stores in chrome.storage.session | None | Yes — ✅ working |
| **Canton identity (storage)** | Partial | `DEFAULT_CANTON_IDENTITY` stored in `chrome.storage.local` at `jutis:canton-identity`; has `partyId: null`, `authMode: "mock"`, all API URLs undefined | Medium | Yes — ⚠️ storage exists but not populated |
| **Canton account display** | Demo | `CantonWalletAdapter.getAccounts()` returns `partyId: null` from default identity or stored stub partyId; no derivation from vault secret | **P0** | Yes — ❌ blocked |
| **Canton receive flow** | Missing | `CantonWalletAdapter.getReceiveInfo()` returns partyId or "not linked" string; no live party verification; no QR encoding of Canton reference; UI shows partyId if present | **P0** | Yes — ❌ blocked |
| **Canton send flow** | Stubbed | `CantonWalletAdapter.submitSend()` throws `AdapterCapabilityError` unconditionally; `getSendPreview()` validates inputs but marks as `support: "partial"` with warning | **P0** | Yes — ❌ blocked |
| **Canton send preview** | Partial | `getSendPreview()` validates recipient, amount; returns `estimatedFeeNative: null`; adds "planning-only" warning; correctly fails closed on submit | Low | Yes — ⚠️ planning UX works, execution blocked |
| **Canton activity / history** | Demo | `CantonActivityIndexer.list()` returns `CANTON_DEMO_ACTIVITY` fixture (2 entries); no live scan, validator, or participant node query | **P0** | Yes — ❌ blocked |
| **Canton asset / balance display** | Demo | `CantonWalletAdapter.getAssets()` returns `CANTON_DEMO_ASSETS` (CC: "1240.00", USDC: "500.00"); `trustLevel: "demo"`, `support: "mocked"` | **P0** | Yes — ❌ blocked |
| **Canton ledger submission** | Missing | No Canton ledger API client, no Daml transaction construction, no gRPC endpoint, no signer service | **P0** | Yes — ❌ blocked |
| **Canton party derivation from vault** | Missing | Vault creates Base EVM mnemonic; `WalletVaultSecret` holds `baseMnemonic` only; no path from secret to Canton partyId | **P0** | Yes — ❌ blocked |
| **Canton identity linking flow** | Missing | No UI to attach a partyId, choose auth mode, configure validator/ledger/scan URLs; stored identity is always `DEFAULT_CANTON_IDENTITY` at bootstrap | **P0** | Yes — ❌ blocked |
| **Network selection** | Working (dual) | `Header` network switcher shows Canton + Base; `selectedNetworkId` in preferences persists; `isCantonSelected` drives conditional UI | None | Yes — ✅ working (dual) |
| **Storage persistence** | Working | Vault → `chrome.storage.local`; session → `chrome.storage.session`; preferences → `chrome.storage.local`; Canton identity → `chrome.storage.local`; all network-agnostic | None | Yes — ✅ working |
| **Background messaging** | Working | `chrome.runtime.sendMessage` → `executeRuntimeRequest` → controller; all network routing handled correctly; no Base-specific assumption at messaging layer | None | Yes — ✅ working |
| **Canton swap** | Unsupported | `CantonSwapAdapter.quote()` throws `AdapterCapabilityError`; matrix: `supportState: "unsupported"`; blockers list: no live settlement or quote provider | Medium | Yes — ⚠️ blocked but properly fails closed |
| **Canton pricing / USD reference** | Missing | CC (Canton Coin) has no price feed; `UsdReferenceService` only handles ETH; fixture assets use `trustLevel: "demo"` | **P1** | Yes — ❌ no live price source |
| **Base send (EVM)** | Real | `BaseWalletAdapter.submitSend()` calls `wallet.sendTransaction()` via JsonRpcProvider; broadcasts to Base mainnet | None | No — Base being deactivated |
| **Base balance (RPC)** | Real | `getAssets()` calls `provider.getBalance()` on `https://mainnet.base.org`; returns live ETH balance; `support: "real"` | None | No — Base being deactivated |
| **Base receive (address)** | Real | `getReceiveInfo()` returns EVM address; QR code shown in UI | None | No — Base being deactivated |
| **Base activity (sent txs)** | Real | `BaseTransactionLifecycleService.reconcilePendingTransactions()` tracks submitted transactions via `base-transactions` storage | None | No — Base being deactivated |
| **Error handling** | Working | All RPC failures caught; partial/support states correctly propagated; `AdapterCapabilityError` thrown for Canton send/swap; silent degradation for RPC unavailable | None | Yes — ✅ working |
| **Browser loadability** | Working | MV3 service worker, chrome.storage APIs, message passing all functional; no Base dependency at extension boot | None | Yes — ✅ working |
| **Canton feature matrix UI** | Real | `CantonReferenceDataService.getFeatureMatrix()` returns structured capability entries with supportState, blocker, nextStep, summary | None | Yes — ✅ implemented correctly |
| **Auto-lock / session expiry** | Working | `chrome.alarms` schedules lock; `SessionService.enforceExpiry()` clears expired sessions; `onStartup` locks on browser restart | None | Yes — ✅ working |
| **Canton receive (party info display)** | Partial | UI correctly shows partyId or "not linked" when Canton selected; QR code shown only for Base; Canton receive shows Canton-specific messaging | Low | Yes — ⚠️ display works, no live party data |
| **Swap readiness surface** | Working | `QuoteEngine.getReadiness()` returns structured `SwapReadiness` with providers, blockers, summary; correctly shows Canton as unsupported | None | Yes — ✅ working |

---

## Summary: Launch-Blocking Gaps

### P0 — Cannot launch without these

| Gap | Why It's Blocking |
|---|---|
| Canton party derivation | No partyId = no Canton account = wallet has nothing to show for Canton |
| Canton identity linking UI | partyId is null by default; no way to populate it |
| Canton ledger submission | Cannot send Canton assets even if partyId existed |
| Canton holdings source | Balance always shows fixture data ($1,240 CC); not real |
| Canton activity source | Activity always shows fixture data; not real |

### P1 — Must address before production

| Gap | Why It Matters |
|---|---|
| CC (Canton Coin) pricing | Portfolio USD shown for Canton assets is demo-only ($1,240 CC estimate) |
| Canton transaction storage | No equivalent to `BaseTrackedTransactionRecord` for tracking Canton sends |
| Canton reconcile alarm | `reconcileBackgroundActivity` only handles Base; Canton needs its own |

### P2 — Should address eventually

| Gap | Why It Matters |
|---|---|
| Canton receive verification | PartyId shown is whatever was stored; no topology verification |
| Canton swap execution | No CC liquidity, no settlement path, no pricing |
| Canton multi-account | Only one party per identity supported |

---

## Honest Status by Network

**Canton today**: A scaffold that correctly identifies its own limitations. All capability gaps are honestly documented in the feature matrix with specific blockers. The "Canton support status" card in HomeScreen shows `reference-only` and `unsupported` badges correctly. The send button is disabled with "Live transfer unavailable". This is architecturally honest — just not yet real.

**Base today**: The actual operational network. Real account, real balance, real send, honest partial states. Already verified working after `npm run build`.

**The transition required**: Canton needs its own version of everything Base already has. The vault secret model (BIP-39 → EVM address) is Base-specific. Canton needs a separate identity model (partyId + Daml ledger API) that does not yet exist in the codebase.
