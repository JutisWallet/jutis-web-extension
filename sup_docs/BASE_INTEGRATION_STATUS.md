# Jutis Extension — Base Integration Status

*Analysis date: 2026-03-23*
*Assumes popup/output wiring is fixed (popup.html → popup.js → PopupApp renders in toolbar popup).*

---

## 1. Provider Path

**RPC URL**: `https://mainnet.base.org` (chainId 8453)
**Source**: `src/core/models/fixtures.ts:30-31`

```typescript
{
  id: "base-mainnet",
  name: "Base",
  kind: "evm",
  symbol: "ETH",
  rpcUrl: "https://mainnet.base.org",
  chainId: 8453,
  explorerUrl: "https://base.blockscout.com/"
}
```

**Provider instantiation** (`src/adapters/base/base-wallet-adapter.ts:265-269`):
```typescript
private getProvider(): JsonRpcProvider {
  if (!this.network.rpcUrl) {
    throw new Error(`No RPC URL configured for ${this.network.id}.`);
  }
  return new JsonRpcProvider(this.network.rpcUrl, this.network.chainId);
}
```

**Status**: `https://mainnet.base.org` is a **public RPC endpoint operated by Blockerc Foundation**. It is rate-limited and does not guarantee availability. It is acceptable for development and light testing but **not production-grade reliability**.

**Chain ID**: 8453 (Base mainnet)

**Explorer URL**: `https://base.blockscout.com/` — used for transaction URLs in submitted transaction records.

---

## 2. Account Derivation

**Status**: ✅ WORKING

**Code path** (`base-wallet-adapter.ts:266-280`):
```typescript
private getWallet(secret: WalletVaultSecret): Wallet | HDNodeWallet {
  if (secret.basePrivateKey) {
    return new Wallet(secret.basePrivateKey);
  }
  if (secret.baseMnemonic) {
    return Wallet.fromPhrase(secret.baseMnemonic);
  }
  throw new Error("No Base secret material is available.");
}
```

**Entry point**: `getAccounts(secret, _cantonIdentity)` at line 34

**What it returns**:
```typescript
{
  id: "base-primary",
  networkId: "base-mainnet",
  label: "Base account",
  address: wallet.address as `0x${string}`,
  shortId: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
  support: "real"
}
```

**Secret source**: `WalletVaultSecret` is stored decrypted in `chrome.storage.session` after unlock. The secret contains either `baseMnemonic` (from `Wallet.createRandom()` at vault creation) or `basePrivateKey`.

**Derivation quality**: High — uses ethers v6 standard derivation. Mnemonic → HD wallet is standard BIP-39.

**Gap**: Only one Base account is derived (`"base-primary"`). No HD path derivation for multiple accounts, noledger/external key integration.

---

## 3. Balance Retrieval

**Status**: ✅ WORKING (with honest degraded behavior)

**Code path** (`base-wallet-adapter.ts:60-108`):
```typescript
async getAssets(secret, _cantonIdentity): Promise<AssetRecord[]> {
  const wallet = this.getWallet(secret);
  const provider = this.getProvider();
  try {
    const balance = await provider.getBalance(wallet.address);
    const amount = Number(formatEther(balance)).toFixed(4);
    return [{
      id: "base-eth",
      networkId: "base-mainnet",
      symbol: "ETH",
      name: "Ether",
      amount,           // e.g. "0.1234"
      usdReference: this.usdReferenceService.toUsdReference("ETH", amount),
      support: "real"  // green badge
    }];
  } catch {
    return [{
      id: "base-eth",
      symbol: "ETH",
      amount: "0.0000",
      usdReference: this.usdReferenceService.unavailable("..."),
      support: "partial"  // yellow badge
    }];
  }
}
```

**USD reference**: `UsdReferenceService` uses `StaticUsdReferenceProvider` with hardcoded ETH=$3,420. This is a **static estimate**, not a live price feed.

**When RPC is unavailable**:
- `provider.getBalance()` throws
- Catch block returns `amount: "0.0000"`, `support: "partial"`
- No error banner is shown to the user
- The ETH card shows a yellow "partial" badge

**When RPC is available**: Live balance from Base mainnet, "real" (green) badge.

---

## 4. Activity Status

**Status**: ⚠️ PARTIAL

