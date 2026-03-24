# Final Delivery Report

Date: 2026-03-21

## Executive Summary

Jutis is currently a solid development scaffold, not a production-ready wallet.

What is actually working today:

- The extension builds, typechecks, and lints successfully.
- The active runtime is a Manifest V3 popup/options/background scaffold built from the newer `src/app` architecture.
- Base local custody is real at the extension level: the vault can create or import a Base mnemonic/private key, encrypt it locally, unlock it, derive a Base address, read the Base native balance from the public Base RPC, preview a native or ERC-20 send, and submit a Base transaction through `ethers`.
- The UI shell is real and derived from the local `designed_source` language.

What is only partial:

- Activity, transaction state reconciliation, USD pricing, ERC-20 portfolio handling, swap flows, and auto-lock are only partially implemented.
- The repo still contains an older competing scaffold under `src/` that is excluded from the active TypeScript compile path instead of being fully removed or merged.

What is not actually live:

- Canton live onboarding, party binding, holdings, activity, transfer submission, swap settlement, and name resolution are not integrated.
- Base swap is not connected to a live provider.
- There is no injected provider, no site-permission approval flow, no dapp connection UX, and no robust background transaction reconciler.

Release judgment:

- Acceptable for local development and architecture review.
- Not acceptable for staging that handles real user funds without significant hardening.
- Not acceptable for production.

---

## 1. Real Integrations

Only the items below are connected to a real runtime integration today.

| Item | Working status | What is actually real | Tech / protocol / service | User action supported | Assumptions | Production viability |
|---|---|---|---|---|---|---|
| Vault creation | Working | Generates a real mnemonic and encrypts it before storage | `ethers` wallet generation, Web Crypto PBKDF2 + AES-GCM, `chrome.storage.local` | Create wallet | Browser has Web Crypto; extension storage is available | Low to medium. Cryptography is real, but audit, recovery UX, and session handling are incomplete |
| Vault import | Working | Accepts a real mnemonic or real Base private key and encrypts it locally | `ethers` mnemonic/private-key parsing, Web Crypto, `chrome.storage.local` | Import wallet | Input is valid; user is intentionally importing Base credentials | Low to medium. Functional, but lacks guarded secret-handling UX |
| Vault unlock | Working | Decrypts the stored vault with the user password | Web Crypto PBKDF2 + AES-GCM | Unlock wallet | Correct password; stored ciphertext has not been corrupted | Low to medium. Real, but session lifecycle is weak |
| Manual lock | Working | Clears the in-memory unlocked state in the popup store | Zustand popup store state reset | Lock now | User interacts with the popup currently holding the unlocked secret in memory | Low. Real for the open popup session, but not a complete session-management model |
| Base account derivation | Working | Derives a real Base EOA from the locally stored mnemonic or private key | `ethers` `Wallet` / `Wallet.fromPhrase` | See wallet address, receive address, Base account identity | Vault contains valid Base secret material | Medium. Standard approach, but no account index management or HD path options |
| Base native balance read | Working with external dependency | Reads the real Base ETH balance for the derived address | `ethers` `JsonRpcProvider` against `https://mainnet.base.org` | View Base ETH balance in portfolio | Public Base RPC is reachable and not rate-limited | Low to medium. Real, but public RPC is not production-grade infrastructure |
| Base send preview | Working with external dependency | Validates address, amount, balance, and estimates gas/fee for a real Base transfer | `ethers` `isAddress`, `estimateGas`, `getFeeData` | Review Base send before submission | RPC is reachable; asset metadata is correct | Medium for dev, low for production. No simulation, no richer confirmation safeguards |
| Base send submission | Working with external dependency | Broadcasts a real Base native transfer or ERC-20 transfer through `ethers` | `ethers` `wallet.sendTransaction`, `Contract.transfer`, Base JSON-RPC | Submit a Base transfer | RPC accepts transaction; secret material is valid; chain conditions are normal | Low for production. Broadcast path is real, but confirmation/reconciliation is not |
| Base receive | Working | Shows a real Base address and QR | Local account derivation + `qrcode.react` | Copy or scan Base receive address | Account is unlocked and derived successfully | Medium. Straightforward and low risk |
| Extension runtime scaffold | Working | Popup, options page, background worker, MV3 manifest, build pipeline | Chromium MV3, Vite, React, TypeScript | Launch extension UI, open options page | Chromium browser, built extension loaded from `dist/` | Medium as scaffold, low as product runtime |
| Background auto-lock alarm scaffold | Partially real integration | Registers a real Chrome alarm and clears `chrome.storage.session` on timer | `chrome.alarms`, `chrome.storage.session` | Background timer behavior | Session data would need to live in `chrome.storage.session` to matter | Low. The Chrome integration is real, but it does not currently enforce the active popup secret lifecycle |

