# Telegram Module Roadmap
*Evolution path for `src/modules/telegram/`*

---

## Current Phase

**Status:** Scaffold — target and rule storage work, delivery is mocked, event detection is absent.

The module correctly stores a Telegram username and notification rules. The delivery adapter is `MockTelegramDeliveryAdapter` (logs to console only).

---

## Roadmap

### Phase 1 — Real Delivery Adapter (Near-term)
- [ ] Create a lightweight backend relay service
  - Receives `POST /register` with `username` + `chat_id` (from bot `/start` command)
  - Stores `username → chat_id` mapping
  - Provides `POST /notify` endpoint that receives notification payloads
  - Calls Telegram Bot API `sendMessage` with stored `chat_id`
- [ ] Add `RealTelegramDeliveryAdapter` implementing `TelegramDeliveryAdapter`
- [ ] Add bot token + relay URL to storage via settings screen
- [ ] Switch `telegramNotificationService` to use real adapter

### Phase 2 — Chat ID Registration Flow (Near-term)
- [ ] User initiates Telegram connection in settings
- [ ] System provides a bot username (e.g. `@JutisWalletBot`)
- [ ] User sends `/start` to the bot → bot captures `chat_id`
- [ ] Bot backend registers `username → chat_id` mapping
- [ ] User confirms in app → `registerTarget()` called

### Phase 3 — Real Wallet Event Source (Mid-term)
- [ ] Build Canton event indexer / watcher service
  - Listens to Canton ledger for transfer events involving user's party
  - Fires `inbound_funds` / `outbound_funds` events to `NotificationRuleEngine`
- [ ] Connect to `NotificationRuleEngine.evaluateEvent()`
- [ ] Handle `swap_completed` and `friend_request_received` triggers

### Phase 4 — Rich Notification Content (Mid-term)
- [ ] Include transaction details in message (amount, asset, sender)
- [ ] Include deep link to transaction in Jutis app
- [ ] Support localization (Turkish, English)
- [ ] Add notification preferences (quiet hours, minimum amount thresholds)

### Phase 5 — Multi-Channel (Long-term)
- [ ] Add Email delivery adapter
- [ ] Add Browser Push Notification adapter
- [ ] Unified rule engine that can fan out to multiple channels

---

## Key Interfaces (Stable)

These will not change in backward-incompatible ways without notice:

- `TelegramDeliveryAdapter` — delivery contract
- `TelegramNotificationService.registerTarget()` — target registration
- `TelegramNotificationService.createInboundFundsRule()` / `createOutboundFundsRule()` — rule creation
- `NotificationRuleEngine.evaluateEvent()` — event evaluation entry point
- `WalletEventTrigger` — event type union

---

## Open Questions

| Question | Notes |
|---|---|
| Bot token storage? | Store encrypted in `chrome.storage.local` or backend? |
| Multi-user relay? | Each user needs their own chat_id mapped |
| Privacy? | Username → chat_id mapping is sensitive; must be stored securely |
| Offline notification? | If event fires while user offline, should bot retry? |
| Rate limiting? | Telegram Bot API has send limits (~30 msg/sec) |

---

## Real Delivery Prerequisites

Before moving to `live` state, all of the following must be in place:

1. Telegram Bot created via `@BotFather`
2. Bot token obtained
3. Backend relay service deployed
4. `chat_id` registration flow working
5. `RealTelegramDeliveryAdapter` implemented
6. Canton event indexer operational
7. `NotificationRuleEngine` connected to event source

None of these exist yet in this codebase.
