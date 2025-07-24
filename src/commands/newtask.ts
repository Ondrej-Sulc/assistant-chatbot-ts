import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { Command } from "../types/command";
import { notionService } from "../utils/notionService";
import { config } from "../config";
import { parseNaturalDate } from "../utils/dateParser";
import { handleError, safeReply } from "../utils/errorHandler";

// --- CORE LOGIC FUNCTION ---
export async function core(params: {
  userId: string;
  title: string;
  due?: string | null;
}): Promise<{
  content: string | null;
}> {
  try {
    const { title, due } = params;
    let dueDate: string | undefined;
    if (due) {
      const parsed = parseNaturalDate(due);
      if (!parsed) {
        return {
          content: `❌ Could not understand due date: \`${due}\`. Try 'tomorrow', 'next monday', or '2024-08-15'.`,
        };
      }
      dueDate = parsed as string;
    }
    const properties: Record<string, any> = {
      Task: { title: [{ text: { content: title } }] },
      Inbox: { checkbox: true },
      "Kanban - State": { select: { name: "To Do" } },
      Priority: { select: { name: "Medium" } },
    };
    if (dueDate) {
      properties.Due = { date: { start: dueDate } };
    }
    await notionService.createPage({
      parent: { database_id: config.NOTION_TASKS_DATABASE_ID! },
      properties,
    });
    return {
      content: `✅ Created new task: **${title}**${
        dueDate ? ` (Due: ${dueDate})` : ""
      }`,
    };
  } catch (error) {
    console.error("/newtask core error:", error);
    return {
      content: "Failed to create new task. Please try again later.",
    };
  }
}
// --- END CORE LOGIC ---

export default {
  data: new SlashCommandBuilder()
    .setName("newtask")
    .setDescription("Create a new task in Notion tasks database")
    .addStringOption((option) =>
      option.setName("title").setDescription("Task title").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("due")
        .setDescription(
          "Due date. e.g. 'tomorrow', 'next friday', '2024-08-15'"
        )
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const title = interaction.options.getString("title", true);
      const due = interaction.options.getString("due");
      const result = await core({
        userId: interaction.user.id,
        title,
        due,
      });
      await interaction.editReply({
        content: result.content || undefined,
      });
    } catch (error) {
      const { userMessage, errorId } = handleError(error, {
        location: "command:newtask",
        userId: interaction.user.id,
      });
      await safeReply(interaction, userMessage, errorId);
    }
  },
} satisfies Command;
