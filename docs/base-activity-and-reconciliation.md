# Base Activity And Reconciliation

## Scope

This document describes the current Base transaction lifecycle, activity truth model, and reconciliation boundaries after the 2026-03-21 reconciliation pass.

It is intentionally narrow. It covers Jutis-submitted Base transactions. It does not claim full inbound or third-party Base account history.

## Executive Summary

Base send is now more than a local append-only journal.

What is real now:

- Base transactions are still broadcast through live EVM RPC using `ethers`
- locally submitted Base transactions are persisted in a dedicated lifecycle store
- pending Base transactions are reconciled against live RPC transaction and receipt data
- status transitions now move intentionally from `submitted` to `pending` to `confirmed` or `failed`
- the background worker keeps reconciling pending Base transactions on an alarm even when the popup is closed

What is still missing:

- there is still no managed Base indexer or explorer API for full account history
- inbound transactions and transactions initiated outside Jutis are still not discoverable from the current implementation
- public RPC is still the only external truth source, which limits reliability and dropped-transaction visibility

## What Is Real Now

### Real submission path

Base send continues to use the live `ethers` RPC path:

- provider: `JsonRpcProvider`
- signing: local Base key material from the Jutis vault
- broadcast:
  - native ETH send through `wallet.sendTransaction(...)`
  - ERC-20 send through `contract.transfer(...)`

Relevant files:

- [src/adapters/base/base-wallet-adapter.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\adapters\base\base-wallet-adapter.ts)
- [src/adapters/base/services/base-transaction-service.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\adapters\base\services\base-transaction-service.ts)

### Real durable lifecycle storage

Submitted Base transactions are now persisted in a dedicated store:

- storage: `chrome.storage.local`
- key: `jutis:base-transactions`
- contents: tracked Base lifecycle records keyed by transaction hash

Relevant files:

- [src/storage/vault-repository.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\storage\vault-repository.ts)
- [src/adapters/base/services/base-transaction-lifecycle-service.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\adapters\base\services\base-transaction-lifecycle-service.ts)

### Real reconciliation

Tracked Base transactions are reconciled against live RPC truth:

- `getTransactionReceipt(hash)` determines whether a receipt exists and whether the receipt status is success or failure
- `getTransaction(hash)` is used when no receipt exists yet, to distinguish "visible on RPC but not mined" from "still not surfaced by this RPC"
- `getBlock(receipt.blockNumber)` is used to derive a confirmation timestamp
- `getBlockNumber()` is used to derive confirmation count

### Real background continuity

The background service worker now runs a dedicated Base reconciliation alarm when pending Base transactions exist:

- alarm name: `jutis:base-reconcile`
- period: 1 minute

That means Base status reconciliation is no longer tied only to popup refresh.

Relevant files:

- [src/app/background/index.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\app\background\index.ts)
- [src/core/orchestration/jutis-controller.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\core\orchestration\jutis-controller.ts)

## Status Transition Model

The current Base lifecycle model is:

| Status | Meaning | Trigger |
| --- | --- | --- |
| `submitted` | Jutis received a transaction hash locally, but the configured RPC has not surfaced the transaction yet | immediate result from `sendTransaction()` or `contract.transfer()` |
| `pending` | The transaction is visible through Base RPC but has no mined receipt yet | `getTransaction(hash)` returns a transaction and `getTransactionReceipt(hash)` is still null |
| `confirmed` | A successful receipt exists onchain | `getTransactionReceipt(hash)` returns a receipt with `status === 1` |
| `failed` | A receipt exists but the onchain execution reverted | `getTransactionReceipt(hash)` returns a receipt with `status === 0` |

Important nuance:

- Jutis does not currently mark a transaction as failed merely because the public RPC cannot find it yet.
- Without a stronger mempool/indexer truth source, that would be too speculative.

## Activity Truth Model

### Before this pass

Base activity was effectively:

- local Jutis send appended to a shared activity journal
- no real Base adapter activity feed
- no live receipt reconciliation

