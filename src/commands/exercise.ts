import { config } from "../config";
import { Command } from "../types/command";
import { sheetsService } from "../utils/sheetsService";
import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  CacheType,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { registerButtonHandler } from "../utils/buttonHandlerRegistry";
import { ButtonInteraction } from "discord.js";
import QuickChart from "quickchart-js";
import { AttachmentBuilder } from "discord.js";
import { formatDate } from "../utils/dateUtils";
import { ExerciseType, ExerciseSheetRow } from "../types/exercise";

const EXERCISE_SHEET_ID = config.EXERCISE_SHEET_ID;
const EXERCISE_SHEET_NAME = "Logs";
const SHEET_RANGE = `${EXERCISE_SHEET_NAME}!A:D`;
const SHEET_COL_PUSHUP = 2; // C
const SHEET_COL_PULLUP = 3; // D
const DEFAULT_TIMEZONE = config.TIMEZONE || "Europe/Prague";

// Utility to log exercise reps for today
async function logExercise(exerciseType: ExerciseType, amount: number) {
  try {
    const now = new Date();
    const todayStr = formatDate(now, DEFAULT_TIMEZONE);

    // Read all rows from the sheet
    let rows = (await sheetsService.readSheet(EXERCISE_SHEET_ID, SHEET_RANGE)) || [];
    // Find today's row (by column A)
    let todayRowIdx = rows.findIndex((row) => row[0] === todayStr);
    if (todayRowIdx === -1) {
      // Row for today not found, append it (leave column B blank)
      const newRow = [todayStr, "", 0, 0];
      rows.push(newRow);
      todayRowIdx = rows.length - 1;
    }
    // Update the correct cell (C or D)
    const row = rows[todayRowIdx];
    const colIdx = exerciseType === ExerciseType.Pushup ? SHEET_COL_PUSHUP : SHEET_COL_PULLUP;
    const prev = parseInt(row[colIdx] || "0", 10);
    row[colIdx] = prev + amount;
    rows[todayRowIdx] = row;
    // Write back only the updated row (A, B, C, D)
    const writeRange = `${EXERCISE_SHEET_NAME}!A${todayRowIdx + 1}:D${todayRowIdx + 1}`;
    await sheetsService.writeSheet(EXERCISE_SHEET_ID, writeRange, [row]);
  } catch (error) {
    console.error("Failed to log exercise:", error);
    throw new Error("Failed to log exercise. Please try again later.");
  }
}

// Handler for button interactions
export async function handleButton(interaction: ButtonInteraction) {
  try {
    // customId format: exercise-pushup-10-<userId>
    const match = interaction.customId.match(/^exercise-(pushup|pullup)-(\d+)-/);
    if (!match) {
      await safeReply(interaction, "Unknown button.");
      return;
    }
    const exerciseType = match[1] as ExerciseType;
    const amount = parseInt(match[2], 10);
    await logExercise(exerciseType, amount);
    await interaction.reply({
      content: `Logged ${amount} ${exerciseType}${amount === 1 ? "" : "s"} for today!`,
      flags: [MessageFlags.Ephemeral],
    });
  } catch (error) {
    console.error("Button handler error:", error);
    await safeReply(interaction, "Failed to log exercise. Please try again later.");
  }
}

// Register the handler for all exercise- buttons
registerButtonHandler("exercise-", handleButton);

// Subcommand names as constants
const SUBCOMMAND_PUSHUP = "pushup";
const SUBCOMMAND_PULLUP = "pullup";
const SUBCOMMAND_STATS = "stats";

// Centralized error reply
async function safeReply(interaction: ChatInputCommandInteraction | ButtonInteraction, content: string) {
  if (!interaction.replied) {
    await interaction.reply({ content, flags: [MessageFlags.Ephemeral] });
  }
}

