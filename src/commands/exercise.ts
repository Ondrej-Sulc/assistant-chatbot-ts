import { Command, CommandResult } from "../types/command";
import {
  ExerciseType,
  ExerciseSheetRow,
  ExerciseSubcommand,
} from "../types/exercise";
import { config } from "../config";
import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  CacheType,
  MessageFlags,
  ButtonInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  InteractionReplyOptions,
} from "discord.js";
import { sheetsService } from "../utils/sheetsService";
import { registerButtonHandler } from "../utils/buttonHandlerRegistry";
import { formatDate } from "../utils/dateUtils";
import { handleError, safeReply } from "../utils/errorHandler";
import { generateExerciseChart } from "../utils/exerciseChartUtils";

const EXERCISE_SHEET_ID = config.EXERCISE_SHEET_ID;
const EXERCISE_SHEET_NAME = "Logs";
const SHEET_RANGE = `${EXERCISE_SHEET_NAME}!A:D`;
const DEFAULT_TIMEZONE = config.TIMEZONE || "Europe/Prague";

function mapSheetRowsToExerciseSheetRows(rows: any[][]): ExerciseSheetRow[] {
  return rows.map((row) => ({
    date: row[0] as string,
    pushups: parseInt(row[2] || "0", 10),
    pullups: parseInt(row[3] || "0", 10),
  }));
}

/**
 * Logs exercise reps for the current day
 * @param exerciseType - Type of exercise (pushup or pullup)
 * @param amount - Number of reps to log
 */
async function logExercise(exerciseType: ExerciseType, amount: number) {
  const now = new Date();
  const todayStr = formatDate(now, DEFAULT_TIMEZONE);

  // Read all rows from the sheet
  let rawRows =
    (await sheetsService.readSheet(EXERCISE_SHEET_ID, SHEET_RANGE)) || [];
  let rows: ExerciseSheetRow[] = mapSheetRowsToExerciseSheetRows(rawRows);
  // Find today's row (by column A)
  let todayRowIdx = rows.findIndex((row) => row.date === todayStr);
  if (todayRowIdx === -1) {
    // Row for today not found, append it (leave column B blank)
    const newRow: ExerciseSheetRow = {
      date: todayStr,
      pushups: 0,
      pullups: 0,
    };
    rows.push(newRow);
    todayRowIdx = rows.length - 1;
  }
  // Update the correct cell (C or D)
  const row = rows[todayRowIdx];
  if (exerciseType === "pushup") {
    row.pushups += amount;
  } else {
    row.pullups += amount;
  }
  rows[todayRowIdx] = row;
  // Write back only the updated row (A, B, C, D)
  const writeRange = `${EXERCISE_SHEET_NAME}!A${todayRowIdx + 1}:D${
    todayRowIdx + 1
  }`;
  await sheetsService.writeSheet(EXERCISE_SHEET_ID, writeRange, [
    [row.date, "", row.pushups, row.pullups],
  ]);
}

// Handler for button interactions
export async function handleButton(interaction: ButtonInteraction) {
  // customId format: exercise-pushup-10-<userId>
  const match = interaction.customId.match(/^exercise-(pushup|pullup)-(\d+)-/);
  if (!match) {
    await safeReply(interaction, "Unknown button.");
    return;
  }
  const exerciseType = match[1] as ExerciseType;
  const amount = parseInt(match[2], 10);
  try {
    await logExercise(exerciseType, amount);
    await interaction.reply({
      content: `Logged ${amount} ${exerciseType}${
        amount === 1 ? "" : "s"
      } for today!`,
      flags: [MessageFlags.Ephemeral],
    });
  } catch (error) {
    const { userMessage, errorId } = handleError(error, {
      location: `button:exercise-${exerciseType}-${amount}`,
      userId: interaction.user.id,
    });
    await safeReply(interaction, userMessage, errorId);
  }
}

// Register the handler for all exercise- buttons
registerButtonHandler("exercise-", handleButton);

/**
 * Core logic for the exercise command
 * @param params - Parameters including userId, subcommand, amount, and timeframe
 */
