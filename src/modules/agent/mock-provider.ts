/**
 * Jutis Agent Module — Mock Provider
 *
 * A minimal echo/mock LLM provider for testing without a real API.
 * Responses are keyword-based stubs — NOT real AI.
 *
 * This is NOT a real AI assistant. It demonstrates the provider interface
 * and allows the module to be testable in isolation.
 */

import type {
  AgentProvider,
  AgentConversation,
  AgentIntent,
  AgentCapabilityState,
} from "./types";

/** Keywords recognized in mock mode */
const INTENT_PATTERNS: Array<{ keyword: string; intent: string }> = [
  { keyword: "para geldi", intent: "notify_on_inbound_funds" },
  { keyword: "bildir", intent: "notify_on_inbound_funds" },
  { keyword: "bakiye", intent: "check_balance" },
  { keyword: "balance", intent: "check_balance" },
  { keyword: "arkadaş", intent: "add_friend" },
  { keyword: "friend", intent: "add_friend" },
  { keyword: "telegram", intent: "telegram_setup" },
  { keyword: "notify", intent: "notify_on_inbound_funds" },
  { keyword: "gelen", intent: "notify_on_inbound_funds" },
  { keyword: "giden", intent: "notify_on_outbound_funds" },
];

/** Simple keyword matcher — NOT real NLU */
function mockExtractIntent(userText: string): AgentIntent | null {
  const lower = userText.toLowerCase();
  for (const { keyword, intent } of INTENT_PATTERNS) {
    if (lower.includes(keyword)) {
      return { name: intent, confidence: 0.7, raw: userText };
    }
  }
  return null;
}

/** Deterministic mock response based on last user message */
function mockResponse(userText: string): string {
  const lower = userText.toLowerCase();

  if (lower.includes("para geldi") || lower.includes("bildir")) {
    return (
      "I understand you want to be notified when funds arrive. " +
      "To set this up, I need your Telegram username so I can send you notifications. " +
      "Would you like to share it?"
    );
  }
  if (lower.includes("telegram")) {
    return (
      "I can help you connect Telegram for notifications. " +
      "Please provide your Telegram username (without the @ symbol), " +
      "and I'll register it for wallet alerts."
    );
  }
  if (lower.includes("bakiye") || lower.includes("balance")) {
    return "Your current wallet balance is shown on the Home screen. Is there anything specific you'd like to know about your funds?";
  }
  if (lower.includes("arkadaş") || lower.includes("friend")) {
    return "I can help you find and add friends. Would you like me to open the Friends screen?";
  }
  return (
    "I'm a mock assistant in local mode. " +
    "Try asking about notifications, balance, or friends. " +
    "Real AI responses require a configured LLM provider."
  );
}

export class MockAgentProvider implements AgentProvider {
  name = "MockAgent";
  state: AgentCapabilityState = "mock";

  async complete(conversation: AgentConversation): Promise<string> {
    const lastUserMessage = conversation.messages.filter(
      (m) => m.role === "user"
    ).at(-1);

    if (!lastUserMessage) {
      return "Hello! I'm a mock assistant. How can I help you today?";
    }

    // Simulate async delay
    await new Promise((r) => setTimeout(r, 100));
    return mockResponse(lastUserMessage.content);
  }

  async extractIntent(userText: string): Promise<AgentIntent | null> {
    return mockExtractIntent(userText);
  }
}
