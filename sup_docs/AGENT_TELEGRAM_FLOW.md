# Agent ↔ Telegram Flow
*How a user sets up wallet notifications via the future AI chat.*

---

## Example User Flow

**User says:** "Cüzdana para geldiğinde bana bildir"

---

### Step 1 — User Intent Recognized

```
User message → AgentService.sendMessage()
  → MockAgentProvider.extractIntent() → { name: "notify_on_inbound_funds", confidence: 0.7 }
```

*In mock mode: keyword "para geldi" + "bildir" triggers `notify_on_inbound_funds` intent.*

---

### Step 2 — Agent Asks for Telegram Username

```
Agent responds:
"I'd be happy to set up a notification for you.
 What is your Telegram username (without the @ symbol)?"
```

The `handleNotificationIntent()` bridge returns `{ action: "ask_username", ... }` when no username is provided yet.

---

### Step 3 — User Provides Telegram Username

```
User says: "kullanici123"
```

---

### Step 4 — Agent Registers Target + Creates Rule

```
AgentService.sendMessage("kullanici123")
  → handleNotificationIntent({ name: "notify_on_inbound_funds" }, "kullanici123")
  → TelegramNotificationService.registerTarget("kullanici123")
    → chrome.storage.local: { jutis:telegram: { target: { username: "kullanici123", ... } } }
  → TelegramNotificationService.createInboundFundsRule()
    → chrome.storage.local: { jutis:telegram: { rules: [{ trigger: { kind: "inbound_funds" }, ... }] } }
```

---

### Step 5 — Confirmation Shown to User

```
Agent responds:
"Done! I'll notify you on @kullanici123 when funds arrive.
 Note: Live notifications require real event detection to be implemented."
```

---

## What Is and Is Not Live

| Step | Status | Notes |
|---|---|---|
| Intent recognition (mock) | ⚠️ Mock | Keyword match, not real NLU |
| Telegram target storage | ✅ Real | Stored in chrome.storage.local |
| Notification rule storage | ✅ Real | Stored in chrome.storage.local |
| Event detection (inbound funds) | ❌ Not implemented | No Canton event indexer or watcher |
| Telegram delivery | ❌ Mock | `MockTelegramDeliveryAdapter` logs to console |

---

## Honest Capability

At this phase, the full pipeline is **NOT live**. The module correctly stores preferences and rules, but:

- No real AI processes the messages (mock provider only)
- No real event source detects inbound funds on the Canton ledger
- No real Telegram bot sends messages to the user

The infrastructure is modular and ready for these to be plugged in individually.

---

## Future Full Pipeline (When Live)

```
Canton ledger (inbound USDC detected)
       ↓
Wallet event watcher / indexer
       ↓
NotificationRuleEngine.evaluateEvent({ kind: "inbound_funds" })
       ↓
RealTelegramDeliveryAdapter.send("@kullanici123", "🔔 Funds arrived!")
       ↓
Telegram Bot API → User's chat
```

This pipeline is **not yet built**. The infrastructure (types, storage, rule engine, delivery adapter interface) is ready for it.
