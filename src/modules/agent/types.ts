/**
 * Jutis Agent Module — Core Types
 *
 * Wallet-style AI assistant infrastructure.
 * Provider-agnostic, modular, runnable in mock mode without a real LLM API.
 *
 * Capability state:
 * - scaffold: module exists but no provider configured
 * - mock: mock provider active, responses are local/echo
 * - configured: real provider endpoint configured, not yet tested
 * - ready: provider confirmed responsive
 * - error: provider failed
 */

export type AgentCapabilityState =
  | "scaffold"
  | "mock"
  | "configured"
  | "ready"
  | "error";

/** A single turn in a conversation */
export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  intent?: AgentIntent;
  actions?: AgentAction[];
}

/** A logical grouping of messages forming a session */
export interface AgentConversation {
  id: string;
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, string>;
}

/** What the user wants to accomplish */
export interface AgentIntent {
  name: string; // e.g. "notify_on_inbound_funds", "check_balance", "add_friend"
  params?: Record<string, string | boolean | number>;
  confidence: number; // 0–1
  raw?: string; // original user text
}

/** Something the agent can do, either immediately or by calling a tool */
export interface AgentAction {
  type: string; // e.g. "telegram_setup", "store_preference", "query_wallet"
  params?: Record<string, string | boolean | number>;
  status: "pending" | "executed" | "failed";
  result?: string;
}

/** A callable capability exposed to the agent */
export interface AgentTool {
  name: string; // e.g. "telegram_register", "wallet_query", "friend_add"
  description: string;
  execute(params: Record<string, string | boolean | number>): Promise<AgentToolResult>;
}

/** Result returned by a tool execution */
export interface AgentToolResult {
  ok: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

/** Abstraction over LLM providers (OpenAI, Anthropic, local, mock, etc.) */
export interface AgentProvider {
  /** Short name for display */
  name: string;

  /** Current capability state */
  state: AgentCapabilityState;

  /**
   * Send a conversation and receive a text reply.
   * Returns the assistant's message content.
   * Throws if the provider is unavailable.
   */
  complete(conversation: AgentConversation): Promise<string>;

  /**
   * Optional: extract structured intent from user text.
   * Falls back to keyword matching if not implemented.
   */
  extractIntent?(userText: string): Promise<AgentIntent | null>;
}

/** Agent configuration — which provider and which tools are enabled */
export interface AgentConfig {
  provider: "mock" | "openai" | "anthropic" | "custom";
  endpoint?: string; // for custom providers
  apiKey?: string; // stored in chrome.storage, not here
  model?: string;
  tools: string[]; // enabled tool names
}

/** Agent readiness snapshot */
export interface AgentReadiness {
  state: AgentCapabilityState;
  provider: string;
  toolCount: number;
  conversationCount: number;
  summary: string;
  blockers: string[];
}
