import { Command } from "../types/command";
import { ExerciseType, ExerciseSheetRow } from "../types/exercise";
import { config } from "../config";
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
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonInteraction,
} from "discord.js";
import { sheetsService } from "../utils/sheetsService";
import { registerButtonHandler } from "../utils/buttonHandlerRegistry";
import { formatDate } from "../utils/dateUtils";
import QuickChart from "quickchart-js";

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
    let rows =
      (await sheetsService.readSheet(EXERCISE_SHEET_ID, SHEET_RANGE)) || [];
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
    const colIdx =
      exerciseType === ExerciseType.Pushup
        ? SHEET_COL_PUSHUP
        : SHEET_COL_PULLUP;
    const prev = parseInt(row[colIdx] || "0", 10);
    row[colIdx] = prev + amount;
    rows[todayRowIdx] = row;
    // Write back only the updated row (A, B, C, D)
    const writeRange = `${EXERCISE_SHEET_NAME}!A${todayRowIdx + 1}:D${
      todayRowIdx + 1
    }`;
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
    const match = interaction.customId.match(
      /^exercise-(pushup|pullup)-(\d+)-/
    );
    if (!match) {
      await safeReply(interaction, "Unknown button.");
      return;
    }
    const exerciseType = match[1] as ExerciseType;
    const amount = parseInt(match[2], 10);
    await logExercise(exerciseType, amount);
    await interaction.reply({
      content: `Logged ${amount} ${exerciseType}${
        amount === 1 ? "" : "s"
      } for today!`,
      flags: [MessageFlags.Ephemeral],
    });
  } catch (error) {
    console.error("Button handler error:", error);
    await safeReply(
      interaction,
      "Failed to log exercise. Please try again later."
    );
  }
}

// Register the handler for all exercise- buttons
registerButtonHandler("exercise-", handleButton);

// Subcommand names as constants
const SUBCOMMAND_PUSHUP = "pushup";
const SUBCOMMAND_PULLUP = "pullup";
const SUBCOMMAND_STATS = "stats";

// Centralized error reply
async function safeReply(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  content: string
) {
  if (!interaction.replied) {
    await interaction.reply({ content, flags: [MessageFlags.Ephemeral] });
  }
}

