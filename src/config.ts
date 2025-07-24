import "dotenv/config";

// Type for config object
interface Config {
  BOT_TOKEN: string;
  APPLICATION_ID: string;
  NOTION_API_KEY: string;
  OPEN_ROUTER_API_KEY: string;
  GOOGLE_CREDENTIALS_JSON: string;
  EXERCISE_SHEET_ID: string;
  TIMEZONE: string;
  NOTION_TASKS_DATABASE_ID: string;
}

const createConfig = (): Config => {
  const {
    DISCORD_BOT_TOKEN,
    DISCORD_APPLICATION_ID,
    NOTION_API_KEY,
    OPEN_ROUTER_API_KEY,
    GOOGLE_CREDENTIALS_JSON,
  } = process.env;

  if (!DISCORD_BOT_TOKEN) throw new Error("❌ DISCORD_BOT_TOKEN is missing");
  if (!DISCORD_APPLICATION_ID) throw new Error("❌ DISCORD_APPLICATION_ID is missing");
  if (!NOTION_API_KEY) throw new Error("❌ NOTION_API_KEY is missing");
  if (!OPEN_ROUTER_API_KEY) throw new Error("❌ OPEN_ROUTER_API_KEY is missing");
  if (!GOOGLE_CREDENTIALS_JSON) throw new Error("❌ GOOGLE_CREDENTIALS_JSON is missing");

  return {
    BOT_TOKEN: DISCORD_BOT_TOKEN,
    APPLICATION_ID: DISCORD_APPLICATION_ID,
    NOTION_API_KEY,
    OPEN_ROUTER_API_KEY,
    GOOGLE_CREDENTIALS_JSON,
    EXERCISE_SHEET_ID: "14xSHd8mXofkixOoAaRmckrcbH_gq4OPQC58-DyYOZlc",
    TIMEZONE: process.env.TIMEZONE || "Europe/Prague",
    NOTION_TASKS_DATABASE_ID: "b901624ee2024a2b8c2bfbe6f94cacd4",
  };
};
    
export const config: Config = createConfig();