### Notes

- The strongest real protocol integration in the current build is Base via `ethers` and a public Base RPC.
- There is no equivalently real Canton integration in the active runtime.

---

## 2. Partial Integrations

These are implemented enough to demonstrate architecture or limited utility, but not enough to call complete.

| Item | Status | Real part | Incomplete part | Blocker type | Exact work still required |
|---|---|---|---|---|---|
| Portfolio home | Partially working | Real Base ETH can be loaded; local activity journal is displayed; UI is real | Canton balances are demo data; Base token portfolio is not populated; no durable reconciler | Backend + scope | Wire live Base token discovery/indexing, wire Canton holdings, persist refresh/reconciliation logic in background |
| Base activity | Partially working | Transactions submitted from this wallet are written into a local journal and shown in Activity | No explorer indexing, no receipt polling, no pending-to-confirmed reconciliation, no inbound history | Backend + architecture | Add receipt polling, Blockscout or equivalent indexer integration, deduplication, and durable background sync |
| Base ERC-20 support | Partially working | Adapter has real ERC-20 `transfer`, `symbol`, `decimals`, and `balanceOf` logic | No UI for token import, no allowances flow, no portfolio token registry, no metadata verification | Scope + UX | Add token import UI, token list persistence, metadata verification, allowance UX, and activity enrichment |
| Base send flow | Partially working | Address validation, gas estimation, balance checks, and broadcast path are real | No nonce management UX, no transaction simulation, no error-specific recovery, no confirmation polling | Architecture + backend | Add transaction lifecycle service, receipt tracking, retry policy, richer error mapping, and stronger confirmations |
| Settings auto-lock | Partially working | Preference is stored; background alarm exists | Alarm period is hardcoded; active unlocked secret is not persisted to `chrome.storage.session`, so the alarm does not actually control the popup session | Architecture | Move unlocked session into controlled session storage or background memory, enforce idle expiry, and sync preference into the alarm schedule |
| USD reference display | Partially working | USD values are modeled in the domain and shown throughout the UI | Prices are static constants, not live market data | Backend | Add a real price/reference provider, caching, freshness rules, and outage handling |
| Swap UX surface | Partially working | Swap request form, quote list UI, route model, provider registry, and state labels exist | No execution service, no route selection workflow, no live provider integration, no persistent swap session | Architecture + backend | Implement provider adapters, execution orchestration, step tracking, approval handling, and persistence |
| Canton account model | Partially working | Party-centric account shape is modeled correctly in types and UI | No real validator/onboarding session, no real party linkage flow | Protocol + backend | Integrate validator/wallet-session onboarding, persist real Canton identity metadata, and validate capability state |
| Canton receive | Partially working | UI now refuses to show a fake QR when no live identifier exists; if a party id exists it can be displayed | No real party-link flow, no live receive instructions from Canton infrastructure | Protocol + backend | Add party attach flow and deployment-specific receive guidance |
| Canton send preview | Partially working | Canton send preview validates required fields and clearly warns that submission is not wired | No live submission path | Protocol + backend | Add signer integration, token-standard transfer preparation, ledger submission, and result tracking |
| Options workspace | Partially working | Real page exists and renders current store state and support notes | Mostly a product workspace shell; not a complete management console | Scope | Expand into network management, debugging, identity setup, and advanced settings |
| Confirmation and status tracking | Partially working | Base send creates a local `submitted` record; UI can show a transaction detail sheet | No durable transition to `pending`, `confirmed`, or `failed` from external truth sources | Architecture + backend | Add background receipt polling and canonical state reconciliation |