**Code path**:
- `BaseActivityIndexer.list(accounts)` → `BaseTransactionLifecycleService.listActivity(accounts)`
- Reconciliation: `reconcilePendingTransactions()` calls `provider.getBlockNumber()` + `provider.getTransactionReceipt(hash)` per tracked transaction

**What is tracked**:
- Transactions submitted by this wallet through the `submitSend` flow are recorded in `chrome.storage.local` key `"jutis:base-transactions"` as `BaseTrackedTransactionRecord[]`
- Legacy entries migrated from `jutis:activity` journal

**What is NOT tracked**:
- Incoming transactions (received ETH) — no account scanning
- Third-party transactions involving the account — no indexer
- Token transfer history beyond submitted sends

**Activity reconciliation** (`base-transaction-lifecycle-service.ts:100-160`):
```typescript
const latestBlockNumber = await provider.getBlockNumber();
const receipt = await provider.getTransactionReceipt(record.hash);
// Updates status: submitted → pending → confirmed / failed
```

**When RPC is unavailable during reconciliation**:
- `provider.getBlockNumber()` throws → caught, reconciliation silently degrades
- Records retain their prior status with an updated `detail` note: "Base RPC reconciliation is currently unavailable"

**Gap**: Activity is solely wallet-originated. No inbound transaction visibility without a block explorer API.

---

## 5. Send Preview Status

**Status**: ✅ WORKING (with honest partial degradation)

**Code path** (`base-wallet-adapter.ts:118-187`):
```typescript
async getSendPreview(secret, draft, assets): Promise<SendPreview> {
  // 1. Validates secret exists
  // 2. Validates isAddress(draft.to)
  // 3. Validates amount > 0
  // 4. Validates amount <= asset.amount
  // 5. Estimates gas via provider.estimateGas()
  // 6. Computes estimatedFeeNative = maxFeePerGas * gasLimit
  // 7. Validates amount + fee <= ETH balance (for native asset)
  // 8. Returns SendPreview with warnings[] if gas estimation failed
}
```

**Validation rules enforced**:
- Must unlock before sending
- Recipient must be a valid EVM address
- Amount must be positive
- Amount must not exceed available balance
- Amount + estimated gas must not exceed ETH balance

**Gas estimation failure** (RPC unavailable):
- Catch block adds warning: "Gas estimation could not be completed. The current preview is best-effort."
- `estimatedFeeNative` remains `null`
- `estimatedFeeUsdReference` returns unavailable
- `support` returns `"partial"` (yellow badge)

**USD conversion**: Uses same static $3,420/ETH reference — not live.

---

## 6. Send Submission Status

**Status**: ✅ WORKING

**Code path** (`base-wallet-adapter.ts:190-248`):
```typescript
async submitSend(secret, draft, preview): Promise<SubmittedTransaction> {
  const provider = this.getProvider();
  const wallet = this.getWallet(secret).connect(provider);
  // Native ETH:
  const response = await wallet.sendTransaction({
    to: preview.to,
    value: parseEther(draft.amount)
  });
  // Returns { id, networkId, status: "submitted", hash, explorerUrl }
  // Persists to base-transactions via lifecycleService.recordSubmittedTransaction()
}
```

**Post-submission**:
- `BaseTransactionService.submit()` records the transaction via `lifecycleService.recordSubmittedTransaction()`
- Explorer URL: `${network.explorerUrl}tx/${response.hash}` → `https://base.blockscout.com/tx/{hash}`

**ERC20 path**: Also implemented via `Contract` with `ERC20_ABI` — transfers tokens by contract address.

**Known limitation**: `wallet.sendTransaction()` waits for the RPC to accept the transaction but does not wait for on-chain confirmation. Confirmation is tracked asynchronously via the reconcile alarm.

---

## 7. Receive Status

**Status**: ✅ WORKING

**Code path** (`base-wallet-adapter.ts:111-116`):
```typescript
async getReceiveInfo(account: AccountRecord): Promise<ReceiveInfo> {
  return {
    networkId: this.network.id,
    label: "Base address",
    value: account.address ?? "",
    note: "Only send Base-compatible assets to this address."
  };
}
```

**UI path** (`App.tsx:overlay === "receive"`):
- `isCantonReceive = selectedNetworkId === "canton-mainnet"`
- When `isCantonReceive === false` (Base selected): renders `ReceiveCard` with QR code + address text
- Address copied to clipboard on tap

**Address source**: The derived `base-primary` account address from `getAccounts()`.

