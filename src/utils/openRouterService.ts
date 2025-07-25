import { config } from "../config";
import { handleError } from "./errorHandler";

const OPEN_ROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenRouterMessage;
    finish_reason: string;
  }>;
}

/**
 * Service for interacting with the OpenRouter API.
 */
export class OpenRouterService {
  private apiKey: string;

  /**
   * Creates an instance of OpenRouterService.
   * @param apiKey - The OpenRouter API key.
   */
  constructor(apiKey: string) {
    if (!apiKey)
      throw new Error("OPEN_ROUTER_API_KEY is not set in environment.");
    this.apiKey = apiKey;
  }

  async chat(request: OpenRouterRequest): Promise<OpenRouterResponse> {
  /**
   * Sends a chat request to the OpenRouter API.
   * @param request - The chat request parameters.
   * @returns A promise that resolves to an OpenRouterResponse.
   */
    try {
      const res = await fetch(OPEN_ROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const errorText = await res.text();
        const { errorId } = handleError(new Error(`OpenRouter API error: ${res.status} ${errorText}`), {
          location: "openRouterService:chat",
          extra: { request },
        });
        throw new Error(`Failed to chat with OpenRouter. (Error ID: ${errorId})`);
      }
      return res.json();
    } catch (error) {
      const { errorId } = handleError(error, {
        location: "openRouterService:chat",
        extra: { request },
      });
      throw new Error(`Failed to chat with OpenRouter. (Error ID: ${errorId})`);
    }
  }
}

export const openRouterService = new OpenRouterService(
  config.OPEN_ROUTER_API_KEY!
);
