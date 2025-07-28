import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { Command, CommandResult } from "../types/command";
import { notionService } from "../utils/notionService";
import { config } from "../config";
import { parseNaturalDate } from "../utils/dateParser";
import { handleError, safeReply } from "../utils/errorHandler";
import { NotionProperties, NotionPagePropertiesInput } from "../types/notion";

export async function core(params: {
  userId: string;
  title: string;
  due?: string | null;
}): Promise<CommandResult> {
  /**
   * The core logic for the /newtask command.
   * Creates a new task in the Notion database.
   * @param params - The parameters for the core function.
   * @param params.userId - The ID of the user who initiated the command.
   * @param params.title - The title of the task.
   * @param params.due - The due date of the task (optional).
   * @returns A promise that resolves to a CommandResult object.
   */
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
    const properties: NotionPagePropertiesInput = {
      [NotionProperties.TASK]: { title: [{ text: { content: title } }] },
      [NotionProperties.INBOX]: { checkbox: true },
      [NotionProperties.KANBAN_STATE]: { select: { name: "To Do" } },
      [NotionProperties.PRIORITY]: { select: { name: "Medium" } },
    };
    if (dueDate) {
      properties[NotionProperties.DUE] = { date: { start: dueDate } };
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
    const { userMessage } = handleError(error, {
      location: "command:newtask:core",
      userId: params.userId,
    });
    return { content: userMessage };
  }
}

export const command: Command = {
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
};
