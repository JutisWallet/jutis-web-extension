# Agent Module Status
*Module folder: `src/modules/agent/`*

---

## Module Created

**Path:** `src/modules/agent/`

---

## Files Added

| File | Purpose |
|---|---|
| `src/modules/agent/types.ts` | Core domain types |
| `src/modules/agent/mock-provider.ts` | Mock LLM provider (keyword echo, not real AI) |
| `src/modules/agent/agent-service.ts` | Agent orchestrator / service |
| `src/modules/agent/notification-bridge.ts` | Agent → Telegram setup bridge |
| `src/modules/agent/index.ts` | Public exports |

---

## Architecture Summary

```
AgentService (orchestrator)
  ├── AgentProvider (interface)
  │     └── MockAgentProvider ← active by default
  │           └── keyword-based intent extraction
  ├── AgentTool (interface) ← registered by consumers
  └── AgentConversation (state)

NotificationBridge
  └── → TelegramNotificationService
```

---

## What Is Real vs Mock/Scaffold

| Component | Status | Notes |
|---|---|---|
| `AgentService` | ✅ Real | Orchestrator with conversation management |
| `AgentProvider` interface | ✅ Real | Pluggable provider abstraction |
| `MockAgentProvider` | ⚠️ Mock | Echo/keyword responses — NOT real AI |
| Intent extraction | ⚠️ Mock | Keyword matching, not NLU |
| `NotificationBridge` | ✅ Real | Calls Telegram module correctly |
| Real LLM (OpenAI/Anthropic) | ❌ Not integrated | Interface ready, no API key or endpoint |

---

## Current Capability State

**`AgentCapabilityState`**: `"mock"`

The agent is running in mock mode. Responses are deterministic keyword echoes, not real AI. This is intentional — the module is functional and testable without a live LLM API.

---

## How to Configure a Real Provider (Future)

```typescript
import { AgentService } from "./modules/agent";

// When a real provider is available:
const service = new AgentService({ provider: "openai", apiKey: "...", model: "gpt-4" });
// The service will instantiate the real provider when configured
```

Provider implementations are not yet written. The `AgentProvider` interface is ready.

---

## Future Extension Points

| Extension | What to Add |
|---|---|
| OpenAI provider | `modules/agent/openai-provider.ts` implementing `AgentProvider` |
| Anthropic provider | `modules/agent/anthropic-provider.ts` implementing `AgentProvider` |
| Wallet tools | Register `AgentTool` implementations for `wallet_query`, `friend_add`, etc. |
| Persistent conversations | Store `AgentConversation` in `chrome.storage.local` |
| Chat UI | Create `ChatScreen` in `src/app/popup/` wired to `agentService.sendMessage()` |

---

## Module Coupling

**Isolated from wallet core.** Does not import from `src/app/` or `src/state/`. The `notification-bridge.ts` imports from `../telegram/` (sibling module), which is also isolated.

---

## Rollback

To remove the agent module entirely:
```bash
rm -rf src/modules/agent/
```
No wallet core files reference `src/modules/agent/` yet — removal is safe.
