# Jutis Extension — Base Deactivation Impact

*Analysis date: 2026-03-23*
*Popup/output wiring assumed fixed.*

---

## Three Levels of Base Deactivation

### Level 1: UI-Only Disable (safest, immediate)

**What changes**:
- Network switcher in `Header` (`App.tsx:36-61`) — Base button hidden, disabled, or removed
- `WelcomeScreen` tagline updated — "Canton + Base" changed to Canton-only messaging
- BottomNav and all Canton-primary content remains; no runtime changes
- `DEFAULT_SWAP_REQUEST` changed from `base-mainnet` to `canton-mainnet`
- `host_permissions` in manifest: `https://mainnet.base.org/*` removed (optional)

**What still works**:
- All Canton fixture/demo flows continue unchanged
- Vault creation, unlock, session management — unaffected
- `loadPortfolio()` still fetches Base assets in parallel (but they won't be displayed)
- All controller branching for `base-mainnet` still exists but is unreachable from UI

**What breaks**: Nothing. This is pure UI state management. The Base code paths exist but are never triggered.

**Risk**: Low. No runtime removal.

---

### Level 2: Runtime Selection Disable (safe)

**What changes on top of Level 1**:
- Network registry (`BUILT_IN_NETWORKS`) keeps `base-mainnet` entry but is excluded from `controller.listNetworks()` returned to popup
- `selectedNetworkId` preference locked to `"canton-mainnet"` — if user had Base selected, it reverts to Canton
- `sendDraft.networkId` defaults to `"canton-mainnet"` and cannot be changed to Base
- `loadPortfolio()` in controller still calls Base adapter (silence), but Base assets are filtered out before returning snapshot
- `submitSend` / `previewSend` — Base branches never reached because UI cannot select Base
- `reconcileBackgroundActivity()` — still runs but Base transactions (if any exist in storage) reconcile normally

**What still works**:
- All Canton flows
- Canton fixture/demo data
- Base adapter code exists in bundle but is dead code
- Service worker background reconciliation runs on Base transactions from prior sessions

**What breaks**: Nothing directly. Base is unreachable from UI but still executes internally on `loadPortfolio`.

**Risk**: Low. No Canton capability gaps exposed — Canton was already non-operational before this change.

---

### Level 3: Full Base Adapter Removal (dangerous — do not do yet)

**What must be removed**:

```
src/adapters/base/                          ← entire directory
src/adapters/base/services/base-swap-adapter.ts  ← also remove from SwapProviderRegistry in controller
public/manifest.json host_permissions        ← remove "https://mainnet.base.org/*"
```

**What breaks when removed naively** (without Canton equivalents):

| Component | Why It Breaks |
|---|---|
| `loadPortfolio()` | `Promise.all([this.baseAdapter.getAccounts(...), this.cantonAdapter.getAccounts(...)])` — `baseAdapter` reference dies |
| `submitSend()` | `if (draft.networkId === "base-mainnet")` branch references `baseTransactionService` which no longer exists |
| `reconcileBackgroundActivity()` | calls `baseActivityIndexer.reconcilePendingTransactions()` — reference dies |
| `hasPendingBackgroundActivity()` | calls `baseAdapter` — reference dies |
| `getSupportNotes()` | `if (networkId === "base-mainnet")` branch references `baseAdapter` which no longer exists |
| `BaseTrackedTransactionRecord` type | used in `vault-repository.ts` for `readBaseTransactions()` / `writeBaseTransactions()` — Canton has no equivalent record type |
| `SwapProviderRegistry` | registered `BaseSwapAdapter` — removing it alone leaves Canton swap as only adapter, which is fine, but the registry must not break |
| `WalletVaultSecret` fields | `baseMnemonic` / `basePrivateKey` field names — these are the vault's actual secret; renaming would break vault creation |

**What cannot be removed yet because Canton doesn't replace it**:
1. `loadPortfolio()` parallel fetch — Canton has no real account derivation
2. `reconcileBackgroundActivity()` — Canton has no transaction lifecycle service
3. `BaseTrackedTransactionRecord` storage — Canton has no transaction record type
4. `WalletVaultSecret` field names — vault creation depends on these

**Verdict**: Level 3 is not safe to execute in this phase. The Canton replacement implementations must exist before Base is removed from the runtime.

---

## Recommended Safest Path for Next Phase

**Implement Level 1 + Level 2 simultaneously**:

Level 1 (UI-only) provides immediate Canton-only UX without touching runtime. Level 2 (runtime selection lock) ensures Canton is the only selectable network at every layer.

The Base adapter code remains in the bundle as dead code — this is acceptable until Canton live capabilities are ready. Removing Base before Canton is live would leave the wallet with no operational network.

**What to do in the next phase**:
1. Remove Base button from `Header` network switcher (hide it)
2. Update `WelcomeScreen` text to be Canton-only
3. Lock `selectedNetworkId` to Canton in preferences (validate on read)
4. Remove `https://mainnet.base.org/*` from `host_permissions`
5. Change `DEFAULT_SWAP_REQUEST` to Canton network
6. Add a `showMockData: true` enforcement for Canton assets
7. Keep all Base adapter code in the codebase — but unreachable from UI

---

## What Happens to Existing Base Vaults

If a user had created a wallet when Base was active, and Base is now disabled:

- **Vault still exists** in `chrome.storage.local` — the `PersistedVault` is not deleted
- **Base accounts are inaccessible** from UI — network switcher doesn't show Base
- **Base assets not shown** — filtered from snapshot before returning
- **No crash** — controller catches the network mismatch gracefully

The vault secret material (mnemonic) is unchanged. If Base is re-enabled later, the user can access their Base account again.

---

## What About Base Testnet?

A potential intermediate step: keep `base-mainnet` disabled but add a `base-testnet` with a testnet RPC (e.g., Base Sepolia). This would allow testing the Base path without real funds or rate-limiting concerns. However, this is a separate decision and does not affect the Canton-only transition.

---

## Summary Table

| Deactivation Level | Runtime Changed? | Canton Replace Required? | Risk | Next Phase? |
|---|---|---|---|---|
| Level 1: UI hide | No | No | None | ✅ Do first |
| Level 2: Lock selection | Partial | No | Low | ✅ Do second |
| Level 3: Full removal | Yes | **Yes — all P0 gaps** | High | ❌ Not yet |