// Handler for stats subcommand
async function handleStatsSubcommand(interaction: ChatInputCommandInteraction<CacheType>) {
  // If no timeframe is provided, show today's stats as a message
  const timeframe = interaction.options.getString("timeframe");
  if (!timeframe) {
    // Read all rows from the sheet
    let rows: any[] = [];
    try {
      rows = (await sheetsService.readSheet(EXERCISE_SHEET_ID, SHEET_RANGE)) || [];
    } catch (error) {
      console.error("Failed to read exercise sheet:", error);
      await safeReply(interaction, "Failed to load stats. Please try again later.");
      return;
    }
    // Remove header if present (assume header if first row is not a date)
    if (rows.length && isNaN(Date.parse(rows[0][0]?.split("/").reverse().join("-")))) {
      rows = rows.slice(1);
    }
    const now = new Date();
    const todayStr = formatDate(now, DEFAULT_TIMEZONE);
    const todayRow = rows.find((row) => row[0] === todayStr);
    let pushups = 0;
    let pullups = 0;
    if (todayRow) {
      pushups = parseInt(todayRow[SHEET_COL_PUSHUP] || "0", 10);
      pullups = parseInt(todayRow[SHEET_COL_PULLUP] || "0", 10);
    }
    const message = `**Exercise Stats for Today (${todayStr})**\n\n` +
      `:muscle: Pushups: **${pushups}**\n` +
      `:weight_lifter: Pullups: **${pullups}**`;
    await interaction.reply({ content: message, flags: [MessageFlags.Ephemeral] });
    return;
  }
  // Map timeframe to days
  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
  const days = daysMap[timeframe] || 7;
  const MAX_POINTS = 60;
  // Read all rows from the sheet
  let rows: any[] = [];
  try {
    rows = (await sheetsService.readSheet(EXERCISE_SHEET_ID, SHEET_RANGE)) || [];
  } catch (error) {
    console.error("Failed to read exercise sheet:", error);
    await safeReply(interaction, "Failed to load stats. Please try again later.");
    return;
  }
  // Remove header if present (assume header if first row is not a date)
  if (rows.length && isNaN(Date.parse(rows[0][0]?.split("/").reverse().join("-")))) {
    rows = rows.slice(1);
  }
  // Find today's row index
  const now = new Date();
  const todayStr = formatDate(now, DEFAULT_TIMEZONE);
  let todayIdx = rows.findIndex((row) => row[0] === todayStr);
  if (todayIdx === -1) {
    // If today is not found, use the last available date
    todayIdx = rows.length - 1;
  }
  // Get the last N rows ending with today
  const startIdx = Math.max(0, todayIdx - days + 1);
  const selectedRows = rows.slice(startIdx, todayIdx + 1);
  // Parse rows into { date, pushups, pullups }
  const data = selectedRows.map((row) => ({
    date: row[0],
    pushups: parseInt(row[SHEET_COL_PUSHUP] || "0", 10),
    pullups: parseInt(row[SHEET_COL_PULLUP] || "0", 10),
  }));
  // If more than MAX_POINTS, group/average into MAX_POINTS buckets
  let chartData: ExerciseSheetRow[] = [];
  if (data.length > MAX_POINTS) {
    const bucketSize = Math.ceil(data.length / MAX_POINTS);
    for (let i = 0; i < data.length; i += bucketSize) {
      const bucket = data.slice(i, i + bucketSize);
      const avgPushups = Math.round(bucket.reduce((sum, r) => sum + r.pushups, 0) / bucket.length);
      const avgPullups = Math.round(bucket.reduce((sum, r) => sum + r.pullups, 0) / bucket.length);
      // Use the last date in the bucket for the label
      chartData.push({
        date: bucket[bucket.length - 1].date,
        pushups: avgPushups,
        pullups: avgPullups,
      } as ExerciseSheetRow);
    }
  } else {
    chartData = data;
  }
  // Prepare chart data
  const labels = chartData.map((row) => row.date);
  const pushups = chartData.map((row) => row.pushups);
  const pullups = chartData.map((row) => row.pullups);
  // Chart label
  const chartLabel = `${labels.length < days ? `Last ${labels.length}` : `Last ${days}`} days`;
  // Create chart config
  const chart = new QuickChart();
  chart.setConfig({
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Pushups",
          data: pushups,
          borderColor: "#4fd1c5",
          backgroundColor: "rgba(79,209,197,0.2)",
          fill: false,
          tension: 0.3,
        },
        {
          label: "Pullups",
          data: pullups,
          borderColor: "#f6ad55",
          backgroundColor: "rgba(246,173,85,0.2)",
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: {
        legend: { labels: { color: "#fff", font: { size: 16 } } },
        title: {
          display: true,
          text: `Exercise Stats (${chartLabel})`,
          color: "#fff",
          font: { size: 20 },
        },
      },
      scales: {
        x: {
          ticks: { color: "#fff", font: { size: 14 } },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#fff", font: { size: 14 } },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
      },
      backgroundColor: "#23272a",
    },
  });
  chart.setWidth(800).setHeight(400).setBackgroundColor("#23272a");
  try {
    const imageBuffer = await chart.toBinary();
    const attachment = new AttachmentBuilder(imageBuffer, { name: "exercise-stats.png" });
    await interaction.reply({ files: [attachment] });
  } catch (error) {
    console.error("Failed to generate chart:", error);
    await safeReply(interaction, "Failed to generate chart. Please try again later.");
  }
}