### Important honesty note

Some features are "partial" because they are intentionally stopped at the adapter boundary. That is good architectural honesty, but it is still incomplete product behavior.

---

## 3. Mocked / Stubbed / Simulated Parts

These items are not live integrations. They are placeholders, demonstrations, or architectural seams.

| Item | Current state | Why it is mocked or stubbed | Real replacement boundary | Safe temporarily? |
|---|---|---|---|---|
| `CANTON_DEMO_ASSETS` | Mocked | No live Canton holdings source is wired | Canton holdings service backed by validator/scan/ledger topology | Safe for dev only. Must not ship to production as live balances |
| `CANTON_DEMO_ACTIVITY` | Mocked | No live Canton activity indexer is wired | Canton scan/indexer + local submission journal reconciler | Safe for dev only |
| Default Canton identity | Mocked | No onboarding or live party-link flow exists | Validator session / external-party / wallet-session attach flow | Safe for dev only |
| `CantonWalletAdapter.submitSend()` | Stubbed hard stop | Live Canton transfer topology is not configured | Canton transfer orchestration with signer + ledger submission | Safe to keep temporarily because it fails closed |
| `CantonTransferService` | Stubbed | Execution path not implemented | Real transfer service calling Canton backend or SDK layer | Safe temporarily; not releasable as feature-complete |
| `CantonActivityIndexer` | Mocked | Returns demo activity only | Real scan/validator/indexed activity service | Safe for dev only |
| `CantonReferenceDataService` | Stubbed | Returns static notes, not live reference data | Real Canton reference/scan service | Safe temporarily |
| `CantonSwapAdapter` | Simulated | Produces a reference route with an unsupported settlement step | Real Canton quote + settlement orchestrator | Safe for architecture demos only |
| `BaseSwapAdapter` | Simulated | Returns a fixed development quote and warning | Real Base swap provider adapter | Must be replaced before any release claiming swap support |
| `UsdReferenceService` | Simulated | Uses static hardcoded prices | Real price/reference service with caching and outage policy | Safe for dev only; must be replaced before production portfolio claims |
| `BaseActivityIndexer` | Stubbed and unused | Exists but is not on the active runtime path | Real local + external Base activity service wired into controller/background | Safe temporarily, but dead code creates confusion |
| `BaseTransactionService` | Thin wrapper and unused | Present as a service boundary, not used in active orchestration | Real transaction service with lifecycle tracking | Safe temporarily |
| `swap-state-machine.ts` | Utility only, not enforced in runtime | The store uses raw state strings directly | Runtime-enforced swap state machine service | Safe temporarily, but weakens correctness |
| Background ping handler | Stub | Only responds to a test-like `jutis:ping` message | Real background orchestration API for approvals, receipts, and session state | Safe temporarily |
| `src/app/content/index.ts` build artifact | Stub | Emits a simple ready event and is no longer referenced by the manifest | Real provider-injection/content bridge if dapp connectivity is added | Safe to keep temporarily, but should be removed or completed |

### Release rule

Anything listed above as mocked, simulated, or stubbed must not be described as production-ready or fully supported.

---

## 4. Highest-Risk Technical Areas

Ranked by severity.

