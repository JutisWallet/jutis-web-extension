# Session Security Review

## Scope

This document covers the unlock session and decrypted secret lifecycle for the active Jutis extension runtime after the session-hardening pass completed on 2026-03-21.

It does not claim production-grade wallet custody. It documents what changed, what is enforced now, and what still remains risky.

## Executive Summary

The previous implementation kept the decrypted vault secret in popup-local Zustand state. That made the popup the de facto session owner and left the stored auto-lock preference largely cosmetic.

The new implementation moves active session ownership to a deliberate extension runtime boundary:

- decrypted secret material is stored only in `chrome.storage.session` under a dedicated session record
- the background service worker is the canonical request handler for unlock, lock, refresh, send, and swap-quote flows
- idle expiry is enforced from the stored session timestamps plus a real `chrome.alarms` deadline
- popup close and reopen within the same browser session is intentionally supported
- browser startup intentionally forces a fresh lock

This is materially safer than the previous popup-local model, but it is still not production-grade custody.

## Previous Behavior

### Session ownership

- The popup Zustand store held the unlocked `WalletVaultSecret` directly in popup memory.
- Background auto-lock logic existed only as a partial scaffold and did not control the actual active popup secret.
- Closing the popup implicitly destroyed the in-memory secret, but that was an incidental UI lifecycle effect, not a deliberate security model.

### Auto-lock

- The auto-lock preference was stored in preferences.
- A background alarm could clear `chrome.storage.session`, but the popup session did not rely on `chrome.storage.session`.
- Result: the timer did not actually govern the live unlocked wallet session.

### Reopen behavior

- Popup reopen behavior was inconsistent because the unlocked state depended on whether the popup React tree was still alive.
- Browser lifecycle behavior was not centrally enforced.

### Sensitive material exposure

- Decrypted secret material lived in popup memory for as long as the popup remained open.
- The popup layer could directly drive privileged flows without a runtime session gate.

## New Behavior

### Central session model

The active session is now represented as a `SessionState` record and stored in extension session storage:

- file: [src/core/models/types.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\core\models\types.ts)
- file: [src/storage/vault-repository.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\storage\vault-repository.ts)
- file: [src/core/services/session-service.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\core\services\session-service.ts)

The popup store no longer persists or owns the decrypted vault secret:

- file: [src/state/use-jutis-store.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\state\use-jutis-store.ts)

### Runtime enforcement

The background service worker now acts as the canonical runtime boundary for session-sensitive actions:

- file: [src/app/background/index.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\app\background\index.ts)
- file: [src/app/shared/runtime-dispatcher.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\app\shared\runtime-dispatcher.ts)
- file: [src/app/shared/runtime-client.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\app\shared\runtime-client.ts)

The background listener processes:

- unlock
- lock
- create/import followed by session start
- portfolio refresh
- send preview
- send submit
- swap quote requests
- preference updates that affect auto-lock

The popup talks to that runtime boundary through `chrome.runtime.sendMessage(...)` when running as an extension.

### Idle timeout enforcement

Idle timeout is now real and centrally enforced:

- each unlocked session stores `unlockedAt`, `lastActivityAt`, `expiresAt`, and `autoLockMinutes`
- UI activity calls `touchSession()` on a throttled basis from popup and options surfaces
- privileged runtime requests also refresh the session timestamp
- the background service worker keeps a real `chrome.alarms` deadline aligned with `expiresAt`
- when the deadline is reached, the session is cleared and the wallet returns to locked state

### Popup reopen behavior

Behavior is now intentional:

- closing the popup does not lock the wallet by itself
- reopening the popup within the same browser session will restore the unlocked session if it has not expired
- reopening after expiry will show the unlock screen

### Browser lifecycle behavior

Behavior is now intentional:

- on browser startup, the background worker forces a lock
- on service worker restart within the same browser session, session storage is re-read, expiry is re-checked, and the alarm is re-synced

This means browser restart is treated as a fresh-authentication boundary even if the browser vendor’s in-memory session semantics change in the future.

## Exact Storage And Session Model

### Data at rest

Encrypted vault:

- storage: `chrome.storage.local`
- contents: encrypted `PersistedVault`
- file path: [src/core/services/vault-service.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\core\services\vault-service.ts)

### Active unlocked session

Unlocked session:

- storage: `chrome.storage.session`
- key: `jutis:session`
- contents:
  - `version`
  - `secret`
  - `unlockedAt`
  - `lastActivityAt`
  - `expiresAt`
  - `autoLockMinutes`

The storage access level is explicitly set to `TRUSTED_CONTEXTS`:

- file: [src/storage/extension-storage.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\storage\extension-storage.ts)

