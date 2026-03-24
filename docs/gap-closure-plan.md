# Gap Closure Plan

Date: 2026-03-21

Source of truth: `docs/final-delivery-report.md`

This plan converts the unresolved gaps in the final delivery report into concrete engineering work. It does not expand scope beyond what the report already identified, and it does not imply any live support that does not exist today.

## 1. Must-Fix Now

### 1.1 Centralize session state and make auto-lock real
- Severity: Critical
- Affected network: security, extension-runtime
- Current state: The unlocked secret lives in popup memory. The auto-lock preference is stored, but the background alarm only clears `chrome.storage.session`, which the active popup flow does not use.
- Target state: Unlocked session state is owned centrally by the background/runtime session layer, idle expiry is enforced from one source of truth, popup reopen and browser restart behavior are deterministic, and the stored auto-lock preference drives the actual alarm schedule.
- Exact code areas likely affected: `src/state/use-jutis-store.ts`, `src/app/background/index.ts`, `src/storage/extension-storage.ts`, `src/storage/vault-repository.ts`, `src/core/services/vault-service.ts`, `src/core/models/types.ts`, `src/app/popup/App.tsx`
- Required for: staging, beta, production
- Work type: implementation, refactor

### 1.2 Remove the excluded legacy scaffold and keep one active architecture
- Severity: Critical
- Affected network: shared, extension-runtime
- Current state: The repo contains two competing app architectures. The newer `src/app` path is active, while the older scaffold remains in the repo and is excluded through `tsconfig.json`.
- Target state: One runtime architecture remains. Dead or superseded entrypoints are removed or archived outside the active runtime, and TypeScript/build config no longer relies on exclusion as the primary control mechanism.
- Exact code areas likely affected: `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `src/state/appStore.ts`, `src/adapters/base/baseAdapter.ts`, `src/adapters/base/baseActivity.ts`, `src/adapters/base/baseSwap.ts`, `src/adapters/canton/cantonAdapter.ts`, `src/adapters/canton/cantonActivity.ts`, `src/adapters/canton/cantonReference.ts`, `src/core/networkRegistry.ts`, `src/core/priceReferenceService.ts`, `src/core/swapRegistry.ts`, `src/core/transactionOrchestrator.ts`, `src/ui/components.tsx`, `src/ui/runtime.tsx`, `src/ui/onboarding.tsx`, `src/styles.css`
- Required for: dev, staging, beta, production
- Work type: cleanup, refactor

### 1.3 Add explicit Canton capability gating and demo-state labeling in the active UI
- Severity: Critical
- Affected network: canton, shared
- Current state: Canton is intentionally non-live, but the UI still presents portfolio, activity, and swap surfaces that can be mistaken for live support if the user does not read the warnings closely.
- Target state: Every Canton surface clearly states whether it is `partial`, `mocked`, or `unsupported`; send, receive, activity, and swap actions are visibly gated by actual capabilities; demo data is unmistakably labeled in-product.
- Exact code areas likely affected: `src/app/popup/App.tsx`, `src/app/options/App.tsx`, `src/core/orchestration/jutis-controller.ts`, `src/core/models/types.ts`, `src/core/models/fixtures.ts`, `src/adapters/canton/canton-wallet-adapter.ts`, `src/adapters/canton/services/canton-activity-indexer.ts`, `src/adapters/canton/services/canton-swap-adapter.ts`
- Required for: dev, staging, beta, production
- Work type: implementation, cleanup

### 1.4 Replace or clearly downgrade static USD pricing
- Severity: High
- Affected network: shared
- Current state: USD values are shown throughout the app, but `UsdReferenceService` is only a static local price map.
- Target state: Either a real price/reference adapter is wired for the supported assets, or every USD amount in the UI is visibly marked as estimated/demo until live pricing exists. The price freshness policy is explicit.
- Exact code areas likely affected: `src/core/services/usd-reference-service.ts`, `src/core/orchestration/jutis-controller.ts`, `src/app/popup/App.tsx`, `src/app/options/App.tsx`, `src/core/models/types.ts`, `src/core/models/fixtures.ts`
- Required for: staging, beta, production
- Work type: implementation, documentation

### 1.5 Align runtime configuration with deployable inputs instead of hardcoded source values
- Severity: High
- Affected network: shared, release
- Current state: Base RPC URLs, demo Canton defaults, and static price behavior are hardcoded in source. The project currently has no environment variable contract.
- Target state: Runtime endpoints and environment-sensitive presets move behind explicit configuration boundaries, with a documented config contract and no hidden production assumptions in fixtures.
- Exact code areas likely affected: `src/core/models/fixtures.ts`, `src/core/services/usd-reference-service.ts`, `src/env.d.ts`, `vite.config.ts`, `package.json`, `README.md`, `START_COMMANDS.md`
- Required for: staging, beta, production
- Work type: infra, refactor, documentation

### 1.6 Remove or intentionally complete unused runtime artifacts
- Severity: Medium
- Affected network: extension-runtime
- Current state: The build still emits a content-script artifact that the manifest no longer loads, and several service-layer wrappers exist without being part of the active runtime path.
- Target state: Unused runtime artifacts are either removed from the build and source tree or fully wired into the runtime with clear purpose and tests.
- Exact code areas likely affected: `vite.config.ts`, `public/manifest.json`, `src/app/content/index.ts`, `src/adapters/base/services/base-activity-indexer.ts`, `src/adapters/base/services/base-transaction-service.ts`, `src/adapters/canton/services/canton-transfer-service.ts`, `src/adapters/canton/services/canton-reference-data-service.ts`, `src/swap/swap-state-machine.ts`
- Required for: dev, staging
- Work type: cleanup, refactor

## 2. Should-Fix Next

### 2.1 Add managed Base RPC configuration and failover policy
- Severity: High
- Affected network: base
- Current state: Base live flows depend on `https://mainnet.base.org` only. There is no failover, health checking, or production RPC strategy.
- Target state: Base RPC access is provided through managed endpoints, with fallback policy, health-check behavior, and documented outage handling.
- Exact code areas likely affected: `src/core/models/fixtures.ts`, `src/adapters/base/base-wallet-adapter.ts`, `src/core/orchestration/jutis-controller.ts`, `docs/base-wallet-architecture.md`, `README.md`
- Required for: beta, production
- Work type: infra, implementation, documentation

