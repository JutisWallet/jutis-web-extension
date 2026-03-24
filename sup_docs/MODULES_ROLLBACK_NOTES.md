# Modules Rollback Notes
*Every new file added in this phase, why, and how to revert safely.*

---

## New Files Added

| File | Why Added | Revert |
|---|---|---|
| `src/modules/agent/types.ts` | Core type definitions for agent module | Delete file |
| `src/modules/agent/mock-provider.ts` | Mock LLM provider for testing without real API | Delete file |
| `src/modules/agent/agent-service.ts` | Main orchestrator service | Delete file |
| `src/modules/agent/notification-bridge.ts` | Bridge between agent intents and Telegram setup | Delete file |
| `src/modules/agent/index.ts` | Public exports | Delete file |
| `src/modules/telegram/types.ts` | Domain types for notification module | Delete file |
| `src/modules/telegram/storage.ts` | Storage layer for Telegram target and rules | Delete file |
| `src/modules/telegram/telegram-service.ts` | Notification service + delivery adapter + rule engine | Delete file |
| `src/modules/telegram/index.ts` | Public exports | Delete file |
| `AGENT_MODULE_STATUS.md` | Agent module documentation | Delete file |
| `TELEGRAM_MODULE_STATUS.md` | Telegram module documentation | Delete file |
| `AGENT_TELEGRAM_FLOW.md` | User flow documentation | Delete file |
| `MODULES_ROLLBACK_NOTES.md` | This file | Delete file |

---

## Module Dependencies

```
src/modules/agent/
  └── notification-bridge.ts → imports → src/modules/telegram/

src/modules/telegram/
  └── No imports from agent or wallet core
```

**No wallet core files (`src/app/`, `src/state/`, `src/core/`) reference the new modules.**

---

## How to Disable / Revert

### Full Removal

```bash
rm -rf src/modules/agent/
rm -rf src/modules/telegram/
rm AGENT_MODULE_STATUS.md TELEGRAM_MODULE_STATUS.md AGENT_TELEGRAM_FLOW.md MODULES_ROLLBACK_NOTES.md
```

### Selective Removal

| To remove | Command |
|---|---|
| Agent module only | `rm -rf src/modules/agent/` |
| Telegram module only | `rm -rf src/modules/telegram/` (then update agent bridge) |
| Agent → Telegram bridge only | `rm src/modules/agent/notification-bridge.ts` |

### After Removing Telegram Module

Update `src/modules/agent/index.ts` to remove the `handleNotificationIntent` export.

### After Removing Agent Module

No wallet core files reference it — no additional cleanup needed.

---

## Risky Coupling Introduced

| Coupling | Risk | Severity |
|---|---|---|
| `agent/notification-bridge.ts` → `telegram/` | If Telegram module is removed without updating bridge, import breaks | Low — isolated to module |
| `chrome.storage.local` key `jutis:telegram` | Leftover data after module removal | Low — harmless stale data |
| Shared `modules/` folder | Could be mistaken for wallet core | Low — clearly named |

**No coupling to:**
- `src/app/popup/App.tsx`
- `src/state/use-jutis-store.ts`
- `src/core/services/` (Canton services)

---

## Pre-Removal Checklist

- [ ] No wallet UI screens import from `src/modules/agent/` or `src/modules/telegram/`
- [ ] No build errors after removal
- [ ] `chrome.storage.local` stale `jutis:telegram` data acceptable (harmless)
- [ ] No other file imports from the modules (use Grep to verify before removal)
