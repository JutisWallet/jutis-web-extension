# Canton Capability Matrix

Date: 2026-03-21

## Executive Summary

Jutis does not currently ship live Canton wallet support.

The active product uses Canton-specific domain modeling and capability gating, but the runtime is still limited to:

- reference/demo holdings and activity
- planning-only send UX
- informational receive UX
- unsupported swap execution

This document is the source of truth for how Canton should be described in product copy, UI badges, and release notes.

## Support-State Vocabulary

- `live`: backed by a real Canton integration path that can be used operationally
- `partial`: some protocol-aware behavior is real, but the end-to-end live flow is still incomplete
- `reference-only`: the surface is backed by fixtures, local planning data, or informational metadata rather than live Canton truth
- `unsupported`: the action is intentionally blocked or not implemented

## Capability Matrix

| Canton-facing feature | Current support level | Implementation source | Blocker | Next step to make it real |
|---|---|---|---|---|
| Identity linkage | `reference-only` by default, `partial` only if a non-mock party is manually persisted | `DEFAULT_CANTON_IDENTITY`, stored Canton identity metadata, `CantonReferenceDataService` | No validator onboarding, wallet-session attach flow, or verified external-party linkage in the active runtime | Implement a real party-attach flow, verify topology metadata, and persist only verified live identities |
| Portfolio balances and holdings | `reference-only` | `CANTON_DEMO_ASSETS` through `CantonWalletAdapter.getAssets()` | No live Scan, validator, or participant holdings source | Replace fixture assets with live holdings reads from deployment-specific Canton services |
| CC visibility and prioritization | `reference-only` | Demo CC asset fixture and Canton-first portfolio ordering | CC is not sourced from live settlement or holdings infrastructure | Read real CC positions from the chosen Canton topology and reconcile them into the portfolio snapshot |
| Receive instructions | `unsupported` without a verified party, `partial` if a party id is present in stored metadata | Informational party-centric receive panel in popup overlay, `CantonWalletAdapter.getReceiveInfo()` | No verified live party linkage or topology-specific receive instructions | Verify party linkage, expose only verified receive identifiers, and add deployment-specific receive guidance |
| Send planning | `partial` | Protocol-aware send preview in `CantonWalletAdapter.getSendPreview()` | There is no live signer or ledger submission path | Implement `CantonTransferService` against a real signer and Canton submission backend |
| Send execution | `unsupported` | Explicit fail-closed `CantonWalletAdapter.submitSend()` | Live Canton submission topology is not configured | Add authenticated transfer execution, settlement tracking, and failure reconciliation |
| Activity list | `reference-only` | `CANTON_DEMO_ACTIVITY`, local planning entries, `CantonActivityIndexer` | No live Canton scan or participant-backed activity indexer | Replace fixture activity with live scan/indexed history and reconcile local planning entries against settlement truth |
| Activity detail | `reference-only` | Popup activity detail sheet plus Canton truthfulness card | No canonical Canton transaction/history source | Hydrate detail from live scan, validator, or participant-backed activity records |
| Swap readiness | `unsupported` | `CantonSwapAdapter` readiness metadata surfaced through the shared swap engine | No live Canton quote provider, CC acquisition path, or settlement backend | Integrate a real Canton settlement backend and executable quote provider before enabling quotes |
| Swap quotes | `unsupported` | Fail-closed quote request path when the network is Canton | No public-claim-ready provider exists | Add a live provider with verifiable quote truth and route safety checks |
| Swap execution | `unsupported` | Unsupported execution state in the Canton swap adapter | No executable settlement path exists | Implement settlement orchestration and post-trade tracking |
| Name or username resolution | `unsupported` | Future-facing abstraction only | No live Canton naming or resolution service is wired | Add a real resolver only after a protocol or app-layer naming service is available |

## UI Gating Applied In This Pass

| Surface | Current behavior after gating |
|---|---|
| Welcome / onboarding | Describes Canton as a reference and planning surface, not a live wallet path |
| Home / portfolio | Shows support badges and an explicit Canton status card instead of a live-looking balance summary |
| Asset rows | Canton assets render `reference-only` support badges |
| Recent activity | Canton items render support badges instead of appearing identical to live Base activity |
| Full activity list | Canton entries show support badges and truthfulness copy |
| Activity detail | Canton detail includes a truthfulness card with the current blocker |
| Receive overlay | Shows informational party guidance only; no fake QR is shown for Canton |
| Send overlay | Shows planning-only Canton transfer copy and disables live confirmation |
| Swap screen | Shows Canton swap readiness as unsupported rather than presenting simulated execution as live |
| Settings | Shows Canton identity support badges and per-feature support badges |
| Options page | Shows Canton linkage support state plus a capability-state panel for each feature |

## Implementation Notes

- The active capability source is `src/adapters/canton/services/canton-reference-data-service.ts`.
- Product-facing support badges are rendered through `src/ui/components/kit.tsx`.
- Popup and options surfaces read the same support-state data through `JutisController`, so product copy and support indicators stay consistent.

## Release Guidance

- Do not describe Canton as supported without qualification.
- Do not describe Canton balances or activity as live.
- Do not describe Canton send as executable.
- Do not describe Canton swap or CC acquisition as available.

The most accurate public description today is:

`Jutis includes a protocol-aware Canton surface with explicit capability gating, but live Canton onboarding, holdings, activity, send, and swap still require deployment-specific integration.`
