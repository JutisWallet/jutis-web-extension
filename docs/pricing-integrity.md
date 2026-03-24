# Pricing Integrity

## Executive Summary

Jutis no longer treats every USD number as a plain `number` with implied market truth.

The app now models USD display values as explicit references with a trust level:

- `live`
- `stale`
- `estimated`
- `demo`
- `unavailable`

Current reality:

- there is no live market-data provider wired into the active runtime
- Base and swap USD figures currently come from a static development reference provider
- Canton fixture-driven USD figures are marked as `demo`
- portfolio totals become `unavailable` when visible assets do not all have usable USD references

This is a downgrade in certainty, not an upgrade to live pricing. That is intentional.

## What Changed

### Domain model

USD display values are now represented by `UsdReference` instead of raw numbers:

- file: [src/core/models/types.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\core\models\types.ts)

`UsdReference` carries:

- `value`
- `trustLevel`
- `sourceType`
- `asOf`
- `staleAt`
- `note`

### Service model

The pricing layer now goes through a pricing-reference service and provider boundary:

- file: [src/core/services/usd-reference-service.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\core\services\usd-reference-service.ts)

Current provider:

- `StaticUsdReferenceProvider`

Current behavior:

- ETH and stable references come from a hardcoded development map
- returned trust level is `estimated`
- returned source type is `static-reference`

### UI behavior

The UI now shows trust labels and avoids presenting weak USD values as if they were live:

- portfolio header labels weak totals as `Portfolio USD reference`
- asset rows show both the USD figure and its trust label
- send and swap flows show trust notes for USD amount and fee references
- activity detail shows USD trust when a value exists

Relevant UI files:

- [src/app/popup/App.tsx](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\app\popup\App.tsx)
- [src/app/options/App.tsx](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\app\options\App.tsx)
- [src/lib/format.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\lib\format.ts)

## Pricing Source Type

### Active source types today

| Source type | Used now | Meaning |
| --- | --- | --- |
| `static-reference` | Yes | Hardcoded development price reference, not a live market feed |
| `demo-reference` | Yes | Fixture-driven demo valuation, not protocol or market truth |
| `none` | Yes | No usable USD reference is available |
| `market-feed` | No | Intended future live provider path |
| `cached-market-feed` | No | Intended future stale-but-previously-live provider path |
| `composite` | Yes, for aggregates | Aggregate of multiple references |

### Current source mapping

| Surface | Source type | Trust level |
| --- | --- | --- |
| Base ETH asset valuation | `static-reference` | `estimated` |
| Base send USD amount | inherited from asset | usually `estimated` |
| Base fee USD estimate | `static-reference` | `estimated` |
| Base dev swap fee | `static-reference` | `estimated` |
| Canton fixture asset valuation | `demo-reference` | `demo` |
| Canton fixture activity valuation | `demo-reference` | `demo` |
| Unpriced ERC-20 token | `none` | `unavailable` |

## Freshness Model

### Current freshness behavior

There is no true live freshness guarantee today.

For the active static provider:

- `asOf` is generated when the reference is created
- no meaningful `staleAt` is enforced
- the timestamp is metadata only, not a freshness promise

For demo references:

- `asOf` exists only to indicate when the fixture-derived value was prepared
- it does not indicate market freshness

### Supported but not yet active freshness states

The domain model supports:

- `live`
- `stale`

That allows a future provider to distinguish:

- fresh market data
- cached market data that has aged past its freshness target

That logic is not active yet because no live provider is wired.

## Failure Behavior

### Missing price coverage

If a price cannot be produced:

- the value becomes `unavailable`
- the source type becomes `none`
- the UI shows `--`
- the note explains why the USD reference is missing where surfaced

### Partial portfolio coverage

If any visible asset in an aggregate view has an unavailable USD reference:

- the aggregate portfolio or per-network total becomes `unavailable`
- Jutis does not show a partial numeric total as if it were complete

This is deliberate and is meant to avoid misleading total-portfolio presentation.

### RPC failure vs price failure

Base balance failure and price failure are now distinct concerns:

- balance RPC may fail
- even if balance is known, price may still be unavailable
- UI treats both cases honestly instead of forcing a fake `0 USD`

## User-Visible Trust Level

### Trust levels and their meaning

| Trust level | User meaning |
| --- | --- |
| `live` | Market-derived and within freshness expectations |
| `stale` | Market-derived but older than target freshness |
| `estimated` | Non-live reference value, useful directionally only |
| `demo` | Fixture or demo-only value, not operational truth |
| `unavailable` | No safe USD display value is available |

### Current user-visible contract

What the user can assume today:

- Base USD figures are directional estimates only
- Canton USD figures are demo/reference values tied to fixture data
- missing price coverage suppresses total USD claims instead of faking completeness

What the user must not assume today:

- live market accuracy
- routing-grade swap valuation
- complete token pricing coverage
- production-safe portfolio USD accounting

## Portfolio Integrity Rules

Jutis now follows these rules:

1. If every visible asset has a usable USD reference, an aggregate USD total may be shown.
2. If any visible asset lacks a usable USD reference, the aggregate total becomes unavailable.
3. If the aggregate is not `live` or `stale`, the UI labels it as a reference rather than a trustworthy total.
4. Estimated and demo values are prefixed visually and accompanied by trust text.

## What Is Real Now

Real now:

- the trust model is real
- the provider boundary is real
- the UI trust labeling is real
- aggregate downgrade behavior is real

Not real yet:

- live market data
- stale-cache recovery from a previous live quote
- managed token pricing coverage
- reliable portfolio-grade USD accounting

## What External Dependency Is Still Missing

The missing dependency is a live, production-grade price/reference source.

A proper future provider needs:

- supported asset coverage for Base and Canton-relevant instruments
- freshness policy
- outage behavior
- caching policy
- rate-limit handling
- source attribution and auditability

Without that provider, Jutis should not claim live USD valuation.

## Recommended Next Step

Add a real price provider adapter behind the existing `UsdReferenceService` boundary and only emit `live` or `stale` when:

- quotes are fetched from that provider
- freshness windows are defined
- failure and fallback behavior is implemented

Until then, the current behavior is intentionally conservative:

- Base = estimated
- Canton fixtures = demo
- missing coverage = unavailable
