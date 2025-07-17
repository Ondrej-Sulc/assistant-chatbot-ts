import cron, { ScheduledTask } from "node-cron";
import { getSchedules, ScheduleRow } from "./sheetsService";
import { Client, ChannelType, TextChannel, ThreadChannel } from "discord.js";
import { config } from "../config";
import fs from "fs";
import path from "path";

const jobs: Record<string, ScheduledTask[]> = {};

// --- DYNAMIC COMMAND LOADER ---
const commandsDir = path.join(__dirname, "../commands");
const coreCommands: Record<string, Function> = {};
for (const file of fs.readdirSync(commandsDir)) {
  if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
  const cmd = require(path.join(commandsDir, file));
  if (typeof cmd.core === "function") {
    const name = path.basename(file, path.extname(file));
    coreCommands[name] = cmd.core;
  }
}
// --- END DYNAMIC COMMAND LOADER ---

// Utility to convert Google Sheets time (fraction) to HH:mm
function sheetTimeToHHmm(value: string): string {
  if (/^\d{1,2}:\d{2}$/.test(value)) return value; // already HH:mm
  const num = parseFloat(value);
  if (isNaN(num)) return value; // fallback for already-correct strings
  const totalMinutes = Math.round(num * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function getCronExpressions(schedule: ScheduleRow): string[] {
  // If custom cron_expression is provided, use it directly
  if (schedule.frequency === "custom" && schedule.cron_expression) {
    return [schedule.cron_expression];
  }

  // Support multiple times per day (comma-separated)
  const times = (schedule.time || "").split(",").map((t) => sheetTimeToHHmm(t.trim())).filter(Boolean);
  const crons: string[] = [];

  for (const time of times) {
    const [hour, minute] = time.split(":").map(Number);
    if (isNaN(hour) || isNaN(minute)) continue;
    switch (schedule.frequency) {
      case "daily":
        crons.push(`${minute} ${hour} * * *`);
        break;
      case "weekly": {
        // day: e.g. "monday", "tuesday", ...
        const dayMap: Record<string, number> = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
        };
        const day = schedule.day ? schedule.day.toLowerCase() : "monday";
        const dayNum = dayMap[day] ?? 1;
        crons.push(`${minute} ${hour} * * ${dayNum}`);
        break;
      }
      case "monthly": {
        // day: e.g. "15" for 15th of the month
        const dayOfMonth = schedule.day ? parseInt(schedule.day, 10) : 1;
        crons.push(`${minute} ${hour} ${dayOfMonth} * *`);
        break;
      }
      case "every": {
        // interval/unit: e.g. every 2 days, every 3 weeks
        const interval = schedule.interval ? parseInt(schedule.interval, 10) : 1;
        const unit = schedule.unit || "days";
        if (unit === "days") {
          crons.push(`${minute} ${hour} */${interval} * *`);
        } else if (unit === "weeks") {
          // Run every N weeks on the specified day (default Monday)
          const dayMap: Record<string, number> = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
          };
          const day = schedule.day ? schedule.day.toLowerCase() : "monday";
          const dayNum = dayMap[day] ?? 1;
          crons.push(`${minute} ${hour} * * ${dayNum}`); // node-cron does not support "every N weeks" natively
          // Note: For true "every N weeks", would need custom logic
        }
        break;
      }
      default:
        // fallback: daily
        crons.push(`${minute} ${hour} * * *`);
    }
  }
  return crons;
}

async function runScheduledCommand(commandString: string, params: any, client: Client, channelId: string | undefined, userId?: string) {
  if (!channelId) {
    console.warn(`[Scheduler] No channelId provided for scheduled command: ${commandString}`);
    return;
  }
  // Parse command string: e.g. "/today" or "/exercise pushup"
  const [cmdName, ...args] = commandString.replace(/^\//, "").split(" ");
  const coreFn = coreCommands[cmdName];
  if (!coreFn) {
    console.warn(`[Scheduler] No core function for command: ${cmdName}`);
    return;
  }
  // Call the core function with params
  let result;
  try {
    result = await coreFn({ ...params, args, userId });
  } catch (err) {
    console.error(`[Scheduler] Error running core for ${cmdName}:`, err);
    result = { content: `Failed to run scheduled command: ${cmdName}` };
  }
  // Send result to channel
  const channel = await client.channels.fetch(channelId);
  if (
    channel &&
    (channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.PublicThread ||
      channel.type === ChannelType.PrivateThread)
  ) {
    const sendable = channel as TextChannel | ThreadChannel;
    if (result.components && result.components.length > 0) {
      await sendable.send({
        content: result.content || undefined,
        components: result.components,
      });
    } else {
      await sendable.send(result.content || `Scheduled command ran: ${cmdName}`);
    }
  } else {
    console.warn(`[Scheduler] Could not find text channel: ${channelId}`);
  }
}

export async function startScheduler(client: Client) {
  // Stop any existing jobs
  Object.values(jobs).flat().forEach((job) => job.stop());
  Object.keys(jobs).forEach((id) => delete jobs[id]);

  const schedules = (await getSchedules()).filter((s) => s.is_active);
  for (const schedule of schedules) {
    const cronExprs = getCronExpressions(schedule);
    jobs[schedule.id] = [];
    for (const cronExpr of cronExprs) {
      if (!cron.validate(cronExpr)) {
        console.warn(`[Scheduler] Invalid cron for schedule:`, schedule, cronExpr);
        continue;
      }
      const job = cron.schedule(
        cronExpr,
        async () => {
          console.log(`[Scheduler] Triggering schedule:`, schedule);
          await runScheduledCommand(
            schedule.command,
            {
              targetChannelId: schedule.target_channel_id,
              targetUserId: schedule.target_user_id,
            },
            client,
            schedule.target_channel_id,
            schedule.target_user_id
          );
        },
        { timezone: config.TIMEZONE }
      );
      jobs[schedule.id].push(job);
      console.log(`[Scheduler] Scheduled: ${schedule.command} (${cronExpr}) [${schedule.id}]`);
    }
  }
} 