| Rank | Risk area | Why it is risky | What can break | Impact domain | Recommended mitigation | Acceptable environments |
|---|---|---|---|---|---|---|
| 1 | Session and secret lifecycle | The secret currently lives in popup memory; the auto-lock preference is not actually enforcing that session lifecycle | Unlocked state can behave inconsistently; users may over-trust the auto-lock setting | Funds, security, UX | Move unlocked session control into background/session storage, enforce idle timeout centrally, test lock behavior across popup reopen/browser restart | Dev only |
| 2 | Base transaction safety and confirmation depth | Broadcast path is real but confirmation UX is shallow | Failed sends, stuck transactions, misleading status, user confusion around fees or finality | Funds, transaction correctness, UX | Add simulation, richer fee/nonce handling, receipt polling, finality updates, and clearer failure recovery | Dev and limited internal staging only |
| 3 | Canton surface can be mistaken for live support | The app intentionally models Canton, but several visible Canton surfaces still rely on demo/reference behavior | Users may assume balances or activity are live when they are not | Funds perception, identity, UX correctness | Add stronger in-product badges, gating, and deployment-based capability checks before exposing live-looking actions | Dev only |
| 4 | Duplicate architecture inside the repo | There is an older scaffold still present under `src/`, excluded via `tsconfig.json` rather than removed | Future edits may target the wrong runtime path; regressions become more likely | Maintainability, velocity | Remove or archive the old scaffold, keep one active architecture, add CI checks for dead entrypoints | Dev and staging only until cleaned up |
| 5 | Dependence on public Base RPC | Public RPC reliability and rate limits are outside your control | Balance reads, gas estimation, and sends can fail or degrade unpredictably | UX, transaction correctness | Use managed RPCs with monitoring and failover; add retry and health checks | Dev and early beta only |
| 6 | No robust phishing, origin, or dapp permission model | There is no injected provider or domain-approval system yet, but if added hastily it will be high risk | Unsafe transaction approvals or spoofed dapp actions | Funds, security | Design the provider bridge, per-origin permissions, and confirmation copy before shipping any connection feature | Not acceptable for beta/production |
| 7 | Bundle size and runtime efficiency | Shared bundle is still over 500 kB minified | Slower popup startup, poorer extension UX on lower-end devices | Performance, UX | Split code by surface/domain, trim shared dependencies, measure popup open time | Dev and staging acceptable, production should improve |

---

## 5. Production Readiness Gaps

This wallet is not production-ready. The gaps below must be addressed before that claim can be made.

| Area | Current gap | Required action |
|---|---|---|
| Security hardening | No external security review, no hardened secret export/reveal flow, no abuse-resistant confirmation copy | Perform security review, add redaction discipline, implement guarded export and reveal flows |
| Key management | Only one local Base secret path is supported; no account derivation strategy, no hardware wallet support, no secret rotation | Add multi-account/HD strategy, password rotation, export/import safeguards, and eventually hardware or OS-backed options |
| Encryption/storage review | Crypto is real but unaudited; PBKDF2 parameters are not benchmarked per target device class | Review KDF parameters, add corruption handling, test migration/versioning, document threat model formally |
| Transaction confirmation safety | No simulation, no contract metadata review, no spender/approval UX, no destination risk analysis | Add simulation, token metadata checks, allowlist/denylist hooks, approval-specific confirmation screens |
| Phishing/spoofing protection | No dapp origin model, no anti-spoofing copy, no domain permission system | Design and implement connection approvals, origin display, and high-signal transaction review surfaces |
| Extension permission review | Manifest is now reduced, but no full permission audit process exists | Keep least privilege, document why each permission exists, review any future host permission expansion |
| API reliability | Base relies on one public RPC; Canton depends on future deployment-specific services | Add managed providers, health checks, retries, circuit breakers, and per-service fallback policies |
| Error recovery | Errors are displayed, but there is no robust retry, rehydrate, or background recovery path | Add durable transaction state, retriable workflows, and restart-safe reconciliation |
| Observability/logging | No structured telemetry, no privacy-safe event model, no crash/error pipeline | Add opt-in telemetry, privacy-safe error reporting, and health instrumentation |
| Test coverage | No meaningful automated tests are present for active runtime paths | Add unit, integration, extension-runtime, and regression tests; enforce in CI |
| Performance | Large shared bundle; no popup performance budget or bundle policy | Add code splitting, performance measurement, and extension-open latency tracking |
| Compliance/dependency review | No dependency audit or legal/compliance review is documented | Run dependency audit, license review, and security advisory scanning |
| Canton readiness | No live validator/scan/ledger/signer topology is connected | Complete Canton backend/service integration before any real user exposure |
| Swap readiness | No live provider or execution engine is integrated | Add live provider(s), execution tracking, slippage enforcement, and route persistence |

---

## 6. External Requirements

There are two categories here: dependencies currently used by the active runtime, and dependencies required to fulfill the intended product scope.

### 6.1 Currently used by the active runtime

