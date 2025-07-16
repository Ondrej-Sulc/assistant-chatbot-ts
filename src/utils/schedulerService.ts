import cron, { ScheduledTask } from "node-cron";
import { getSchedules, ScheduleRow } from "./sheetsService";
import { executeCommandString } from "./commandExecutor";
import { Client } from "discord.js";
import { config } from "../config";

const jobs: Record<string, ScheduledTask[]> = {};

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
          await executeCommandString({
            commandString: schedule.command,
            client,
            targetChannelId: schedule.target_channel_id,
            targetUserId: schedule.target_user_id,
          });
        },
        { timezone: config.TIMEZONE }
      );
      jobs[schedule.id].push(job);
      console.log(`[Scheduler] Scheduled: ${schedule.command} (${cronExpr}) [${schedule.id}]`);
    }
  }
} 