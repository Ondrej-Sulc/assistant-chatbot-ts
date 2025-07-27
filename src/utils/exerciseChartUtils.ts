import QuickChart from "quickchart-js";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  AttachmentBuilder,
  BufferResolvable,
} from "discord.js";
import { ExerciseSheetRow } from "../types/exercise";
import { CommandResult } from "../types/command";

export async function generateExerciseChart(
  chartData: ExerciseSheetRow[],
  data: ExerciseSheetRow[],
  chartLabel: string
): Promise<CommandResult> {
  const labels = chartData.map((row) => row.date);
  const pushups = chartData.map((row) => row.pushups);
  const pullups = chartData.map((row) => row.pullups);

  const avgPushups =
    pushups.length > 0
      ? Math.round(pushups.reduce((a, b) => a + b, 0) / pushups.length)
      : 0;
  const avgPullups =
    pullups.length > 0
      ? Math.round(pullups.reduce((a, b) => a + b, 0) / pullups.length)
      : 0;

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
            label: function (context: any) {
              return `${context.dataset.label}: ${context.parsed.y}`;
            },
          },
        },
        annotation: {
          annotations: {
            avgPushups: {
              type: "line",
              yMin: avgPushups,
              yMax: avgPushups,
              borderColor: "#4fd1c5",
              borderWidth: 2,
              borderDash: [4, 4],
              label: {
                content: "Avg Pushups",
                enabled: true,
                position: "end",
                color: "#4fd1c5",
                font: { size: 14 },
                backgroundColor: "#23272a",
              },
            },
            avgPullups: {
              type: "line",
              yMin: avgPullups,
              yMax: avgPullups,
              borderColor: "#f6ad55",
              borderWidth: 2,
              borderDash: [4, 4],
              label: {
                content: "Avg Pullups",
                enabled: true,
                position: "end",
                color: "#f6ad55",
                font: { size: 14 },
                backgroundColor: "#23272a",
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
    const avgPushupsVal =
      data.length > 0 ? Math.round(totalPushups / data.length) : 0;
    const avgPullupsVal =
      data.length > 0 ? Math.round(totalPullups / data.length) : 0;
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
      content: undefined,
      components: [container],
      files: [
        new AttachmentBuilder(Buffer.from(imageBuffer), {
          name: attachmentName,
        }),
      ],
      isComponentsV2: true,
    };
  } catch (error) {
    console.error("Failed to generate chart:", error);
    return { content: "Failed to generate chart. Please try again later." };
  }
}