| Dependency | Used for | Required now? | Fallback? | Failure impact |
|---|---|---|---|---|
| `ethers` | Base account derivation, balance reads, gas estimation, transaction submission | Required | No direct fallback in current code | Base wallet functionality fails |
| Web Crypto API | Vault encryption/decryption | Required | No | Wallet cannot create/import/unlock vault |
| `chrome.storage.local` | Persisted vault, preferences, journal | Required | Memory fallback only outside extension runtime | Extension state becomes non-persistent or unusable |
| `chrome.alarms` | Background auto-lock scaffold | Optional for current real behavior, intended for future enforcement | No meaningful fallback | Timed lock remains incomplete |
| Base JSON-RPC endpoint `https://mainnet.base.org` | Balance reads, gas estimation, transaction submission | Required for live Base functionality | No current failover | Base live flows fail or degrade |
| `qrcode.react` | Receive QR rendering | Optional for core wallet logic, required for current receive UI | Could fall back to text-only display | Receive UX degrades only |

### 6.2 Required to fulfill the intended product scope

| Dependency | Used for | Optional or required | Fallback | Failure impact |
|---|---|---|---|---|
| Managed Base RPC provider | Reliable Base balance/send operations | Required for production | Public RPC only as dev fallback | Live Base reliability remains weak |
| Base indexer such as Blockscout API or equivalent | Activity history, receipt enrichment, explorer data | Required for production-quality activity | Local journal only | Incomplete history and weak status tracking |
| Canton validator API | User onboarding, identity/session binding, party attach flow | Required for real Canton wallet behavior | None | Canton cannot be made live |
| Canton scan/reference service | Public/reference data, history, asset visibility | Required for meaningful Canton portfolio/activity | None | Canton portfolio and history remain mocked |
| Canton participant / ledger submission service | Live Canton transfers and settlement | Required | None | Canton send and swap execution remain blocked |
| Canton signer / wallet session / auth issuer | Authenticated Canton operations | Required depending on deployment topology | None | No secure live Canton actions |
| Live swap provider for Base | Real quotes and execution | Required if swap is claimed as supported | None in current code | Swap remains demo-only |
| Live Canton swap/settlement backend | Real Canton swap or CC acquisition flow | Required if Canton swap is claimed | None | Canton swap remains unsupported |
| Live price/reference data provider | Accurate USD values | Required for production-quality USD display | Static local prices only | Misleading portfolio and fee values |
| Canton name or ANS-like resolver | Human-readable identity support | Optional future dependency | Raw party ids | No username resolution |

### Explorer links

- Base explorer deep links are generated from the configured Base explorer URL, but no explorer API integration is currently active.
- Canton explorer/reference URLs are not driving live product behavior today.

---

## 7. Environment Variables and Runtime Configuration

### 7.1 Environment variables

Current state: the active runtime consumes no environment variables.

That means:

- There are no required environment variables in development.
- There are no required environment variables in production.
- There are no secret environment variables in the current build.

This is simple, but it is also a limitation. Important runtime endpoints are currently hardcoded in source instead of being injected via environment or deployment config.

### 7.2 Runtime configuration currently in code

| Config surface | Current role | Sensitive? | Notes |
|---|---|---|---|
| `public/manifest.json` | MV3 permissions, popup path, options path, background worker path | No | Current permissions are `alarms`, `clipboardWrite`, `storage`; host permission is only Base mainnet RPC |
| `src/core/models/fixtures.ts` | Built-in network presets, default Canton identity, feature flags, demo Canton data | No, but operationally important | This is where Base RPC and Canton/Base built-ins are currently defined |
| `src/core/services/usd-reference-service.ts` | Static price map for USD display | No | Dev-only style configuration, not production-safe pricing |
| `vite.config.ts` | Build entrypoints and bundle output paths | No | Controls popup/options/background/content bundle generation |
| Extension storage keys | Persisted runtime state | Some data is sensitive | `jutis:vault`, `jutis:prefs`, `jutis:canton-identity`, `jutis:flags`, `jutis:activity` |

### 7.3 Extension permissions

