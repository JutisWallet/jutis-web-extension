# Jutis Extension — Base Gaps

*Analysis date: 2026-03-23*
*Popup/output wiring assumed fixed. Base-first operational assessment.*

---

## 1. Remaining Base Limitations

### 1.1 Public RPC Is Unreliable for Production

**Issue**: `https://mainnet.base.org` is a shared public endpoint. It is rate-limited and may return errors or timeouts under load.

**Current behavior when rate-limited**:
- `getBalance()` throws → balance shows "0.0000" with yellow "partial" badge
- `estimateGas()` throws → send preview shows gas estimation warning, fee unavailable
- `getTransactionReceipt()` throws → pending transactions never advance from "submitted" status
- `getBlockNumber()` throws → reconciliation fails silently

**Impact**: Users see degraded state with no actionable feedback. The extension cannot distinguish between "my balance is actually zero" and "RPC is unavailable."

**Is public RPC acceptable for dev only?**:
- **Yes** for initial development and local testing with low frequency
- **No** for any testing that involves sending transactions or verifying balances under realistic conditions
- **No** for production — users will experience persistent "partial" states on Base network

**What must change**: Replace `https://mainnet.base.org` with a private RPC endpoint from Alchemy, Infura, QuickNode, or Blockerc's paid API. At minimum, a rate-limit increase.

---

### 1.2 Single Account Only

**Issue**: Only one Base account is derivable per vault — `"base-primary"` derived from the mnemonic or private key.

**What works**: Single-account wallet use cases (receive, send from primary)
**What doesn't**: Multi-address management, hardware wallet integration, external key import beyond the vault's primary key

**What must change**: To support multiple accounts (HD derivation paths), `getAccounts()` would need to derive additional accounts and the UI would need an account switcher.

---

### 1.3 No Inbound Transaction Discovery

**Issue**: Activity feed only shows transactions submitted through this wallet. Incoming transfers and third-party transactions are invisible.

**What works**: User can see their own sent transactions with status updates
**What doesn't**: No way to see received ETH, received tokens, or any transaction not initiated by this wallet instance

