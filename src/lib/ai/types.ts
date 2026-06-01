/**
 * Provider-agnostic AI types. Nothing here references a specific vendor SDK so
 * we can swap OpenAI for another provider by writing a new adapter.
 */

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: ToolParameter;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatCompletion {
  content: string;
  toolCalls: ToolCall[];
}

export interface ChatOptions {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface AiProvider {
  readonly id: string;
  chat(options: ChatOptions): Promise<ChatCompletion>;
}

/** A draft action proposed by the AI, awaiting explicit user confirmation. */
export interface DraftAction {
  kind:
    | "create_expense"
    | "create_subscription"
    | "create_distributed_expense"
    | "create_loan"
    | "create_goal";
  label: string;
  summary: string;
  payload: Record<string, unknown>;
}

export interface AssistantResponse {
  reply: string;
  /** Deep links the user can tap to navigate. */
  links?: { title: string; route: string }[];
  /** A proposed data-entry action the user must confirm before it is saved. */
  draft?: DraftAction;
  /** Inline search results, when the message was a search query. */
  search?: { type: string; items: unknown[] };
}