### 2.2 Build Base receipt reconciliation and durable activity indexing
- Severity: High
- Affected network: base
- Current state: Locally submitted Base sends are written into a journal, but there is no receipt polling, explorer enrichment, inbound history, or durable transition from `submitted` to `pending`, `confirmed`, or `failed`.
- Target state: A background-driven Base activity pipeline reconciles local sends with chain truth, records receipts, enriches entries with explorer/indexer data, and deduplicates repeated updates.
- Exact code areas likely affected: `src/app/background/index.ts`, `src/core/orchestration/jutis-controller.ts`, `src/adapters/base/services/base-activity-indexer.ts`, `src/adapters/base/services/base-transaction-service.ts`, `src/storage/vault-repository.ts`, `src/state/use-jutis-store.ts`, `src/core/models/types.ts`
- Required for: staging, beta, production
- Work type: implementation, refactor, infra

### 2.3 Deepen Base send safety before release use
- Severity: High
- Affected network: base, security
- Current state: Address validation, basic fee estimation, and broadcast are real, but there is no transaction simulation, no richer error mapping, no explicit nonce or replacement handling, and no contract-risk review for token transfers.
- Target state: Base send has a proper transaction lifecycle service, preflight validation, clearer failure states, replacement handling, and more explicit confirmation data before signing or broadcasting.
- Exact code areas likely affected: `src/adapters/base/base-wallet-adapter.ts`, `src/adapters/base/services/base-transaction-service.ts`, `src/app/popup/App.tsx`, `src/core/models/types.ts`, `src/core/services/errors.ts`, `src/state/use-jutis-store.ts`
- Required for: staging, beta, production
- Work type: implementation, refactor