**What must change**: To discover inbound transactions, either:
- Query account balance changes via RPC (imperfect — no event logs)
- Integrate a block explorer API (e.g., Blockscout API, Alchemy's Enhanced API) to fetch account history

---

### 1.4 Static USD Pricing

**Issue**: `UsdReferenceService` uses `StaticUsdReferenceProvider` with hardcoded ETH = $3,420. This never updates.

**What works**: USD-equivalent display for rough reference
**What doesn't**: Real-time portfolio valuation, accurate USD amounts

**What must change**: Integrate a live price feed (CoinGecko API, CoinMarketCap, or exchange API). This requires a network call at refresh time and handling of price API failures.

---

### 1.5 No Token (ERC-20) Balance Display

**Issue**: Only native ETH is loaded as an asset. ERC-20 token balances are not fetched automatically.

**What works**: `importToken()` method exists and can load a specific ERC-20 by contract address
**What doesn't**: Token balances are not shown in the default portfolio view

**What must change**: Either auto-detect user's ERC-20 holdings via token list + balance queries, or require manual token import.

---

### 1.6 No ENS Resolution

**Issue**: Recipient addresses must be raw `0x...` hex addresses. ENS names are not resolved.

**What works**: Sending to any valid EVM address
**What doesn't**: Resolving `vitalik.eth` → `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

**What must change**: Add ENS reverse resolution via a public ENS RPC or ENS API.

---

### 1.7 No Transaction Replacement/Cancel

**Issue**: Once a transaction is broadcast, there is no UI to speed it up (nonce replacement) or cancel it.

**What must change**: Implement EIP-1559 speed-up/cancel via same-nonce replacement transaction.

---

### 1.8 Auto-Lock Resets Pending Transaction State

**Issue**: When the service worker restarts (browser restart), `onStartup` calls `lockAndSyncSession()`. Pending transactions are stored in `chrome.storage.local` so they survive — but the reconcile alarm is re-initialized.

**What works**: Pending transactions are persisted and reconciliation resumes after SW restarts
**What doesn't**: There is a window between browser restart and first reconcile where transaction status is unknown

**What must change**: None needed — this is correct behavior. The alarm re-registers on SW startup.

---

## 2. Whether Public RPC Is Acceptable

### Development (Current State)

| Use Case | Public RPC Adequate? | Notes |
|---|---|---|
| Smoke testing popup boot | Yes | No RPC needed for bootstrap |
| Vault create/unlock | Yes | No RPC needed |
| Balance display (zero or funded account) | Partially | Will show "partial" if rate-limited |
| Send transaction test | No | Rate limit causes submission failures |
| Receive QR display | Yes | No RPC needed |
| Send preview gas estimation | Partially | Will show "partial" if rate-limited |
| Activity reconciliation | No | Reconcile requires live RPC |

### Verdict

**Public RPC is adequate for**:
- Extension boot/shutdown smoke tests
- Vault creation and unlock flows
- UI/UX verification of screen transitions
- Receive address display
- Light balance checks where "0.0000" on rate-limit is acceptable

**Public RPC is NOT adequate for**:
- Send transaction submission (rate limit causes broadcast failures)
- Gas estimation reliability (needed for accurate send preview)
- Activity reconciliation (needs consistent RPC access)
- Any production user-facing scenario

**Recommended dev RPC alternatives** (free tiers available):
- Alchemy — `https://base-mainnet.g.alchemy.com/v2/{API_KEY}` — generous free tier, reliable
- Infura — `https://base-mainnet.infura.io/v3/{API_KEY}` — reliable
- QuickNode — `https://few-white-gas.base-mainnet.quiknode.pro/{API_KEY}/` — free trial

---

## 3. What Must Change for Production Reliability

### P0 — Immediate (before any real use)

1. **Replace public RPC with private endpoint**
   - File: `src/core/models/fixtures.ts:30-31`
   - Change `rpcUrl` from `https://mainnet.base.org` to a private endpoint
   - Add RPC API key to extension secrets management (not hardcoded)
   - Consider: environment-based config so dev/staging/prod have different endpoints

2. **Add meaningful error feedback for RPC failures**
   - File: `src/adapters/base/base-wallet-adapter.ts:72-88` (getAssets catch block)
   - Currently: silently returns partial state with no user-visible indication of cause
   - Should: set a `lastError` or `rpcStatus` field that UI can surface as a banner or tooltip
   - Banner text: "Base RPC is temporarily unavailable. Balance may be inaccurate." (non-blocking)

### P1 — Short Term (before production launch)

3. **Live USD price feed**
   - File: `src/core/services/usd-reference-service.ts`
   - Replace `StaticUsdReferenceProvider` with `LiveUsdReferenceProvider` (CoinGecko or similar)
   - Add price API key
   - Handle API failures gracefully → fall back to last known price or mark as "estimated"

4. **Inbound transaction discovery**
   - Files: `src/adapters/base/services/base-transaction-lifecycle-service.ts`
   - Integrate Blockscout account transaction API: `GET https://base.blockscout.com/api/v2/addresses/{address}/transactions`
   - Filter for ETH transfers and ERC-20 transfers to/from the account
   - Merge with locally-tracked transactions

5. **ERC-20 auto-detection**
   - Files: `src/adapters/base/base-wallet-adapter.ts` (getAssets)
   - After loading ETH balance, optionally query a subset of popular tokens (USDC, USDT, WETH)
   - Or provide a token import UI that calls `importToken()`

### P2 — Medium Term

6. **Multi-account support**
   - Files: `src/adapters/base/base-wallet-adapter.ts:getAccounts()`
   - Derive accounts at multiple HD paths (e.g., `m/44'/60'/0'/0/0` through `m/44'/60'/0'/0/4`)
   - Add account switcher UI in HomeScreen header

7. **ENS resolution**
   - Add `resolveENS(name)` method using ENS universal resolver or Alchemy's ENS API
   - Use in send preview: resolve `vitalik.eth` → address before validation

8. **Transaction speed-up/cancel**
   - Implement EIP-1559 nonce replacement in `submitSend` path
   - Add "Speed up" and "Cancel" buttons to pending transaction cards

9. **Better partial state UX**
   - Files: UI components in `src/app/popup/`
   - When `support === "partial"`, show a subtle info icon with tooltip explaining the limitation
   - When `support === "reference-only"`, clearly label the data asFixture or historical

### P3 — Future

10. **Hardware wallet integration** (Ledger, Trezor via `@ledgerhq/connect-kit`)
11. **Ledger Live compatibility mode**
12. **Backup/recovery flow** beyond mnemonic (encrypted JSON, cloud backup)
13. **Multi-network portfolio aggregation** (Ethereum mainnet, other EVM L2s)

---

## 4. Summary: Working / Partial / Not Yet Reliable

| Base Feature | Status | Notes |
|---|---|---|
| Provider initialization | ✅ Working | JsonRpcProvider on chain 8453 |
| Account derivation | ✅ Working | Single account from mnemonic or pk |
| Balance retrieval | ✅ Working | Returns honest partial on RPC fail |
| Balance (live RPC) | ✅ Working | Accurate up to rate limits |
| Send preview | ✅ Working | Validation + gas estimation |
| Send preview (RPC down) | ⚠️ Partial | Warning shown, fee unavailable |
| Send submission | ✅ Working | wallet.sendTransaction() broadcast |
| Send submission (RPC down) | ❌ Fails | Error shown, no phantom tx |
| Receive address | ✅ Working | QR + text, correct address |
| Receive (Canton network) | ⚠️ Partial | Shows Canton party info (by design) |
| Activity (sent txs) | ✅ Working | Locally tracked, reconciled via RPC |
| Activity (received txs) | ❌ Not available | No inbound discovery |
| Session persistence | ✅ Working | chrome.storage.session across SW restart |
| Network selection persist | ✅ Working | chrome.storage.local |
| USD conversion | ⚠️ Partial | Static $3,420/ETH, not live |
| Token balances | ❌ Not available | ERC-20 not auto-loaded |
| ENS resolution | ❌ Not available | Raw addresses only |
| Public RPC reliability | ❌ Not reliable | Rate-limited, not production-grade |

**Overall Base readiness**: The infrastructure is correct and the code handles failures honestly. The primary gap is the public RPC endpoint — it is not production-grade. With a private RPC, Base would be genuinely operational for ETH custody use cases.
