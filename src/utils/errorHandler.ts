import { Interaction, MessageFlags } from "discord.js";
import { randomBytes } from "crypto";

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
  console.error(`[Error:${errorId}]`, logContext);
  // User message
  const userMessage =
    `❌ An error occurred${
      context.location ? ` in ${context.location}` : ""
    }. ` + `Please try again later. (Error ID: ${errorId})`;
  return { userMessage, errorId };
}

export async function safeReply(
  interaction: any,
  userMessage: string,
  errorId?: string
) {
  const content = errorId
    ? `${userMessage}\n(Error ID: ${errorId})`
    : userMessage;
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content, flags: [MessageFlags.Ephemeral] });
    } else {
      await interaction.reply({ content, flags: [MessageFlags.Ephemeral] });
    }
  } catch (err) {
    // If reply fails, log it
    console.error(`[safeReply] Failed to reply to interaction:`, err);
  }
}