export async function core(params: {
  userId: string;
  subcommand: string;
  amount?: number | null;
  timeframe?: string | null;
}): Promise<CommandResult> {
  const { subcommand, amount, timeframe } = params;
  // --- STATS SUBCOMMAND ---
  if (subcommand === ExerciseSubcommand.Stats) {
    // Read all rows from the sheet
    let rawRows =
      (await sheetsService.readSheet(EXERCISE_SHEET_ID, SHEET_RANGE)) || [];
    let rows: ExerciseSheetRow[] = mapSheetRowsToExerciseSheetRows(rawRows);
    // Remove header if present (assume header if first row is not a date)
    if (
      rows.length &&
      isNaN(Date.parse(rows[0].date?.split("/").reverse().join("-")))
    ) {
      rows = rows.slice(1);
    }
    const now = new Date();
    const todayStr = formatDate(now, DEFAULT_TIMEZONE);
    // If no timeframe, show today's stats
    if (!timeframe) {
      const todayRow = rows.find((row) => row.date === todayStr);
      let pushups = 0;
      let pullups = 0;
      if (todayRow) {
        pushups = todayRow.pushups;
        pullups = todayRow.pullups;
      }
      const message =
        `**Exercise Stats for Today (${todayStr})**\n\n` +
        `:muscle: Pushups: **${pushups}**\n` +
        `:weight_lifter: Pullups: **${pullups}**`;
      return { content: message };
    }
    // Map timeframe to days
    const daysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "365d": 365,
    };
    const days = daysMap[timeframe] || 7;
    const MAX_POINTS = 60;
    // Find today's row index
    let todayIdx = rows.findIndex((row) => row.date === todayStr);
    if (todayIdx === -1) {
      todayIdx = rows.length - 1;
    }
    const startIdx = Math.max(0, todayIdx - days + 1);
    const selectedRows = rows.slice(startIdx, todayIdx + 1);
    const data = selectedRows.map((row) => ({
      date: row.date,
      pushups: row.pushups,
      pullups: row.pullups,
    }));
    let chartData: ExerciseSheetRow[] = [];
    if (data.length > MAX_POINTS) {
      const bucketSize = Math.ceil(data.length / MAX_POINTS);
      for (let i = 0; i < data.length; i += bucketSize) {
        const bucket = data.slice(i, i + bucketSize);
        const avgPushups = Math.round(
          bucket.reduce((sum, r) => sum + r.pushups, 0) / bucket.length
        );
        const avgPullups = Math.round(
          bucket.reduce((sum, r) => sum + r.pullups, 0) / bucket.length
        );
        chartData.push({
          date: bucket[bucket.length - 1].date,
          pushups: avgPushups,
          pullups: avgPullups,
        } as ExerciseSheetRow);
      }
    } else {
      chartData = data;
    }
    const chartLabel = `${
      chartData.length < days ? `Last ${chartData.length}` : `Last ${days}`
    } days`;
    return await generateExerciseChart(chartData, data, chartLabel);
  }
  // --- PUSHUP/PULLUP SUBCOMMANDS ---
  if (
    subcommand === ExerciseSubcommand.Pushup ||
    subcommand === ExerciseSubcommand.Pullup
  ) {
    const exerciseType = subcommand as ExerciseType;
    const exerciseName =
      exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1);
    if (amount && amount > 0) {
      await logExercise(exerciseType, amount);
      return {
        content: `Logged ${amount} ${exerciseName}${
          amount === 1 ? "" : "s"
        } for today!`,
      };
    }
    // Interactive V2 component (for Discord only, but safe to return)
    const container = new ContainerBuilder();
    const text = new TextDisplayBuilder().setContent(
      `## ${exerciseName} Tracker\nLog your reps or use \`/exercise ${exerciseType} <amount>\` to add a specific number.`
    );
    const createButton = (reps: number, style: ButtonStyle) =>
      new ButtonBuilder()
        .setCustomId(`exercise-${exerciseType}-${reps}-${params.userId}`)
        .setLabel(`+${reps}`)
        .setStyle(style);
    const button10 = createButton(10, ButtonStyle.Secondary);
    const button15 = createButton(15, ButtonStyle.Secondary);
    const button20 = createButton(20, ButtonStyle.Secondary);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      button10,
      button15,
      button20
    );
    container.addTextDisplayComponents(text);
    container.addActionRowComponents(row);
    return {
      content: undefined,
      components: [container],
      isComponentsV2: true,
    };
  }
  return { content: "Unknown subcommand." };
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("exercise")
    .setDescription("Log your exercise")
    .addSubcommand((subcommand) =>
      subcommand
        .setName(ExerciseSubcommand.Pushup)
        .setDescription("Log a set of pushups.")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The number of reps to add directly.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(ExerciseSubcommand.Pullup)
        .setDescription("Log a set of pullups.")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("The number of reps to add directly.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(ExerciseSubcommand.Stats)
        .setDescription("Show exercise stats as a graph.")
        .addStringOption((option) =>
          option
            .setName("timeframe")
            .setDescription("Timeframe for stats (default: today)")
            .setRequired(false)
            .addChoices(
              { name: "Last 7 days", value: "7d" },
              { name: "Last 30 days", value: "30d" },
              { name: "Last 90 days", value: "90d" },
              { name: "Last year", value: "365d" }
            )
        )
    ),

  async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const subcommand = interaction.options.getSubcommand(true);
    const amount = interaction.options.getInteger("amount");
    const timeframe = interaction.options.getString("timeframe");
    const result = await core({
      userId: interaction.user.id,
      subcommand,
      amount,
      timeframe,
    });

    const replyPayload: InteractionReplyOptions = {};

    if (result.content) replyPayload.content = result.content;
    if (result.components) replyPayload.components = result.components;
    if (result.files) replyPayload.files = result.files;
    if (result.isComponentsV2) {
      replyPayload.flags = [MessageFlags.IsComponentsV2];
      delete replyPayload.content;
    }

    await interaction.reply(replyPayload);
  },
};
