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
  const required = {
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID,
    NOTION_API_KEY: process.env.NOTION_API_KEY,
    OPEN_ROUTER_API_KEY: process.env.OPEN_ROUTER_API_KEY,
    GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON,
  };

  Object.entries(required).forEach(([key, value]) => {
    if (!value) throw new Error(`❌ ${key} is missing`);
  });

  return {
    BOT_TOKEN: required.DISCORD_BOT_TOKEN as string,
    APPLICATION_ID: required.DISCORD_APPLICATION_ID as string,
    NOTION_API_KEY: required.NOTION_API_KEY as string,
    OPEN_ROUTER_API_KEY: required.OPEN_ROUTER_API_KEY as string,
    GOOGLE_CREDENTIALS_JSON: required.GOOGLE_CREDENTIALS_JSON as string,
    EXERCISE_SHEET_ID: "14xSHd8mXofkixOoAaRmckrcbH_gq4OPQC58-DyYOZlc",
    TIMEZONE: process.env.TIMEZONE || "Europe/Prague",
    NOTION_TASKS_DATABASE_ID: "b901624ee2024a2b8c2bfbe6f94cacd4",
  };
};

export const config: Config = createConfig();
