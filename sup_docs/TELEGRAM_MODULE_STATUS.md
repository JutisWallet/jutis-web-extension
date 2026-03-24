# Telegram Module Status
*Module folder: `src/modules/telegram/`*

---

## Module Created

**Path:** `src/modules/telegram/`

---

## Files Added

| File | Purpose |
|---|---|
| `src/modules/telegram/types.ts` | Domain types: TelegramUserTarget, NotificationRule, WalletEventTrigger, etc. |
| `src/modules/telegram/storage.ts` | Storage layer on chrome.storage.local |
| `src/modules/telegram/telegram-service.ts` | TelegramNotificationService, DeliveryAdapter, RuleEngine |
| `src/modules/telegram/index.ts` | Public exports |

---

## Supported Notification Concepts

### Trigger Types (modeled)
- `inbound_funds` — wallet receives funds
- `outbound_funds` — wallet sends funds
- `swap_completed` — a swap finishes
- `friend_request_received` — new friend request

### Capability States
| State | Meaning |
|---|---|
| `scaffold` | Module exists, no target configured |
| `configured` | Telegram username stored |
| `waiting-for-event-source` | Rules created, no live event detection |
| `ready-for-delivery` | Target + rules set, delivery adapter scaffolded |
| `live` | Real delivery active (requires real bot + event source) |

---

## What Is Stored

Storage key: `jutis:telegram` (chrome.storage.local)

```typescript
{
  version: 1,
  target: {
    username: string,        // without @
    registeredAt: string,     // ISO timestamp
    targetId: string,
    enabled: boolean
  } | null,
  rules: Array<{
    id: string,
    targetId: string,
    trigger: WalletEventTrigger,
    enabled: boolean,
    createdAt: string,
    lastFiredAt?: string,
    description: string
  }>
}
```

---

## What Is NOT Yet Live

| Feature | Status | What's Needed |
|---|---|---|
| Real Telegram bot delivery | ❌ Scaffold | Telegram Bot API token + backend relay service |
| Live wallet event detection | ❌ Scaffold | Canton event indexer or wallet subscription |
| Chat ID storage | ❌ Not needed yet | When real bot is added, need to store user chat_id |
| Webhook receiver | ❌ Not needed yet | For real bot to receive events from Telegram |

---

## Real Telegram Delivery Requirements (Documented for Future)

To move from scaffold to live:

1. **Bot Token**: Create a bot via `@BotFather` on Telegram. Get the `BOT_TOKEN`.
2. **Backend Relay**: The Telegram Bot API cannot send messages to arbitrary users without their `chat_id`. You need a lightweight backend that:
   - Receives `/start` command from users (captures `chat_id`)
   - Stores `username → chat_id` mapping
   - Provides a `POST /notify` endpoint that the wallet calls
   - Calls `https://api.telegram.org/bot{TOKEN}/sendMessage` with the stored `chat_id`
3. **Event Source**: A Canton event indexer or wallet subscription that fires when inbound/outbound funds are detected. This is not yet built.
4. **Delivery Adapter**: Replace `MockTelegramDeliveryAdapter` with `RealTelegramDeliveryAdapter` pointing to the relay backend.

---

## Module Coupling

**Isolated from wallet core.** Does not import from `src/app/` or `src/state/`. The `notification-bridge.ts` in the agent module imports from this module — this is the intended cross-module link.

---

## Rollback

To remove the Telegram module entirely:
```bash
rm -rf src/modules/telegram/
rm src/modules/agent/notification-bridge.ts   # remove cross-module link
```
Then update `src/modules/agent/index.ts` to remove `handleNotificationIntent` export.
