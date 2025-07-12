import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  ButtonInteraction,
} from "discord.js";
import { Command } from "../types/command";
import { notionService } from "../utils/notionService";
import { config } from "../config";
import { registerButtonHandler } from "../utils/buttonHandlerRegistry";

// Button handler for completing tasks
export async function handleCompleteTask(interaction: ButtonInteraction) {
  try {
    // Extract task ID from customId: "complete-task-{taskId}"
    const taskId = interaction.customId.replace("complete-task-", "");

    // Update the task in Notion to mark it as done
    await notionService.updatePage(taskId, {
      properties: {
        Done: { checkbox: true },
      },
    });

    await interaction.reply({
      content: "✅ Task marked as complete!",
      flags: [MessageFlags.Ephemeral],
    });
  } catch (error) {
    console.error("Complete task button error:", error);
    await interaction.reply({
      content: "Failed to mark task as complete. Please try again later.",
      flags: [MessageFlags.Ephemeral],
    });
  }
}

// Register the button handler
registerButtonHandler("complete-task-", handleCompleteTask);

export default {
  data: new SlashCommandBuilder()
    .setName("today")
    .setDescription("Show today's tasks from Notion tasks database"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    try {
      // TODO: Adjust filter for 'today' tasks
      const response = await notionService.queryDatabase(
        config.NOTION_TASKS_DATABASE_ID!,
        {
          filter: {
            and: [
              {
                property: "Due",
                date: {
                  past_month: {},
                },
              },
              {
                property: "Done",
                checkbox: {
                  equals: false,
                },
              },
            ],
          },
          page_size: 20,
        }
      );
      if (!response.results.length) {
        await interaction.editReply({ content: "No tasks found for today!" });
        return;
      }

      const container = new ContainerBuilder();

      container.addTextDisplayComponents([
        new TextDisplayBuilder().setContent("**Today's Tasks:**"),
      ]);

      // Create a section for each task
      response.results.forEach((page, index) => {
        // NotionPage is loosely typed, so treat as Record<string, any> for property access
        const properties = (page as Record<string, any>).properties;
        const titleProp =
          properties &&
          Object.values(properties).find((prop: any) => prop.type === "title");
        const title =
          titleProp && titleProp.title && titleProp.title[0]
            ? titleProp.title[0].plain_text
            : page.id;

        const section = new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${index + 1}.** ${title}`)
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(`complete-task-${page.id}`)
              .setEmoji("☑️")
              .setStyle(ButtonStyle.Secondary)
          );

        container.addSectionComponents(section);
      });

      await interaction.editReply({
        flags: [MessageFlags.IsComponentsV2],
        components: [container],
      });
    } catch (error) {
      console.error("/today command error:", error);
      await interaction.editReply({
        content: "Failed to fetch today's tasks. Please try again later.",
      });
    }
  },
} as Command;