| Permission | Why it exists now | Required? | Comment |
|---|---|---|---|
| `storage` | Persist vault, preferences, activity journal | Required | Core runtime dependency |
| `alarms` | Background auto-lock scaffold | Optional for current actual behavior, intended for future enforcement | Exists, but full session enforcement is incomplete |
| `clipboardWrite` | Copy receive identifiers from UI | Optional | Could potentially be removed depending on browser behavior and UX choice |
| Host permission `https://mainnet.base.org/*` | Allow Base RPC access | Required for live Base integration | Current single live network dependency |

### 7.4 Build flags and presets

- No custom build flags are currently used.
- Built-in networks are hardcoded to:
  - Canton mainnet metadata, partial support
  - Base mainnet metadata, partial support with real RPC path

### 7.5 Recommended future environment variables

These are not implemented yet, but production will likely need them:

- `VITE_BASE_RPC_URL`
- `VITE_BASE_EXPLORER_URL`
- `VITE_PRICE_API_URL`
- `VITE_CANTON_SCAN_API_URL`
- `VITE_CANTON_VALIDATOR_API_URL`
- `VITE_CANTON_LEDGER_API_URL`
- `VITE_SWAP_PROVIDER_BASE_URL`

Do not treat the above as currently supported. They are recommended future configuration, not current runtime inputs.

---

## 8. Network-Specific Status Breakdown

### 8.1 Canton Network

| Area | Status | Notes |
|---|---|---|
| Account model | Partially working | Party-centric account shape is modeled correctly, but live party binding is not implemented |
| Balance fetching | Mocked | Uses demo asset fixtures, not live Canton holdings |
| Send | Not implemented live | Preview exists; submission is intentionally blocked |
| Receive | Partially working | UI can show a party id if one exists; otherwise it correctly refuses to show a fake receive QR |
| Activity tracking | Mocked / partial | Demo activity plus local notes only; no live scan/indexed history |
| Transaction state tracking | Partial | States are modeled, but there is no live Canton reconciliation |
| Swap | Not implemented live | Reference route only; settlement step is unsupported |
| Pricing / USD reference | Partial | Static prices only |
| Known blockers | Severe | Missing validator/onboarding, scan/reference data, signer/auth path, ledger submission topology |
| Missing infrastructure | Severe | Validator API, scan service, participant/ledger submission service, deployment-specific auth model |

#### Canton conclusion

Canton support is architecturally honest but operationally not live. It is a protocol-aware shell waiting for real backend and service topology.

### 8.2 Base Network

| Area | Status | Notes |
|---|---|---|
| Account model | Working | Local mnemonic/private-key custody with real address derivation |
| Balance fetching | Working with dependency risk | Reads ETH balance from public Base RPC |
| Send | Partially working | Real preview and submission path; no full lifecycle tracking or simulation |
| Receive | Working | Real address and QR are shown |
| Activity tracking | Partial | Only locally initiated journal entries are shown reliably |
| Transaction state tracking | Partial | `submitted` state is real; no durable external confirmation loop |
| Swap | Partial / simulated | UI and dev quote exist; no live provider execution |
| Pricing / USD reference | Partial | Static price reference only |
| Known blockers | Moderate to severe | Missing managed RPC/indexer, live swap provider, confirmation tracking, token management UX |
| Missing infrastructure | Moderate | Managed RPC, explorer/indexer API, swap provider, telemetry and retry/reconciliation services |

#### Base conclusion

Base is the only network with a real end-to-end wallet path in the current build, but it is still below staging quality for handling real users and funds.

---

## 9. Architecture Integrity Review

### What is good and worth keeping

- The active architecture separates UI, state, controller/orchestration, adapters, storage, security, and swap concerns reasonably well.
- Canton and Base are separated at the adapter and domain-type level instead of forcing Canton into EVM assumptions.
- The code explicitly marks support levels (`real`, `partial`, `mocked`, `unsupported`), which is the right honesty model for a multi-network wallet.
- The UI is clearly derived from the local design source rather than invented arbitrarily.

### What is weak

- The repository contains two competing scaffolds:
  - the active newer `src/app`-centric implementation
  - the older excluded scaffold under files like `src/main.tsx`, `src/state/appStore.ts`, and related modules