### 2.4 Complete Base ERC-20 portfolio and token-management support
- Severity: High
- Affected network: base
- Current state: The adapter can interact with ERC-20 contracts, but there is no active token import UI, no token list persistence, no metadata verification, no allowance UX, and no token activity enrichment.
- Target state: Users can add and manage ERC-20 assets intentionally, token metadata is persisted and verified, balances appear in portfolio, and token sends/approvals are reflected in activity and confirmations.
- Exact code areas likely affected: `src/adapters/base/base-wallet-adapter.ts`, `src/app/popup/App.tsx`, `src/state/use-jutis-store.ts`, `src/storage/vault-repository.ts`, `src/core/models/types.ts`, `src/core/models/fixtures.ts`
- Required for: beta, production
- Work type: implementation

### 2.5 Replace the Base swap dev adapter with a live quote and execution path
- Severity: High
- Affected network: base
- Current state: Swap UI is real, but `BaseSwapAdapter` only returns a fixed development quote with no live provider execution.
- Target state: Base swap uses a real provider adapter, supports quote retrieval, route selection, approval handling where needed, execution submission, and swap-state persistence.
- Exact code areas likely affected: `src/adapters/base/services/base-swap-adapter.ts`, `src/swap/quote-engine.ts`, `src/swap/swap-provider-registry.ts`, `src/swap/swap-state-machine.ts`, `src/state/use-jutis-store.ts`, `src/app/popup/App.tsx`, `src/core/models/types.ts`
- Required for: beta, production
- Work type: implementation, infra

### 2.6 Implement real Canton identity onboarding and party attachment
- Severity: High
- Affected network: canton
- Current state: Canton account modeling is correct, but identity remains a default mock and there is no validator or wallet-session onboarding flow.
- Target state: Users can attach a real Canton party through the chosen deployment topology, persist that identity metadata, and expose only the capabilities that the attached topology actually supports.
- Exact code areas likely affected: `src/adapters/canton/canton-wallet-adapter.ts`, `src/adapters/canton/services/canton-reference-data-service.ts`, `src/core/models/types.ts`, `src/core/models/fixtures.ts`, `src/storage/vault-repository.ts`, `src/state/use-jutis-store.ts`, `src/app/popup/App.tsx`, `src/app/options/App.tsx`
- Required for: beta, production
- Work type: implementation, infra

### 2.7 Replace Canton demo holdings and activity with live read paths
- Severity: High
- Affected network: canton
- Current state: Canton balances and activity still come from demo fixtures or reference-mode placeholders.
- Target state: Canton holdings, activity, and reference data are loaded from deployment-specific validator, scan, or indexer services, with clear failure handling and no silent fallback to fake live state.
- Exact code areas likely affected: `src/core/models/fixtures.ts`, `src/adapters/canton/canton-wallet-adapter.ts`, `src/adapters/canton/services/canton-activity-indexer.ts`, `src/adapters/canton/services/canton-reference-data-service.ts`, `src/core/orchestration/jutis-controller.ts`, `src/app/popup/App.tsx`
- Required for: beta, production
- Work type: implementation, infra

### 2.8 Implement Canton transfer submission behind a real topology
- Severity: High
- Affected network: canton
- Current state: Canton send preview exists, but submission is intentionally blocked and `CantonTransferService` is not a live execution path.
- Target state: Canton transfer submission uses the chosen signer/auth model and ledger submission topology, returns durable transaction references, and feeds the activity/status pipeline.
- Exact code areas likely affected: `src/adapters/canton/canton-wallet-adapter.ts`, `src/adapters/canton/services/canton-transfer-service.ts`, `src/core/orchestration/jutis-controller.ts`, `src/core/models/types.ts`, `src/state/use-jutis-store.ts`, `src/app/popup/App.tsx`
- Required for: beta, production
- Work type: implementation, infra

### 2.9 Decide and enforce the Canton swap release boundary
- Severity: High
- Affected network: canton, release
- Current state: `CantonSwapAdapter` only models a reference route and explicitly stops at unsupported settlement.
- Target state: One of two states is chosen and implemented consistently: either live Canton swap/CC acquisition is integrated through a real settlement backend, or all Canton swap entry points are hard-gated from any release claiming swap support.
- Exact code areas likely affected: `src/adapters/canton/services/canton-swap-adapter.ts`, `src/swap/quote-engine.ts`, `src/swap/swap-provider-registry.ts`, `src/state/use-jutis-store.ts`, `src/app/popup/App.tsx`, `docs/feature-matrix.md`, `README.md`
- Required for: beta, production
- Work type: implementation, release, documentation

