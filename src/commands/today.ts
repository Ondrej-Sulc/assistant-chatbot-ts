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
import { notionService } from "../utils/notionService";
import { config } from "../config";
import { registerButtonHandler } from "../utils/buttonHandlerRegistry";
import { handleError, safeReply } from "../utils/errorHandler";

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
    const { userMessage, errorId } = handleError(error, {
      location: "button:today:complete-task",
      userId: interaction.user?.id,
    });
    await safeReply(interaction, userMessage, errorId);
  }
}

// Register the button handler
registerButtonHandler("complete-task-", handleCompleteTask);

export async function core(params: { userId: string; ephemeral?: boolean }): Promise<CommandResult> {
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

    return {
      content: undefined,
      components: [container],
      isComponentsV2: true,
    };
  } catch (error) {
    const { userMessage } = handleError(error, {
      location: "command:today",
      userId: params.userId,
    });
    return {
      content: userMessage,
      components: [],
      isComponentsV2: false,
    };
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName("today")
    .setDescription("Show today's tasks from Notion tasks database"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const result = await core({ userId: interaction.user.id, ephemeral: true });
    if (result.components && result.components.length > 0) {
      await interaction.editReply({
        ...(result.isComponentsV2
          ? { flags: MessageFlags.IsComponentsV2 }
          : {}),
        components: result.components,
        ...(result.isComponentsV2 ? {} : { content: result.content || undefined }),
      });
    } else {
      await interaction.editReply({
        content: result.content,
      });
    }
  },
} satisfies Command;