That reduces exposure to untrusted extension contexts such as content scripts. It does not make the secret inaccessible to all extension code.

### UI state

Popup and options UI now store only a `SessionSnapshot`:

- `status`
- `unlockedAt`
- `lastActivityAt`
- `expiresAt`
- `autoLockMinutes`

They do not persist the decrypted `WalletVaultSecret`.

### Development fallback

When the app is run outside the extension runtime, `sendRuntimeRequest()` falls back to a local dispatcher path for development:

- file: [src/app/shared/runtime-client.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\app\shared\runtime-client.ts)

In that mode, session state uses the in-memory `MemoryStorage` fallback. This is acceptable for local development convenience, but it is not a secure custody model.

## Session Lifecycle Details

| Event | New behavior |
| --- | --- |
| Create wallet | Vault is created, then unlocked session is started in `chrome.storage.session` |
| Import wallet | Vault is imported, then unlocked session is started in `chrome.storage.session` |
| Unlock | Password decrypts vault, decrypted secret is written to session storage, session timestamps are initialized |
| Popup close | Session remains available until timeout, manual lock, or browser startup lock |
| Popup reopen before expiry | Bootstrap reads session snapshot and restores unlocked UI |
| Popup reopen after expiry | Expired session is cleared and UI returns to unlock |
| Background alarm fires | Session is cleared and alarm is removed |
| Browser startup | Background forces lock and clears any existing unlocked session |
| Manual lock | Session is cleared immediately |
| Portfolio refresh / send / swap quote | Session is validated before action; privileged actions fail with `SESSION_LOCKED` if expired |

## Sensitive Material Handling

### Improvements made

- The decrypted secret is no longer held in popup Zustand state.
- The popup receives only session metadata, not the secret itself.
- Session-sensitive actions now flow through one runtime request surface instead of direct popup-held secret access.
- Expired sessions are cleared immediately on read.
- Idle expiry is tied to real timestamps and a background alarm.

### Tradeoffs that still remain

- The decrypted secret is still stored in extension-managed session storage while unlocked.
- Any trusted extension context with direct code access could still be written to read that session record.
- JavaScript cannot guarantee immediate memory zeroization after object release.
- The runtime dispatcher still exists in shared code so non-extension development can run locally, although the active extension path uses the background worker.

## Known Limits Of Browser-Extension Custody

These limits remain true after the hardening pass:

- `chrome.storage.session` is safer than popup-local UI state for lifecycle control, but it is not a hardware-backed secure enclave.
- Browser extensions do not provide strong isolation comparable to native wallet keystores or audited hardware-wallet flows.
- If the extension itself is compromised, trusted extension contexts can still access session data.
- JavaScript engines do not provide reliable secret zeroization guarantees.
- There is no anti-tamper or attestation layer proving the running extension bundle is unmodified.
- There is no biometric or operating-system-backed keychain integration in the current implementation.

## What Is Still Not Production-Grade

### 1. Decrypted secret residency

The decrypted secret remains accessible in extension session storage for the lifetime of the unlocked session. That is an intentional usability tradeoff for popup reopen support, but it is below a production wallet security bar.

### 2. No dedicated signing boundary

Signing still happens in-process inside extension JavaScript. There is no isolated signer process, hardware wallet integration, remote signing boundary, or audited native bridge.

### 3. Limited activity-based timeout model

The timeout model is driven by:

- popup/options interaction events
- privileged runtime requests
- background alarm enforcement

It does not yet use broader browser-idle signals or page-level heuristic classification. The current model is reasonable for development and internal staging, but it is not deeply hardened.

### 4. No defense-in-depth telemetry

There is no structured audit trail for:

- unlock attempts
- lock reasons
- expiry reasons
- suspicious repeated failures
- abnormal session churn

### 5. No automated security test suite

There are no automated tests covering:

- session expiry
- popup reopen before and after timeout
- browser startup relock semantics
- message routing failure cases
- privileged action rejection after expiry

### 6. No external review

The storage and session design has not been independently security reviewed or audited.

## Recommended Next Security Steps

1. Add automated tests for expiry, startup lock, popup reopen, and privileged-action rejection paths.
2. Move toward an isolated signer boundary or hardware-wallet support for any production custody claim.
3. Add explicit lock-reason telemetry and developer diagnostics without logging secrets.
4. Consider using browser idle signals as a secondary expiry input.
5. Review every trusted extension context to ensure none can read session storage unnecessarily.

## Bottom Line

This pass closes the highest-risk architectural issue identified in the delivery report:

- the popup is no longer the session owner
- auto-lock is no longer cosmetic
- popup reopen and browser startup behavior are now deliberate

It does not make Jutis production-secure. It makes the current extension architecture materially more coherent and safer for ongoing development.