### After this pass

Base activity is now:

- local submission origin
- plus live RPC-derived status truth for those tracked transactions

That is better than a pure local journal, but still not full account history.

### What the user can now trust

For Jutis-submitted Base transactions, the user can now trust:

- whether the transaction is only locally broadcast
- whether the configured RPC sees it as pending
- whether it is confirmed or failed onchain
- confirmation count and block number when available

### What the user still cannot trust as complete history

The user still cannot treat the Base activity list as full wallet history for:

- inbound transfers
- transactions initiated in another wallet
- contract interactions not submitted by Jutis
- old account history before the Jutis lifecycle store existed

## External Dependency Still Missing

The major missing dependency is a managed Base history/indexing source.

Examples of what is still missing:

- reliable account-level historical transaction indexing
- inbound transfer discovery
- richer token transfer decoding
- robust dropped/replaced transaction detection
- explorer-style pagination and filtering

Today the only external truth source is the configured Base RPC endpoint:

- default: `https://mainnet.base.org`

That is enough for receipt truth on known transaction hashes. It is not enough for complete account activity.

## Managed RPC / Indexer Limits

Without a managed RPC or indexer, the following limitations remain:

### 1. Public RPC visibility lag

A transaction can be locally broadcast and still not appear immediately on the configured RPC endpoint. Jutis keeps that state as `submitted` rather than inventing a stronger claim.

### 2. No full account history

Plain RPC is poor at discovering a wallet’s entire historical activity set. Full history typically needs:

- explorer APIs
- indexers
- archive and trace infrastructure
- token transfer indexing

### 3. Weak dropped or replaced transaction insight

Without a mempool-aware or indexer-backed source, Jutis cannot confidently identify:

- dropped transactions
- replaced-by-fee flows
- nonce collisions

### 4. Token transfer enrichment is limited

The current implementation tracks the submitted transfer itself, but it does not decode broader transfer ecosystems around the account.

## Current Architecture

### Durable lifecycle service

The core Base lifecycle logic now lives in:

- [src/adapters/base/services/base-transaction-lifecycle-service.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\adapters\base\services\base-transaction-lifecycle-service.ts)

Responsibilities:

- persist submitted Base transactions
- migrate legacy Base journal entries into the dedicated lifecycle store where possible
- reconcile tracked transactions against live RPC truth
- expose pending-work state for the background scheduler

### Activity indexer boundary

The Base activity indexer now acts as a modular boundary around lifecycle-backed activity assembly:

- [src/adapters/base/services/base-activity-indexer.ts](C:\Users\Nida Bil\Desktop\Jutis-wallet\web-extension-jutis\src\adapters\base\services\base-activity-indexer.ts)

This is the intended future seam for plugging in:

- explorer API history
- managed indexers
- token transfer feeds
- richer confirmation and replacement signals

### Controller integration

The shared controller now:

- uses the Base activity indexer instead of relying on the generic local journal for Base activity
- routes Base submits through the Base transaction service so the lifecycle store is updated immediately
- exposes reconciliation hooks for the background worker

## UI Behavior

Activity detail now surfaces more lifecycle data when available:

- status
- source
- last update
- confirmation timestamp
- confirmation count
- block number
- failure reason

This is still only as accurate as the current RPC source.

## What Remains Limited

This pass improves Base truth significantly, but it does not make Base activity complete or production-perfect.

Still limited:

- no inbound history
- no third-party wallet history
- no token transfer indexing beyond locally submitted transfers
- no replacement/dropped transaction intelligence
- no managed RPC failover
- no explorer/indexer pagination

## Bottom Line

Base now has a real transaction lifecycle instead of a pure local journal illusion.

That means:

- submitted Base sends persist durably
- statuses reconcile toward chain truth
- pending, confirmed, and failed are now intentional states

It still does not mean:

- full Base wallet history
- full inbound activity
- production-grade indexing reliability

Those still require a managed RPC and, more importantly, a real Base indexer or explorer integration.