### 2.10 Add tests and CI gates for the active runtime
- Severity: High
- Affected network: release, shared
- Current state: The active popup/background/runtime path has no meaningful automated tests or enforced CI quality gates.
- Target state: The repo has unit tests for vault and adapter logic, integration tests for store/controller flows, build/typecheck/lint enforcement in CI, and regression coverage for the send/swap/session paths that are actually live.
- Exact code areas likely affected: `package.json`, `tsconfig.json`, new `tests/**`, new `vitest.config.ts` or equivalent, `src/core/services/vault-service.ts`, `src/security/crypto.ts`, `src/adapters/base/base-wallet-adapter.ts`, `src/state/use-jutis-store.ts`, `src/app/background/index.ts`
- Required for: staging, beta, production
- Work type: implementation, infra

### 2.11 Harden wallet security workflows beyond local encryption
- Severity: High
- Affected network: security
- Current state: Local encryption is real, but there is no audited export flow, no reveal-secret workflow, no password rotation path, and no formal KDF parameter review.
- Target state: Secret export/reveal is intentionally guarded, password rotation is supported, storage corruption is handled cleanly, and the cryptographic parameters are documented and reviewed.
- Exact code areas likely affected: `src/core/services/vault-service.ts`, `src/security/crypto.ts`, `src/storage/vault-repository.ts`, `src/app/popup/App.tsx`, `src/core/models/types.ts`, `docs/security-model.md`
- Required for: beta, production
- Work type: implementation, documentation

### 2.12 Add observability, privacy-safe logging, and release health checks
- Severity: Medium
- Affected network: release, security
- Current state: Errors surface in the UI, but there is no structured telemetry, no privacy-safe error pipeline, and no runtime health instrumentation.
- Target state: Production deployments can measure wallet health, RPC failures, reconciliation drift, and swap/transfer failures without leaking secrets or sensitive payloads.
- Exact code areas likely affected: `src/core/services/errors.ts`, `src/app/background/index.ts`, `src/state/use-jutis-store.ts`, `src/core/orchestration/jutis-controller.ts`, `src/adapters/base/**`, `src/adapters/canton/**`, `README.md`
- Required for: beta, production
- Work type: implementation, infra, documentation

## 3. Later But Important

### 3.1 Add multi-account and deliberate derivation-path support
- Severity: Medium
- Affected network: base, shared
- Current state: The wallet assumes one implicitly derived Base account and does not expose account indexing, account creation, or account switching.
- Target state: Account derivation is explicit, multiple local accounts are supported safely, and account metadata persists cleanly across sessions.
- Exact code areas likely affected: `src/core/services/vault-service.ts`, `src/core/models/types.ts`, `src/storage/vault-repository.ts`, `src/state/use-jutis-store.ts`, `src/app/popup/App.tsx`, `src/app/options/App.tsx`
- Required for: production
- Work type: implementation, refactor

### 3.2 Add performance budgeting and split heavy bundles
- Severity: Medium
- Affected network: extension-runtime
- Current state: The shared bundle is still over 500 kB minified, and there is no popup-open performance budget.
- Target state: Popup and options bundles are split intentionally, heavy modules are lazy-loaded where sensible, and bundle size/open time are tracked as release gates.
- Exact code areas likely affected: `vite.config.ts`, `src/app/popup/App.tsx`, `src/app/options/App.tsx`, `package.json`
- Required for: beta, production
- Work type: refactor, infra

### 3.3 Add dependency, license, and compliance review gates
- Severity: Medium
- Affected network: release, docs
- Current state: The project has no documented dependency audit, license review, or release checklist that maps mocked/partial features to allowed release channels.
- Target state: Dependency and license review are part of release preparation, and the release checklist explicitly blocks shipping mocked or unsupported wallet functionality as live.
- Exact code areas likely affected: `package.json`, `README.md`, `docs/feature-matrix.md`, `docs/final-delivery-report.md`, new release-checklist document under `docs/`
- Required for: beta, production
- Work type: release, documentation, infra

