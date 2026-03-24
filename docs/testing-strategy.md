# Testing Strategy

Date: 2026-03-21

## Executive Summary

Jutis previously had no meaningful automated regression coverage on the active runtime.

The initial baseline added in this pass establishes a practical starting point:

- a real test runner on the active TypeScript codebase
- unit coverage for vault security flows
- validation coverage for Base send preview
- transaction lifecycle coverage for Base reconciliation state transitions
- capability-gating coverage for unsupported Canton actions

This is not full wallet-grade coverage yet. It is the minimum credible baseline for catching high-risk regressions on the active runtime path.

## 1. Unit Test Scope

Unit tests should cover deterministic domain and service logic without real network or extension APIs.

Primary scope:

- `src/core/services/vault-service.ts`
- `src/security/crypto.ts`
- `src/core/services/session-service.ts`
- `src/core/services/usd-reference-service.ts`
- `src/lib/support.ts`
- `src/adapters/canton/services/canton-reference-data-service.ts`
- pure validation and transformation logic in Base and Canton adapters
- swap readiness and route filtering logic that does not require a live provider

Unit test goals:

- catch validation regressions early
- protect security-sensitive branches
- verify capability-gating logic
- verify status and trust-state transitions

Current automated baseline in this category:

- vault creation
- vault import validation
- vault unlock success and failure
- Base send preview validation
- Canton capability-state matrix assertions

## 2. Integration Test Scope

Integration tests should cover multi-service behavior inside the active runtime architecture while still mocking external systems.

Primary scope:

- `JutisController` orchestration
- Base transaction submission plus lifecycle persistence
- storage-backed state transitions
- background-triggered reconciliation entrypoints
- adapter plus repository interactions

Integration goals:

- verify that orchestration writes the right records
- verify state survives service boundaries
- verify fail-closed behavior when an adapter is unsupported

Current automated baseline in this category:

- Base transaction lifecycle reconciliation from `submitted` to `pending`
- Base transaction lifecycle reconciliation from `pending` to `confirmed`
- Base transaction lifecycle reconciliation from `submitted` to `failed`

## 3. Extension Runtime Test Scope

Extension runtime tests should validate browser-specific behavior that unit tests cannot prove.

Primary scope:

- popup bootstrap and unlock flow
- popup close and reopen session behavior
- background alarm-driven auto-lock enforcement
- runtime message dispatcher authorization checks
- storage/session behavior across popup and background contexts

Recommended tooling for the next phase:

- Playwright or equivalent Chromium automation
- a lightweight MV3 extension harness that loads the built extension from `dist/`
- controlled fixtures for `chrome.storage`, `chrome.alarms`, and runtime messaging

Status today:

- documented only
- not yet automated in this pass

## 4. Security-Sensitive Regression Scope

These tests are mandatory because regressions here affect funds or custody trust.

Critical regression areas:

- vault encryption and decryption correctness
- unlock failure on wrong password
- session expiry and lock enforcement
- Canton unsupported actions failing closed
- Base send validation rejecting invalid or unsafe input
- transaction lifecycle not skipping directly from local submission to confirmed without chain evidence
- no accidental plaintext persistence of secrets

Current automated baseline in this category:

- vault encryption-backed unlock flow
- wrong-password unlock rejection
- Base send preview validation failures
- Canton live-send hard stop
- Base lifecycle status transition tests

## 5. Manual QA Scope

Manual QA is still required for behaviors that are hard to prove cheaply in pure automation today.

Manual QA checklist:

- onboarding flow across create, import, unlock, and lock
- popup close and reopen behavior while unlocked
- browser restart forcing a fresh lock
- Base send preview and submission UX copy
- Base activity status progression after a real RPC submission
- Canton home, send, receive, activity, and swap surfaces reading as non-live
- copy-to-clipboard receive flows
- settings changes for auto-lock and developer mode
- degraded RPC behavior and user-facing error states

Manual QA remains release-relevant until extension runtime automation exists.

## 6. Release-Blocking Test Cases

The following cases should block release once CI is enforced:

1. Vault can be created, stored encrypted, and unlocked with the correct password.
2. Vault import rejects invalid mnemonic and invalid private key input.
3. Vault unlock fails on the wrong password.
4. Base send preview rejects locked-wallet, invalid-address, and insufficient-balance cases.
5. Base-submitted transactions reconcile to `pending`, `confirmed`, or `failed` from RPC truth.
6. Unsupported Canton send execution throws and does not silently proceed.
7. Canton feature matrix reports `reference-only` or `unsupported` states for non-live features.
8. Session expiry rejects privileged runtime actions after lock.
9. Background reconciliation does not corrupt stored Base transaction history.
10. Build, lint, typecheck, and tests all pass on the same commit.

## Initial Automated Baseline Added In This Pass

Test runner:

- `vitest` via `npm.cmd run test`

Implemented test files:

- `tests/vault-service.test.ts`
- `tests/base-wallet-adapter.test.ts`
- `tests/base-transaction-lifecycle-service.test.ts`
- `tests/canton-capability-gating.test.ts`

Coverage added:

- vault creation
- vault import validation
- vault unlock success
- vault unlock failure
- Base send preview validation
- Base transaction lifecycle transitions
- capability gating for unsupported Canton actions

## What Is Still Hard To Test

These areas remain harder to test well without more harness work:

- full MV3 popup/background/browser lifecycle behavior
- real Chrome alarm timing and session expiry behavior
- real RPC failure and retry timing under browser runtime conditions
- end-to-end Base transaction submission against a disposable chain
- live Canton topology integration, because the required topology is not present locally
- swap execution once a live provider is added

## Which Tests Require Mocking

Mocking is required where the code crosses external or browser-specific boundaries.

Current mocked boundaries:

- repository reads and writes for isolated vault and lifecycle tests
- Base RPC provider methods inside lifecycle tests
- Canton live execution boundary because the product intentionally fails closed there

What should stay mocked in CI:

- public Base RPC
- future price providers
- future Canton validator, scan, ledger, and signer services

What should eventually gain non-mocked coverage outside fast CI:

- Base send against a local chain or deterministic test environment
- extension session and alarm behavior in a Chromium automation harness

## Which Tests Must Run In CI

Required on every PR:

- `npm.cmd run test`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`

Required before production claims:

- all of the above
- extension runtime automation suite
- manual QA checklist completion
- dependency and security review gates

## Immediate Next Test Expansions

1. Add tests for `SessionService` expiry, touch, and lock behavior.
2. Add `JutisController` integration tests for send preview, submit, and snapshot loading.
3. Add runtime-dispatcher tests for lock-state rejection paths.
4. Add background reconciliation tests for alarm-triggered Base sync.
5. Add a Chromium-based extension smoke suite for popup open, unlock, auto-lock, and receive/send overlays.