// --- CORE LOGIC FUNCTION ---
export async function core(params: {
  userId: string,
  subcommand: string,
  amount?: number | null,
  timeframe?: string | null,
}): Promise<{
  content: string | null,
  components?: any[],
  files?: any[],
  isComponentsV2?: boolean,
}> {
  try {
    const { subcommand, amount, timeframe } = params;
    // --- STATS SUBCOMMAND ---
    if (subcommand === SUBCOMMAND_STATS) {
      // Read all rows from the sheet
      let rows: any[] = [];
      try {
        rows = (await sheetsService.readSheet(EXERCISE_SHEET_ID, SHEET_RANGE)) || [];
      } catch (error) {
        console.error("Failed to read exercise sheet:", error);
        return { content: "Failed to load stats. Please try again later." };
      }
      // Remove header if present (assume header if first row is not a date)
      if (
        rows.length &&
        isNaN(Date.parse(rows[0][0]?.split("/").reverse().join("-")))
      ) {
        rows = rows.slice(1);
      }
      const now = new Date();
      const todayStr = formatDate(now, DEFAULT_TIMEZONE);
      // If no timeframe, show today's stats
      if (!timeframe) {
        const todayRow = rows.find((row) => row[0] === todayStr);
        let pushups = 0;
        let pullups = 0;
        if (todayRow) {
          pushups = parseInt(todayRow[SHEET_COL_PUSHUP] || "0", 10);
          pullups = parseInt(todayRow[SHEET_COL_PULLUP] || "0", 10);
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
      let todayIdx = rows.findIndex((row) => row[0] === todayStr);
      if (todayIdx === -1) {
        todayIdx = rows.length - 1;
      }
      const startIdx = Math.max(0, todayIdx - days + 1);
      const selectedRows = rows.slice(startIdx, todayIdx + 1);
      const data = selectedRows.map((row) => ({
        date: row[0],
        pushups: parseInt(row[SHEET_COL_PUSHUP] || "0", 10),
        pullups: parseInt(row[SHEET_COL_PULLUP] || "0", 10),
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
      const labels = chartData.map((row) => row.date);
      const pushups = chartData.map((row) => row.pushups);
      const pullups = chartData.map((row) => row.pullups);
      const chartLabel = `${labels.length < days ? `Last ${labels.length}` : `Last ${days}`} days`;
      const avgPushups = pushups.length > 0 ? Math.round(pushups.reduce((a, b) => a + b, 0) / pushups.length) : 0;
      const avgPullups = pullups.length > 0 ? Math.round(pullups.reduce((a, b) => a + b, 0) / pullups.length) : 0;
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
              backgroundColor: "rgba(79,209,197,0.15)",
              fill: true,
              lineTension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: "#4fd1c5",
              pointBorderColor: "#23272a",
            },
            {
              label: "Pullups",
              data: pullups,
              borderColor: "#f6ad55",
              backgroundColor: "rgba(246,173,85,0.15)",
              fill: true,
              lineTension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: "#f6ad55",
              pointBorderColor: "#23272a",
            },
          ],
        },
        options: {
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: { color: "#fff", font: { size: 18 } },
            },
            title: {
              display: true,
              text: `Exercise Stats (${chartLabel})`,
              color: "#fff",
              font: { size: 22 },
            },
            subtitle: {
              display: true,
              text: `Timeframe: ${chartLabel}`,
              color: "#b5b5b5",
              font: { size: 16 },
            },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "#23272a",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "#4fd1c5",
              borderWidth: 1,
              callbacks: {
                label: function(context: any) {
                  return `${context.dataset.label}: ${context.parsed.y}`;
                },
              },
            },
            annotation: {
              annotations: {
                avgPushups: {
                  type: 'line',
                  yMin: avgPushups,
                  yMax: avgPushups,
                  borderColor: '#4fd1c5',
                  borderWidth: 2,
                  borderDash: [4, 4],
                  label: {
                    content: 'Avg Pushups',
                    enabled: true,
                    position: 'end',
                    color: '#4fd1c5',
                    font: { size: 14 },
                    backgroundColor: '#23272a',
                  },
                },
                avgPullups: {
                  type: 'line',
                  yMin: avgPullups,
                  yMax: avgPullups,
                  borderColor: '#f6ad55',
                  borderWidth: 2,
                  borderDash: [4, 4],
                  label: {
                    content: 'Avg Pullups',
                    enabled: true,
                    position: 'end',
                    color: '#f6ad55',
                    font: { size: 14 },
                    backgroundColor: '#23272a',
                  },
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: "#fff",
                font: { size: 15 },
                maxRotation: 45,
                minRotation: 30,
                autoSkip: false,
              },
              grid: { color: "rgba(255,255,255,0.08)", borderDash: [4, 4] },
            },
            y: {
              beginAtZero: true,
              ticks: { color: "#fff", font: { size: 15 } },
              grid: { color: "rgba(255,255,255,0.08)", borderDash: [4, 4] },
            },
          },
          backgroundColor: "#23272a",
          responsive: true,
          maintainAspectRatio: false,
        },
      });
      chart.setWidth(800).setHeight(400).setBackgroundColor("#23272a");
      try {
        const imageBuffer = await chart.toBinary();
        const attachmentName = "exercise-stats.png";
        const totalPushups = data.reduce((sum, r) => sum + r.pushups, 0);
        const totalPullups = data.reduce((sum, r) => sum + r.pullups, 0);
        const avgPushupsVal = data.length > 0 ? Math.round(totalPushups / data.length) : 0;
        const avgPullupsVal = data.length > 0 ? Math.round(totalPullups / data.length) : 0;
        const statsSummary =
          `**Stats for ${chartLabel}:**\n` +
          `\n` +
          `- Total Pushups: **${totalPushups}**` +
          `\n- Total Pullups: **${totalPullups}**` +
          `\n- Average Pushups per Day: **${avgPushupsVal}**` +
          `\n- Average Pullups per Day: **${avgPullupsVal}**`;
        const container = new ContainerBuilder();
        const mediaItem = new MediaGalleryItemBuilder().setURL(
          `attachment://${attachmentName}`
        );
        const mediaGallery = new MediaGalleryBuilder().addItems([mediaItem]);
        container.addMediaGalleryComponents(mediaGallery);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(statsSummary)
        );
        return {
          content: null,
          components: [container],
          files: [{ attachment: imageBuffer, name: attachmentName }],
          isComponentsV2: true,
        };
      } catch (error) {
        console.error("Failed to generate chart:", error);
        return { content: "Failed to generate chart. Please try again later." };
      }
    }
    // --- PUSHUP/PULLUP SUBCOMMANDS ---
    if (
      subcommand === SUBCOMMAND_PUSHUP ||
      subcommand === SUBCOMMAND_PULLUP
    ) {
      const exerciseType = subcommand as ExerciseType;
      const exerciseName = exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1);
      if (amount && amount > 0) {
        await logExercise(exerciseType, amount);
        return {
          content: `Logged ${amount} ${exerciseName}${amount === 1 ? "" : "s"} for today!`,
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
        content: null,
        components: [container],
        isComponentsV2: true,
      };
    }
    return { content: "Unknown subcommand." };
  } catch (error) {
    console.error("Exercise core error:", error);
    return { content: "An error occurred. Please try again later." };
  }
}
// --- END CORE LOGIC ---

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
    try {
      const subcommand = interaction.options.getSubcommand(true);
      const amount = interaction.options.getInteger("amount");
      const timeframe = interaction.options.getString("timeframe");
      const result = await core({
        userId: interaction.user.id,
        subcommand,
        amount,
        timeframe,
      });
      if (result.files && result.files.length > 0) {
        await interaction.reply({
          ...(result.isComponentsV2 ? { flags: [MessageFlags.IsComponentsV2] } : {}),
          components: result.components,
          content: result.content || undefined,
          files: result.files,
        });
      } else if (result.components && result.components.length > 0) {
        await interaction.reply({
          ...(result.isComponentsV2 ? { flags: [MessageFlags.IsComponentsV2] } : {}),
          components: result.components,
          content: result.content || undefined,
        });
      } else {
        await interaction.reply({
          content: result.content || undefined,
        });
      }
    } catch (error) {
      console.error("Exercise command error:", error);
      await safeReply(
        interaction,
        "An error occurred. Please try again later."
      );
    }
  },
} as Command;