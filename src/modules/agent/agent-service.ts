/**
 * Jutis Agent Module — Agent Service (Orchestrator)
 *
 * Coordinates provider, tools, and conversation state.
 * Tools are registered adapters — real ones (Telegram, wallet) or mock.
 *
 * This is the main service entry point for the agent module.
 * It is NOT connected to the wallet store or UI by default —
 * callers import this service and use it independently.
 */

import type {
  AgentConfig,
  AgentConversation,
  AgentMessage,
  AgentIntent,
  AgentAction,
  AgentTool,
  AgentProvider,
  AgentReadiness,
} from "./types";
import { MockAgentProvider } from "./mock-provider";

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export class AgentService {
  private provider: AgentProvider;
  private tools: Map<string, AgentTool> = new Map();
  private conversations: Map<string, AgentConversation> = new Map();

  constructor(config?: Partial<AgentConfig>) {
    this.provider = new MockAgentProvider();
    // In the future: swap provider based on config.provider
    // e.g. if (config.provider === "openai") this.provider = new OpenAIProvider(...)
  }

  /** Register a tool the agent can call */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  /** Remove a tool */
  unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  /** List registered tool names */
  listTools(): string[] {
    return [...this.tools.keys()];
  }

  /** Start a new conversation */
  createConversation(metadata?: Record<string, string>): AgentConversation {
    const conv: AgentConversation = {
      id: generateId(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata,
    };
    this.conversations.set(conv.id, conv);
    return conv;
  }

  /** Retrieve an existing conversation */
  getConversation(id: string): AgentConversation | undefined {
    return this.conversations.get(id);
  }

  /** List all conversation IDs */
  listConversations(): string[] {
    return [...this.conversations.keys()];
  }

  /**
   * Send a user message and get an assistant reply.
   * Runs: extract intent → call provider → execute pending actions.
   */
  async sendMessage(
    conversationId: string,
    userText: string
  ): Promise<{ reply: string; intent?: AgentIntent; actions: AgentAction[] }> {
    const conv = this.conversations.get(conversationId);
    if (!conv) throw new Error(`Conversation ${conversationId} not found`);

    const userMsg: AgentMessage = {
      id: generateId(),
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };
    conv.messages.push(userMsg);

    // Extract intent
    let intent: AgentIntent | undefined;
    if (this.provider.extractIntent) {
      intent = (await this.provider.extractIntent(userText)) ?? undefined;
      if (intent) userMsg.intent = intent;
    }

    // Get provider response
    const replyText = await this.provider.complete(conv);
    const assistantMsg: AgentMessage = {
      id: generateId(),
      role: "assistant",
      content: replyText,
      timestamp: Date.now(),
      intent,
    };
    conv.messages.push(assistantMsg);
    conv.updatedAt = Date.now();

    return { reply: replyText, intent, actions: assistantMsg.actions ?? [] };
  }

  /**
   * Push a system message into the conversation (e.g. for context injection).
   */
  addSystemMessage(conversationId: string, content: string): void {
    const conv = this.conversations.get(conversationId);
    if (!conv) return;
    conv.messages.push({
      id: generateId(),
      role: "system",
      content,
      timestamp: Date.now(),
    });
  }

  /** Readiness snapshot */
  getReadiness(): AgentReadiness {
    const blockers: string[] = [];
    if (this.provider.state === "error") {
      blockers.push("Provider in error state");
    }
    if (this.provider.state === "scaffold") {
      blockers.push("No provider configured — only mock mode available");
    }

    return {
      state: this.provider.state,
      provider: this.provider.name,
      toolCount: this.tools.size,
      conversationCount: this.conversations.size,
      summary:
        this.provider.state === "mock"
          ? "Mock provider active — responses are local stubs, not real AI"
          : `${this.provider.name} provider (${this.provider.state})`,
      blockers,
    };
  }

  /** Current provider state */
  getProviderState() {
    return this.provider.state;
  }
}

/** Shared singleton instance — initialized with mock provider */
export const agentService = new AgentService();
