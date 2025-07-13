// Utility to parse natural language date terms into YYYY-MM-DD
// Supports: today, tomorrow, monday, tuesday, ..., sunday, and YYYY-MM-DD

const WEEKDAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
];

export function parseNaturalDate(input: string, now: Date = new Date()): string | null {
  if (!input) return null;
  const lower = input.trim().toLowerCase();

  // Check for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
    return lower;
  }

  // Today
  if (lower === "today") {
    return now.toISOString().slice(0, 10);
  }

  // Tomorrow
  if (lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }

  // Days of the week
  const weekdayIdx = WEEKDAYS.indexOf(lower);
  if (weekdayIdx !== -1) {
    const todayIdx = now.getDay();
    let daysToAdd = (weekdayIdx - todayIdx + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7; // always next occurrence
    const target = new Date(now);
    target.setDate(now.getDate() + daysToAdd);
    return target.toISOString().slice(0, 10);
  }

  return null;
} 