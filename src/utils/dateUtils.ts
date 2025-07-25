// Utility for formatting dates in dd/MM/yyyy format with timezone support
export function formatDate(
/**
 * Formats a date into a dd/MM/yyyy string with timezone support.
 * @param date - The date to format.
 * @param timeZone - The timezone to use for formatting.
 * @returns The formatted date string.
 */
  date: Date,
  timeZone: string = "Europe/Prague"
): string {
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  const pad = (n: number) => n.toString().padStart(2, "0");
  const day = pad(tzDate.getDate());
  const month = pad(tzDate.getMonth() + 1);
  const year = tzDate.getFullYear();
  return `${day}/${month}/${year}`;
}
