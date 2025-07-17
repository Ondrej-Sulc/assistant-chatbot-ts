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
import { addSchedule, getSchedules, deleteSchedule } from "../utils/sheetsService";
import { registerButtonHandler } from "../utils/buttonHandlerRegistry";
import { startScheduler } from "../utils/schedulerService";

// Button handler for removing schedules
export async function handleRemoveScheduleButton(interaction: ButtonInteraction) {
  try {
    const scheduleId = interaction.customId.replace("remove-schedule-", "");
    await deleteSchedule(scheduleId);
    await interaction.reply({
      content: `🗑️ Schedule removed!`,
      flags: [MessageFlags.Ephemeral],
    });
  } catch (error) {
    console.error("Remove schedule button error:", error);
    await interaction.reply({
      content: "Failed to remove schedule. Please try again later.",
      flags: [MessageFlags.Ephemeral],
    });
  }
}
registerButtonHandler("remove-schedule-", handleRemoveScheduleButton);

export default {
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Manage scheduled tasks")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a new scheduled task")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Type of schedule (reminder, exercise, today, etc)")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("frequency")
            .setDescription("Frequency: daily, weekly, monthly, every, custom")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("time")
            .setDescription("Time(s), e.g. 09:00 or 09:00,18:00")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("command")
            .setDescription("Command to run (e.g., /today, /exercise pullup)")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("target_channel_id")
            .setDescription("Target channel ID (optional)")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("target_user_id")
            .setDescription("Target user ID (optional)")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("day")
            .setDescription("Day of week (for weekly) or day of month (for monthly)")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("interval")
            .setDescription("Interval for 'every' frequency, e.g. 2")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("unit")
            .setDescription("Unit for 'every' frequency: days, weeks")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("cron_expression")
            .setDescription("Custom cron expression (for custom frequency)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all active scheduled tasks")
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a scheduled task by its ID or list number")
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("ID of the schedule to remove (see /schedule list)")
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName("number")
            .setDescription("List number of the schedule to remove (see /schedule list)")
            .setRequired(false)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    const subcommand = interaction.options.getSubcommand(true);
    try {
      if (subcommand === "add") {
        const type = interaction.options.getString("type", true);
        const frequency = interaction.options.getString("frequency", true);
        const time = interaction.options.getString("time", true);
        const command = interaction.options.getString("command", true);
        let target_channel_id = interaction.options.getString("target_channel_id") || undefined;
        let target_user_id = interaction.options.getString("target_user_id") || undefined;
        const day = interaction.options.getString("day") || undefined;
        const interval = interaction.options.getString("interval") || undefined;
        const unit = interaction.options.getString("unit") || undefined;
        const cron_expression = interaction.options.getString("cron_expression") || undefined;

        // Set default target if not provided
        if (!target_channel_id && !target_user_id) {
          if (interaction.channel && interaction.channel.isTextBased() && interaction.guildId) {
            target_channel_id = interaction.channelId;
          } else {
            target_user_id = interaction.user.id;
          }
        }

        await addSchedule({
          type,
          frequency,
          time,
          command,
          target_channel_id,
          target_user_id,
          is_active: true,
          day,
          interval,
          unit,
          cron_expression,
        });
        await startScheduler(interaction.client);
        await interaction.editReply({
          content: `✅ Scheduled task:\n- Type: **${type}**\n- Frequency: **${frequency}**\n- Time: **${time}**\n- Command: \`${command}\`\n${day ? `- Day: ${day}\n` : ""}${interval ? `- Interval: ${interval}\n` : ""}${unit ? `- Unit: ${unit}\n` : ""}${cron_expression ? `- Cron: \`${cron_expression}\`\n` : ""}${target_channel_id ? `- Channel: <#${target_channel_id}>\n` : ""}${target_user_id ? `- User: <@${target_user_id}>\n` : ""}`,
        });
      } else if (subcommand === "list") {
        const schedules = (await getSchedules()).filter((s) => s.is_active);
        if (!schedules.length) {
          await interaction.editReply({ content: "No active schedules found." });
          return;
        }
        const container = new ContainerBuilder();
        const header = new TextDisplayBuilder().setContent("**Active Schedules:**");
        container.addTextDisplayComponents(header);

        schedules.forEach((s, i) => {
          const section = new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**${i + 1}.** [${s.type}] ${s.frequency} at ${s.time} — \`${s.command}\` (ID: \`${s.id}\`)${
                  s.target_channel_id ? ` (<#${s.target_channel_id}>)` : ""
                }${s.target_user_id ? ` (<@${s.target_user_id}>)` : ""}`
              )
            )
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(`remove-schedule-${s.id}`)
                .setLabel("❌")
                .setStyle(ButtonStyle.Secondary)
            );
          container.addSectionComponents(section);
        });
        await interaction.editReply({
          flags: [MessageFlags.IsComponentsV2],
          components: [container],
        });
      } else if (subcommand === "remove") {
        let id = interaction.options.getString("id");
        const number = interaction.options.getInteger("number");
        if (!id && number) {
          const schedules = (await getSchedules()).filter((s) => s.is_active);
          if (number < 1 || number > schedules.length) {
            await interaction.editReply({
              content: `❌ Invalid schedule number. Use /schedule list to see numbers.`,
            });
            return;
          }
          id = schedules[number - 1].id;
        }
        if (!id) {
          await interaction.editReply({
            content: `❌ Please provide either an ID or a list number.`,
          });
          return;
        }
        await deleteSchedule(id);
        await startScheduler(interaction.client);
        await interaction.editReply({
          content: `🗑️ Schedule with ID \`${id}\` has been removed (set inactive).`,
        });
      }
    } catch (error) {
      console.error("Schedule command error:", error);
      await interaction.editReply({
        content: "Failed to manage schedules. Please try again later."
      });
    }
  },
} as Command;