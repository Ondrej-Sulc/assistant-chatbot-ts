import {ButtonInteraction, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { randomBytes } from "crypto";

export type RepliableInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction;
  
export interface ErrorContext {
  location?: string; // e.g., command name, service name
  userId?: string;
  extra?: Record<string, any>;
}

export function generateErrorId() {
  return randomBytes(4).toString("hex");
}

export function handleError(error: unknown, context: ErrorContext = {}) {
  const errorId = generateErrorId();
  const errorMsg = error instanceof Error ? error.message : String(error);
  const logContext = {
    errorId,
    ...context,
    error: errorMsg,
    stack: error instanceof Error ? error.stack : undefined,
  };
  // Log with context
  console.error(`[Error:${errorId}] ${JSON.stringify(logContext)}`);
  // User message
  const userMessage =
    `❌ An error occurred${
      context.location ? ` in ${context.location}` : ""
    }. ` + `Please try again later. (Error ID: ${errorId})`;
  return { userMessage, errorId };
}

export async function safeReply(
  interaction: RepliableInteraction,
  userMessage: string,
  errorId?: string
) {
  const content = userMessage;
  try {
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, flags: [MessageFlags.Ephemeral] });
      }
    }
  } catch (err) {
    console.error(
      `[safeReply] Failed to reply to interaction (ID: ${interaction.id}, Type: ${interaction.type}): ${JSON.stringify(err)}`
    );
  }
}

