import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { Command } from "../types/command";
import { notionService } from "../utils/notionService";
import { config } from "../config";
import { parseNaturalDate } from "../utils/dateParser";

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
      let dueDate: string | undefined;
      if (due) {
        const parsed = parseNaturalDate(due);
        if (!parsed) {
          await interaction.editReply({
            content: `❌ Could not understand due date: \`${due}\`. Use YYYY-MM-DD, today, tomorrow, or a weekday.`,
          });
          return;
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
      // You can add more default properties here if needed
      await notionService.createPage({
        parent: { database_id: config.NOTION_TASKS_DATABASE_ID! },
        properties,
      });
      await interaction.editReply({
        content: `✅ Created new task: **${title}**${
          dueDate ? ` (Due: ${dueDate})` : ""
        }`,
      });
    } catch (error) {
      console.error("/newtask command error:", error);
      await interaction.editReply({
        content: "Failed to create new task. Please try again later.",
      });
    }
  },
} as Command;
