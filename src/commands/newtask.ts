import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { Command } from "../types/command";
import { notionService } from "../utils/notionService";
import { config } from "../config";
import { parseNaturalDate } from "../utils/dateParser";

// --- CORE LOGIC FUNCTION ---
export async function core(params: {
  userId: string,
  title: string,
  due?: string | null,
}): Promise<{
  content: string | null,
}> {
  try {
    const { title, due } = params;
    let dueDate: string | undefined;
    if (due) {
      const parsed = parseNaturalDate(due);
      if (!parsed) {
        return {
          content: `❌ Could not understand due date: \`${due}\`. Use YYYY-MM-DD, today, tomorrow, or a weekday.`,
        };
      }
      dueDate = parsed as string;
    }
    const properties: Record<string, any> = {
      "Task": { title: [{ text: { content: title } }] },
      "Inbox": { checkbox: true },
      "Kanban - State": { select: { name: "To Do" } },
      "Priority": { select: { name: "Medium" } },
    };
    if (dueDate) {
      properties.Due = { date: { start: dueDate } };
    }
    await notionService.createPage({
      parent: { database_id: config.NOTION_TASKS_DATABASE_ID! },
      properties,
    });
    return {
      content: `✅ Created new task: **${title}**${dueDate ? ` (Due: ${dueDate})` : ""}`,
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
        .setDescription("Due date (YYYY-MM-DD, optional)")
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
      console.error("/newtask command error:", error);
      await interaction.editReply({
        content: "Failed to create new task. Please try again later.",
      });
    }
  },
} as Command;
