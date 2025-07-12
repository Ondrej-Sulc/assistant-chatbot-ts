import { ButtonInteraction } from "discord.js";

export type ButtonHandler = (interaction: ButtonInteraction) => Promise<void>;

const buttonHandlers = new Map<string, ButtonHandler>();

export function registerButtonHandler(prefix: string, handler: ButtonHandler) {
  buttonHandlers.set(prefix, handler);
}

export function getButtonHandler(customId: string): ButtonHandler | undefined {
  for (const [prefix, handler] of buttonHandlers) {
    if (customId.startsWith(prefix)) return handler;
  }
  return undefined;
} 