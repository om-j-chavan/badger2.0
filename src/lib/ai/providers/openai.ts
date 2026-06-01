import OpenAI from "openai";
import { env } from "../../env";
import type {
  AiProvider,
  ChatCompletion,
  ChatMessage,
  ChatOptions,
  ToolCall,
} from "../types";

/**
 * OpenAI adapter. Implements the provider-agnostic AiProvider interface using
 * the Chat Completions API with tool calling. Swappable: any other vendor only
 * needs its own file implementing AiProvider.
 */
export class OpenAiProvider implements AiProvider {
  readonly id = "openai";
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.ai.openaiKey,
      baseURL: env.ai.openaiBaseUrl || undefined,
    });
    this.model = env.ai.openaiModel;
  }

  async chat(options: ChatOptions): Promise<ChatCompletion> {
    const messages = options.messages.map(toOpenAiMessage);

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 800,
      tools: options.tools?.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
    });

    const choice = completion.choices[0]?.message;
    const toolCalls: ToolCall[] = (choice?.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: safeParse(tc.function.arguments),
    }));

    return {
      content: choice?.content ?? "",
      toolCalls,
    };
  }
}

function toOpenAiMessage(
  m: ChatMessage,
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (m.role === "tool") {
    return {
      role: "tool",
      content: m.content,
      tool_call_id: m.toolCallId ?? "",
    };
  }
  return { role: m.role, content: m.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
