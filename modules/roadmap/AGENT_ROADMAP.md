# Agent Module Roadmap
*Evolution path for `src/modules/agent/`*

---

## Current Phase

**Status:** Scaffold + Mock provider active

The module is functional in mock mode. A chat conversation can be started, intents extracted (mock), and the Telegram notification bridge is wired.

---

## Roadmap

### Phase 1 — Chat UI Integration (Near-term)
- [ ] Add `ChatScreen` to `src/app/popup/` connected to `agentService`
- [ ] Persist `AgentConversation` to `chrome.storage.local`
- [ ] Connect BottomNav to chat (add Chat NavButton — optional, not required yet)
- [ ] Wire `handleNotificationIntent` results to UI (show Telegram setup prompts)

### Phase 2 — Real LLM Provider (Mid-term)
- [ ] Add `OpenAIProvider` implementing `AgentProvider`
- [ ] Add `AnthropicProvider` implementing `AgentProvider`
- [ ] Add API key storage via `chrome.storage.local` (not hardcoded)
- [ ] Implement proper `extractIntent()` with LLM tool-calling or structured output

### Phase 3 — Wallet Tools (Mid-term)
- [ ] `WalletQueryTool` — query balance, transaction history
- [ ] `FriendAddTool` — trigger friend search and add via `JutisNameService`
- [ ] `NotificationTool` — wire to `telegramNotificationService` (already done via bridge)
- [ ] `CantonEnvironmentTool` — guide user through Canton setup steps

### Phase 4 — Persistent Memory
- [ ] Store conversation history in `chrome.storage.local`
- [ ] Add conversation title/summary extraction
- [ ] Support multi-turn context window (current: full history kept, no truncation)

### Phase 5 — Voice / Multimodal (Long-term)
- [ ] Voice input via Web Speech API
- [ ] Image attachment support (receipts, QR codes)
- [ ] Transaction signing confirmation via chat

---

## Key Interfaces (Stable)

These will not change in backward-incompatible ways without notice:

- `AgentProvider` — provider implementation contract
- `AgentTool` — tool registration contract
- `AgentService.sendMessage()` — primary interaction method
- `handleNotificationIntent()` in `notification-bridge.ts` — Telegram bridge

---

## Open Questions

| Question | Notes |
|---|---|
| Which LLM to support first? | OpenAI is simplest; Anthropic for privacy-conscious users |
| How to handle tool auth? | Wallet tools may need Canton identity confirmation |
| Context window management? | Truncation strategy for long conversations |
| Offline behavior? | Should agent work partially offline (cached responses)? |
