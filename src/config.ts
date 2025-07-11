import "dotenv/config";

export const config = {
  BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  APPLICATION_ID: process.env.DISCORD_APPLICATION_ID,

  NOTION_API_KEY: process.env.NOTION_API_KEY,
  OPEN_ROUTER_API_KEY: process.env.OPEN_ROUTER_API_KEY,

  GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON,

  // Sheets config
  EXERCISE_SHEET_ID: '14xSHd8mXofkixOoAaRmckrcbH_gq4OPQC58-DyYOZlc',
  EXERCISE_SHEET_NAME: 'Logs',
  EXERCISE_SHEET_DATE_RANGE: 'A1:A',

  TIMEZONE: "Europe/Prague",

  // Notion config
  NOTION_TASKS_DATABASE_ID: 'b901624ee2024a2b8c2bfbe6f94cacd4',
};

if (!config.BOT_TOKEN) {
  console.error("❌ DISCORD_BOT_TOKEN is not defined in the .env file.");
  process.exit(1);
}
if (!config.GOOGLE_CREDENTIALS_JSON) {
  console.error("❌ GOOGLE_CREDENTIALS_JSON is not defined. Google Sheets will not work.");
  process.exit(1);
}
if (!config.NOTION_API_KEY) {
  console.error("❌ NOTION_API_KEY is not defined. Notion will not work.");
  process.exit(1);
}
if (!config.OPEN_ROUTER_API_KEY) {
  console.error("❌ OPEN_ROUTER_API_KEY is not defined. Open Router will not work.");
  process.exit(1);
}