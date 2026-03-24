# Swap Architecture

Date: 2026-03-21

## Goal

This document describes the target swap architecture, not the current release state. The active runtime does not claim live swap support today. The intended architecture must support quote gathering, route comparison, fee and slippage review, execution orchestration, and durable state tracking across Base and Canton, while keeping network-specific execution details out of the shared wallet core.

## Core Modules

## `SwapProviderRegistry`

Responsibilities:

- register provider adapters by network and capability
- expose enabled providers for a route request
- support feature flags and environment-specific providers

## `QuoteEngine`

Responsibilities:

- fan out quote requests
- normalize provider responses
- rank routes
- attach USD and fee metadata
- expose warnings and unsupported legs

## `RouteModel`

The shared route shape should include:

- source network and asset
- destination network and asset
- input amount
- expected output
- provider id
- execution steps
- slippage tolerance
- fee breakdown
- USD reference values
- execution support status

## `SwapExecutionService`

Responsibilities:

- run approval or preauthorization steps
- submit transaction steps in order
- update activity journal and swap state
- resume safely after popup close or reload

## `SwapStateMachine`

Required states:

- `idle`
- `quoting`
- `quoted`
- `reviewing`
- `approval-required`
- `executing`
- `submitted`
- `pending`
- `confirmed`
- `failed`
- `unsupported`

## USD Handling

USD is a domain-level concern, not decorative text. Every quote should carry:

- input USD reference
- output USD reference
- fee USD reference
- route impact summary

This depends on `UsdReferenceService`, which can use static development feeds or live price sources later.

## Base Swap Strategy

For Base, Jutis should support real provider-pluggable swap execution. In this scaffold that means:

- shared provider interface
- a development provider implementation
- a normalized HTTP provider adapter contract for future 0x, Uniswap, or custom server-backed routing

The wallet core should never hardcode provider-specific request shapes.

## Canton Swap Strategy

For Canton, the architecture must reflect protocol reality:

- quote and route modeling can exist even when settlement is topology-dependent
- route steps should be token-standard aware
- execution support must be disclosed per route

Expected route support tiers:

- `real`: quote and execute are wired
- `partial`: quote or settlement prep is wired, final execution depends on ledger or signer topology
- `unsupported`: route shown for future architecture only

## Canton Coin Acquisition

CC acquisition should be modeled as a specific Canton route family, not shoved into generic token swap copy. Possible route sources later include:

- validator-hosted token-standard flows
- token-standard compatible DvP or allocation execution
- network-specific buy or bridge entry points

Until those are fully wired, the UI should still expose:

- why the route is unavailable
- what infrastructure is missing
- what the user can do instead

## Approval Model

Base approvals:

- ERC-20 allowance approval when required by route
- then swap execution

Canton approvals:

- token-standard allocation or transfer approval semantics
- or explicit unsupported marker when the route requires infrastructure absent from the current deployment

## Retry Safety

Swap execution must persist:

- current step
- provider id
- intent id
- tx hash or command id
- timestamps

This allows Jutis to recover after popup reload or brief extension suspension.

## User-Facing Rules

1. Never show a best route without showing provider and fee context.
2. Never show executable language for an unsupported Canton leg.
3. Always show slippage and USD reference before final confirmation.
4. Persist swap status into the unified activity feed.