- `tsconfig.json` solves this by excluding the old path, not by removing it. That is technical debt, not a clean architecture decision.
- Several service abstractions exist but are not part of the runtime path:
  - `BaseActivityIndexer`
  - `BaseTransactionService`
  - `CantonTransferService`
  - `CantonReferenceDataService`
  - the swap state machine utility

### Technical debt introduced during implementation

- Hardcoded network and price configuration in source.
- Public Base RPC dependency baked into fixtures.
- Unused built content-script asset still generated by the build even though the manifest no longer loads it.
- Session handling intent and session handling reality are not fully aligned yet.

### Areas likely to require refactoring soon

- Session management should move out of popup-local assumptions into a deliberate background/session architecture.
- Activity indexing should become a proper network-specific service layer with durable reconciliation.
- Swap needs a real execution service, not just quote surfaces.
- Runtime configuration needs to be externalized from static fixtures.
- Old excluded scaffold files should be removed or archived.

### Are Canton and Base separated correctly?

Mostly yes at the adapter/domain boundary in the active scaffold.

Specifically:

- Base is modeled as address/key custody and JSON-RPC transaction flow.
- Canton is modeled as identity/party-centric and capability-gated.

What is still weak:

- Shared popup flows still present a largely common send/swap shell, with only modest network-specific differentiation.
- Canton does not yet have its own live orchestration stack because the backend and protocol plumbing are not in place.

Verdict:

- The architecture is good enough to continue building on.
- It is not yet clean enough to call stable long-term foundation until the duplicate scaffold and unwired service debt are addressed.

---

## 10. Recommended Next Steps

### Immediate fixes

1. Remove the old excluded scaffold from `src/` or archive it outside the active runtime.
Why it matters: the current duplicate architecture is a maintainability trap and a future regression source.

2. Implement real session storage and enforce auto-lock centrally.
Why it matters: this is the highest-risk mismatch between the UI promise and runtime behavior.

3. Add explicit in-product capability badges for every Canton action.
Why it matters: users must not confuse demo/reference Canton surfaces for live support.

4. Replace static USD pricing with a real reference-data adapter or visibly mark all USD values as estimated/demo.
Why it matters: misleading USD values damage trust quickly in a wallet.

### Short-term production blockers

1. Integrate a managed Base RPC and a Base activity/indexer service.
Why it matters: public RPC plus local journal is not sufficient for real-user reliability.

2. Build transaction reconciliation in the background worker.
Why it matters: `submitted` is not enough; a wallet must converge toward chain truth.

3. Integrate a live Base swap provider behind the existing provider registry.
Why it matters: the current swap surface is not a real product feature.

4. Connect a real Canton topology: validator onboarding, party binding, scan reads, and ledger submission.
Why it matters: without this, Canton remains an architecture demo rather than a supported network.

5. Add automated tests for vault, Base send preview, Base send submission error handling, and state transitions.
Why it matters: wallet regressions are too dangerous to ship without automated coverage.

### Medium-term upgrades

1. Add multi-account support and a deliberate derivation-path strategy.
Why it matters: a serious wallet needs more than a single implicit account.

2. Add ERC-20 portfolio management and token verification flows.
Why it matters: Base support is incomplete without it.

3. Introduce structured telemetry and privacy-safe error reporting.
Why it matters: production support and reliability depend on observability.

4. Split bundles and optimize popup startup performance.
Why it matters: extension UX suffers quickly from heavy popup startup cost.

### Future feature expansions

1. Add custom EVM network management behind explicit validation and permission controls.
Why it matters: extensibility was part of the product goal, but it must not weaken safety.

2. Add Canton naming or address-book support once a real naming layer is available.
Why it matters: this improves usability but should be built on top of real identity infrastructure.

3. Add dapp connection and injected provider support only after a full permission and confirmation model is designed.
Why it matters: this is a major attack surface and should not be rushed.

---

## Final Verdict

Jutis is currently:

- architecturally promising
- visually coherent
- honest about most unsupported Canton behavior
- genuinely real on a narrow Base local-custody path

Jutis is not currently:

- Canton-live
- swap-live
- staging-ready for real funds
- production-ready

That is the correct, honest delivery state of this repository today.