// Handler for pushup/pullup log subcommands
async function handleLogSubcommand(interaction: ChatInputCommandInteraction<CacheType>, exerciseType: ExerciseType, amount: number | null) {
  const exerciseName =
    exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1);

  if (amount && amount > 0) {
    await logExercise(exerciseType, amount);
    await interaction.reply({
      content: `Logged ${amount} ${exerciseName}${amount === 1 ? "" : "s"} for today!`,
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  // --- Path 2: Show interactive V2 component ---
  const container = new ContainerBuilder();

  // Create the text content
  const text = new TextDisplayBuilder().setContent(
    `## ${exerciseName} Tracker\nLog your reps or use \`/exercise ${exerciseType} <amount>\` to add a specific number.`
  );

  // Create the buttons with the dynamic customId
  const createButton = (reps: number, style: ButtonStyle) =>
    new ButtonBuilder()
      .setCustomId(`exercise-${exerciseType}-${reps}-${interaction.user.id}`)
      .setLabel(`+${reps}`)
      .setStyle(style);

  const button10 = createButton(10, ButtonStyle.Secondary);
  const button15 = createButton(15, ButtonStyle.Secondary);
  const button20 = createButton(20, ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button10, button15, button20);

  container.addTextDisplayComponents(text);
  container.addActionRowComponents(row);

  await interaction.reply({
    flags: [MessageFlags.IsComponentsV2],
    components: [container],
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName("exercise")
    .setDescription("Log your exercise")
    .addSubcommand((subcommand) =>
      subcommand
        .setName(SUBCOMMAND_PUSHUP)
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
        .setName(SUBCOMMAND_PULLUP)
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
        .setName(SUBCOMMAND_STATS)
        .setDescription("Show exercise stats as a graph.")
        .addStringOption((option) =>
          option
            .setName("timeframe")
            .setDescription("Timeframe for stats (default: today)")
            .setRequired( false)
            .addChoices(
              { name: "Last 7 days", value: "7d" },
              { name: "Last 30 days", value: "30d" },
              { name: "Last 90 days", value: "90d" },
              { name: "Last year", value: "365d" }
            )
        )
    ),

  async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    try {
      const subcommand = interaction.options.getSubcommand(true);
      const amount = interaction.options.getInteger("amount");
      if (subcommand === SUBCOMMAND_STATS) {
        await handleStatsSubcommand(interaction);
      } else if (subcommand === SUBCOMMAND_PUSHUP || subcommand === SUBCOMMAND_PULLUP) {
        await handleLogSubcommand(interaction, subcommand as ExerciseType, amount);
      } else {
        await safeReply(interaction, "Unknown subcommand.");
      }
    } catch (error) {
      console.error("Exercise command error:", error);
      await safeReply(interaction, "An error occurred. Please try again later.");
    }
  },

} as Command;
