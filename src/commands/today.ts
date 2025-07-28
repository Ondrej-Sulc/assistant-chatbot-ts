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
import { Command, CommandResult } from "../types/command";
import { NotionPage, notionService } from "../utils/notionService";
import { config } from "../config";
import { registerButtonHandler } from "../utils/buttonHandlerRegistry";
import { handleError, safeReply } from "../utils/errorHandler";
import { NotionProperties, NotionTaskPage } from "../types/notion";

/**
 * Handles the button interaction for completing a task.
 * @param interaction - The button interaction object.
 */
export async function handleCompleteTask(interaction: ButtonInteraction) {
  try {
    // Extract task ID from customId: "complete-task-{taskId}"
    const taskId = interaction.customId.replace("complete-task-", "");

    // Update the task in Notion to mark it as done
    await notionService.updatePage(taskId, {
      properties: {
        [NotionProperties.DONE]: { checkbox: true },
      },
    });

    await interaction.reply({
      content: "✅ Task marked as complete!",
      flags: [MessageFlags.Ephemeral],
    });
  } catch (error) {
    const { userMessage, errorId } = handleError(error, {
      location: "button:today:complete-task",
      userId: interaction.user?.id,
    });
    await safeReply(interaction, userMessage, errorId);
  }
}

// Register the button handler
registerButtonHandler("complete-task-", handleCompleteTask);

export async function core(params: {
  userId: string;
  ephemeral?: boolean;
}): Promise<CommandResult> {
  /**
   * The core logic for the /today command.
   * Fetches and displays tasks due up to today from Notion.
   * @param params - The parameters for the core function.
   * @param params.userId - The ID of the user who initiated the command.
   * @param params.ephemeral - Whether the reply should be ephemeral.
   * @returns A promise that resolves to a CommandResult object.
   */
  try {
    // TODO: Adjust filter for 'today' tasks
    const response = await notionService.queryDatabase(
      config.NOTION_TASKS_DATABASE_ID!,
      {
        filter: {
          and: [
            {
              property: NotionProperties.DUE,
              date: {
                past_month: {},
              },
            },
            {
              property: NotionProperties.DONE,
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
      return {
        content: "No tasks found for today!",
        components: [],
        isComponentsV2: false,
      };
    }

    const container = new ContainerBuilder();
    container.addTextDisplayComponents([
      new TextDisplayBuilder().setContent("**Today's Tasks:**"),
    ]);

    response.results.forEach((page, index) => {
      const taskPage = page as NotionPage;
      const title =
        taskPage.properties[NotionProperties.TASK].title[0]?.plain_text ||
        page.id;

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

    return {
      content: undefined,
      components: [container],
      isComponentsV2: true,
    };
  } catch (error) {
    const { userMessage } = handleError(error, {
      location: "command:today:core",
      userId: params.userId,
    });
    return {
      content: userMessage,
      components: [],
      isComponentsV2: false,
    };
  }
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("today")
    .setDescription("Show today's tasks from Notion tasks database"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    try {
      const result = await core({ userId: interaction.user.id, ephemeral: true });
      if (result.components && result.components.length > 0) {
        await interaction.editReply({
          ...(result.isComponentsV2
            ? { flags: [MessageFlags.IsComponentsV2] }
            : {}),
          components: result.components,
          ...(result.isComponentsV2
            ? {}
            : { content: result.content || undefined }),
        });
      } else {
        await interaction.editReply({
          content: result.content,
        });
      }
    } catch (error) {
      const { userMessage, errorId } = handleError(error, {
        location: "command:today",
        userId: interaction.user.id,
      });
      await safeReply(interaction, userMessage, errorId);
    }
  },
};