**Gap**: No QR code dark/light theme handling documented. No ENS resolution.

---

## 8. Persistence Status

**Session persistence across popup reopen**:

| Data | Storage | Survives popup close | Survives SW restart | Survives browser restart |
|---|---|---|---|---|
| Vault (encrypted) | `chrome.storage.local` | Yes | Yes | Yes |
| Session secret (decrypted) | `chrome.storage.session` | No | Yes (same session) | No |
| Portfolio snapshot | In-memory only | No | No | No |
| Selected network | `chrome.storage.local` (preferences) | Yes | Yes | Yes |
| Pending transactions | `chrome.storage.local` | Yes | Yes | Yes |
| Auto-lock alarm | `chrome.alarms` | Yes | Yes | No (cleared on startup) |

**Popup reopen behavior**:
1. Popup opens → `bootstrap()` runs → sends `jutis:bootstrap`
2. Background returns `hasVault` and `session.status`
3. If `session.status === "unlocked"`: shows HomeScreen with portfolio
4. If `session.status === "locked"`: shows UnlockScreen
5. Portfolio is **re-fetched** from RPC on each `bootstrap`/`refresh` — no cached balance

**State that persists across popup close/reopen**:
- `selectedNetworkId` in preferences (Base vs Canton selection)
- Encrypted vault in `chrome.storage.local`
- Pending tracked transactions in `chrome.storage.local`

**State that does NOT persist across popup close/reopen**:
- In-memory portfolio data (re-fetched from RPC on each open)
- Session secret (requires re-unlock after browser restart)

**Auto-lock**: Scheduled via `chrome.alarms`. If popup is closed and reopened before auto-lock fires, session is still valid and HomeScreen is shown.

---

## 9. Degraded Behavior When RPC Fails

**Balance retrieval (`getAssets`)**:
- RPC failure → `catch` → returns `amount: "0.0000"`, `support: "partial"`
- No error banner — silent degradation
- Yellow "partial" badge shown instead of green "live"
- USD value shows "unavailable" message

**Send preview (`getSendPreview`)**:
- Gas estimation failure → adds warning to `warnings[]`
- `estimatedFeeNative` → `null`
- `estimatedFeeUsdReference` → unavailable
- `support` → `"partial"`
- User can still submit (with warning about uncertain gas)

**Send submission (`submitSend`)**:
- If RPC is completely unreachable: `wallet.sendTransaction()` throws
- Error propagates to popup and is shown as a validation error
- Transaction is NOT recorded in pending list if submission fails

**Activity reconciliation (`reconcilePendingTransactions`)**:
- RPC failure → caught → returns existing records with updated `detail` note
- No error shown to user
- Pending transactions retain `"submitted"` status indefinitely until RPC recovers

**Bootstrap (`refresh`)**:
- If both Base and Canton assets fail, the portfolio snapshot is still returned
- Canton returns fixture data (always works)
- Base asset will show partial/unavailable state

**Summary of degraded behavior**:
| Operation | RPC failure result | User feedback |
|---|---|---|
| `getAssets` | Returns `amount: "0.0000"`, `support: "partial"` | Yellow badge, no banner |
| `getSendPreview` | Warning added, fee unavailable | Yellow badge, warning text |
| `submitSend` | Throws — submission fails | Error shown in UI |
| `reconcilePendingTransactions` | Returns existing records, detail updated | No direct user feedback |
| `getBlockNumber` (reconciliation) | Caught silently | None |

---

## Overall Base Integration Confidence

| Component | Confidence | Notes |
|---|---|---|
| Account derivation | High | ethers standard derivation |
| Balance retrieval | High | Honest partial state on RPC failure |
| Send preview | High | Input validation + gas estimation |
| Send submission | High | Direct wallet RPC broadcast |
| Receive address | High | Address shown via QR + text |
| Activity (wallet-originated) | Medium | Only tracked txs, no inbound scan |
| Persistence | High | chrome.storage.local + session |
| Degraded behavior | High | Honest partial/live states |
| RPC reliability | Low-Medium | Public endpoint is rate-limited |

**Public RPC assessment**: `https://mainnet.base.org` is a shared public resource. It works reliably for light development use but will show `partial` behavior under rate-limiting. For any meaningful volume, a private RPC endpoint (e.g., from Alchemy, Infura, or Blockerc's paid tiers) is required.