### 3.4 Design the dapp permission and origin-trust model before adding connectivity
- Severity: Medium
- Affected network: extension-runtime, security
- Current state: There is no injected provider, no content bridge in use, and no per-origin permission or confirmation model.
- Target state: If dapp connectivity is added later, it launches with origin-scoped permissions, phishing-resistant confirmation copy, and explicit connection state rather than an ad hoc provider bridge.
- Exact code areas likely affected: `public/manifest.json`, `src/app/background/index.ts`, `src/app/content/index.ts`, new provider bridge files under `src/app/`, `src/app/popup/App.tsx`, `docs/security-model.md`
- Required for: beta, production if dapp connectivity enters scope
- Work type: implementation, refactor, documentation

### 3.5 Add safe custom EVM network management
- Severity: Medium
- Affected network: base, shared
- Current state: The app has a built-in network registry only. There is no validated custom network flow.
- Target state: Custom EVM networks can be added only through strict validation, explicit RPC/chain checks, and clear risk disclosure without weakening built-in network safety.
- Exact code areas likely affected: `src/core/services/network-registry.ts`, `src/core/models/types.ts`, `src/storage/vault-repository.ts`, `src/state/use-jutis-store.ts`, `src/app/options/App.tsx`, `src/app/popup/App.tsx`
- Required for: production if custom networks are in scope
- Work type: implementation, documentation

### 3.6 Add Canton naming and address-book support only after real identity plumbing exists
- Severity: Medium
- Affected network: canton
- Current state: There is no real Canton naming resolver or address-book flow. Party ids remain the only honest identifier model in the active runtime.
- Target state: Human-readable names or saved Canton contacts are introduced only after real identity attachment and resolution infrastructure exists, with no fake name-to-party shortcuts.
- Exact code areas likely affected: `src/core/models/types.ts`, `src/adapters/canton/services/canton-reference-data-service.ts`, `src/app/popup/App.tsx`, `src/app/options/App.tsx`, new name-resolution service under `src/adapters/canton/services/`
- Required for: production if naming is in scope
- Work type: implementation, documentation

### 3.7 Expand the options workspace into a real operator surface
- Severity: Low
- Affected network: shared, docs
- Current state: The options page is a workspace shell with support notes and summary cards, but it is not yet the real management surface the product will eventually need.
- Target state: The options page becomes the place for network configuration, identity attach, advanced security settings, feature-flag inspection, and release/debug diagnostics.
- Exact code areas likely affected: `src/app/options/App.tsx`, `src/state/use-jutis-store.ts`, `src/storage/vault-repository.ts`, `src/core/orchestration/jutis-controller.ts`
- Required for: beta, production
- Work type: implementation, documentation

## Suggested Execution Order

### Must-fix now
- 1.1 Centralize session state and make auto-lock real
- 1.2 Remove the excluded legacy scaffold and keep one active architecture
- 1.3 Add explicit Canton capability gating and demo-state labeling in the active UI
- 1.4 Replace or clearly downgrade static USD pricing
- 1.5 Align runtime configuration with deployable inputs instead of hardcoded source values
- 1.6 Remove or intentionally complete unused runtime artifacts

### Should-fix next
- 2.1 Add managed Base RPC configuration and failover policy
- 2.2 Build Base receipt reconciliation and durable activity indexing
- 2.3 Deepen Base send safety before release use
- 2.4 Complete Base ERC-20 portfolio and token-management support
- 2.5 Replace the Base swap dev adapter with a live quote and execution path
- 2.6 Implement real Canton identity onboarding and party attachment
- 2.7 Replace Canton demo holdings and activity with live read paths
- 2.8 Implement Canton transfer submission behind a real topology
- 2.9 Decide and enforce the Canton swap release boundary
- 2.10 Add tests and CI gates for the active runtime
- 2.11 Harden wallet security workflows beyond local encryption
- 2.12 Add observability, privacy-safe logging, and release health checks

### Later but important
- 3.1 Add multi-account and deliberate derivation-path support
- 3.2 Add performance budgeting and split heavy bundles
- 3.3 Add dependency, license, and compliance review gates
- 3.4 Design the dapp permission and origin-trust model before adding connectivity
- 3.5 Add safe custom EVM network management
- 3.6 Add Canton naming and address-book support only after real identity plumbing exists
- 3.7 Expand the options workspace into a real operator surface
