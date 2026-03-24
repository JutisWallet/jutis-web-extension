# Swap Readiness

## Executive Summary

Jutis does not currently have public-ready swap support.

After this pass:

- simulated Base quotes are no longer surfaced as if they were live market routes
- Canton reference-only swap paths are no longer surfaced as executable routes
- the swap UI is now a readiness surface, not a misleading quote surface
- unsupported paths fail closed at the provider and quote-engine layers

Current release judgment:

- Base swap: not live
- Canton swap: not live
- public swap claim: not justified

## Current Provider Model

| Network | Provider | Quote truth | Execution readiness | Public-claim ready | Runtime behavior |
| --- | --- | --- | --- | --- | --- |
| Base | `Base Development Quote Adapter` | `simulated` | `blocked` | `false` | Exposed only as readiness metadata; quote requests are blocked |
| Canton | `Canton Reference Swap Adapter` | `reference-only` | `unsupported` | `false` | Exposed only as readiness metadata; quote requests are blocked |

There is no active provider in the current runtime with all of the following:

- `quoteTruth === live`
- `executionReadiness === ready`
- `publicClaimReady === true`

Because of that, the quote engine intentionally returns no live routes.

## Audit Of The Active Swap Surface

### Real

These parts are real and active:

| Area | Status | Notes |
| --- | --- | --- |
| `SwapProviderRegistry` | Real | Registers network-specific provider adapters and now exposes readiness metadata |
| `QuoteEngine.getReadiness()` | Real | Computes whether a network has any live, executable, publicly claimable swap provider |
| Quote filtering | Real | `QuoteEngine.getQuotes()` now filters out any provider that is not live, execution-ready, and public-claim ready |
| Runtime readiness path | Real | `jutis:swap-readiness` returns network readiness to the popup |
| Fail-closed UI | Real | Swap screen now communicates readiness, blockers, and provider model instead of showing misleading simulated routes |

### Partial

These parts are architecturally present but not complete:

| Area | Status | Limitation |
| --- | --- | --- |
| Shared quote model | Partial | Route shapes and provider interfaces exist, but no live provider implementation is registered |
| Swap state in store | Partial | Runtime still tracks swap state labels, but the active path currently stops at readiness and unsupported states |
| USD reference on swap | Partial | Fee/reference values can be modeled, but no live provider currently supplies live quotes or execution costs |

### Simulated

These parts remain simulated or non-live, but are no longer presented as public-ready swap features:

| Area | Status | Current treatment |
| --- | --- | --- |
| Base development quote adapter | Simulated | Still exists as a provider classification, but does not surface user-visible quotes |
| Canton reference adapter | Reference-only | Still exists as a provider classification, but does not surface executable or quote-like routes |

### Dead Code Or Inactive Future Hooks

These parts exist but are not currently enforced in the active runtime:

| Area | Status | Why it is dead or inactive |
| --- | --- | --- |
| `src/swap/swap-state-machine.ts` | Dead utility | No active runtime path uses it to govern swap transitions |
| `SwapLifecycleState` execution-oriented states (`reviewing`, `approval-required`, `executing`, `submitted`, `pending`, `confirmed`) | Inactive future hooks | No swap execution service currently drives those states |
| Route execution steps in the old simulated adapters | Inactive after fail-closed pass | The providers no longer return user-facing routes, so those execution-step surfaces are not active |

## Execution Readiness

### Base

Base swap is not execution-ready.

What is missing:

- a live quote provider
- real provider request/response normalization
- approval handling for ERC-20 routes
- swap execution submission
- durable swap lifecycle tracking
- result reconciliation and failure recovery

### Canton

Canton swap is not execution-ready.

What is missing:

- live quote or discovery source for CC acquisition or token conversion
- executable settlement path
- participant/validator/ledger integration for settlement
- transaction and settlement reconciliation

## Unsupported Flows

The following flows are explicitly unsupported in the current release:

### Base

- live quote retrieval
- route selection from real providers
- ERC-20 approval orchestration for swap
- swap execution
- tracking swap submission to settlement

### Canton

- quote retrieval from a live Canton provider
- CC acquisition through a live route
- token conversion settlement
- any claim of executable Canton swap support

## Fail-Closed Behavior

Unsupported swap paths now fail closed in these ways:

1. Providers that are not live and executable are not used by `QuoteEngine.getQuotes()`.
2. The Base and Canton swap adapters throw capability errors if quote methods are called directly.
3. The popup disables the quote CTA unless readiness says a live provider exists.
4. The swap screen shows blockers and provider truth instead of simulated outputs.

This is intentional. No current path should make a user believe swap is live.

## Base And Canton Separation In The UI

The UI now distinguishes Base and Canton swap capability explicitly:

- Base shows a simulated-development provider classification with blocked execution
- Canton shows a reference-only provider classification with unsupported execution

That difference matters:

- Base has an EVM-shaped swap architecture target, but no live provider is wired
- Canton has a protocol-specific settlement problem and cannot inherit Base execution assumptions

## What Is Required Before Claiming Swap Support Publicly

Jutis should not claim swap support publicly until all of the following are true for the relevant network:

1. A live provider is configured and marked `publicClaimReady`.
2. Quote retrieval is backed by a real market/provider integration.
3. Execution is wired end to end, not just quote retrieval.
4. Approval and pre-execution steps are handled where required.
5. Swap status is durably tracked across popup close and service-worker restarts.
6. Failure, retry, and reconciliation behavior are implemented and tested.
7. USD fee and route presentation reflects live provider data rather than static references.

For Canton specifically, add:

8. A live settlement topology exists and is integrated.
9. CC acquisition or equivalent route family is executable, not just modeled.

## Bottom Line

The current swap stack is now honest:

- architecture exists
- readiness metadata exists
- public-facing execution does not exist

That is better than simulated route cards, but it is still not swap support.
