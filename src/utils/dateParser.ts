// Utility to parse natural language date terms into YYYY-MM-DD
// Supports: today, tomorrow, monday, tuesday, ..., sunday, and YYYY-MM-DD

const WEEKDAYS = [
  /**
   * An array of weekday names in lowercase.
   */
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function parseNaturalDate(
  /**
   * Parses a natural language date string into a YYYY-MM-DD format.
   * Supports terms like 'today', 'tomorrow', 'next week', 'in X days/weeks', and weekdays.
   * @param input - The natural language date string to parse.
   * @param now - The current date to use as a reference.
   * @returns The parsed date in YYYY-MM-DD format, or null if the input is invalid.
   */
  input: string,
  now: Date = new Date()
): string | null {
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

  // Next week
  if (lower === "next week") {
    const target = new Date(now);
    target.setDate(now.getDate() + 7);
    return target.toISOString().slice(0, 10);
  }

  // in X days
  const inDaysMatch = lower.match(/^in (\d+) days?$/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    if (!isNaN(days)) {
      const target = new Date(now);
      target.setDate(now.getDate() + days);
      return target.toISOString().slice(0, 10);
    }
  }

  // in X weeks
  const inWeeksMatch = lower.match(/^in (\d+) weeks?$/);
  if (inWeeksMatch) {
    const weeks = parseInt(inWeeksMatch[1], 10);
    if (!isNaN(weeks)) {
      const target = new Date(now);
      target.setDate(now.getDate() + weeks * 7);
      return target.toISOString().slice(0, 10);
    }
  }

  // Days of the week
  const weekdayText = lower.replace(/^next /u, "");
  const weekdayIdx = WEEKDAYS.indexOf(weekdayText);
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
