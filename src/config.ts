import "dotenv/config";

/**
 * Represents the application's configuration.
 */
interface Config {
  BOT_TOKEN: string;
  APPLICATION_ID: string;
  NOTION_API_KEY: string;
  OPEN_ROUTER_API_KEY: string;
  GOOGLE_CREDENTIALS_JSON: string;
  EXERCISE_SHEET_ID: string;
  SCHEDULE_SHEET_ID: string;
  TIMEZONE: string;
  NOTION_TASKS_DATABASE_ID: string;
}

function getEnv(key: string, defaultValue?: string): string {
  /**
   * Retrieves an environment variable by its key, throwing an error if it's not set.
   * @param key - The key of the environment variable.
   * @param defaultValue - A default value to use if the environment variable is not set.
   * @returns The value of the environment variable.
   * @throws Will throw an error if the environment variable is not set and no default value is provided.
   */
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return value;
}

const createConfig = (): Config => {
  /**
   * Creates the configuration object by loading and validating environment variables.
   * @returns The application configuration object.
   * @throws Will throw an error if any required environment variables are missing.
   */
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
    BOT_TOKEN: getEnv("DISCORD_BOT_TOKEN"),
    APPLICATION_ID: getEnv("DISCORD_APPLICATION_ID"),
    NOTION_API_KEY: getEnv("NOTION_API_KEY"),
    OPEN_ROUTER_API_KEY: getEnv("OPEN_ROUTER_API_KEY"),
    GOOGLE_CREDENTIALS_JSON: getEnv("GOOGLE_CREDENTIALS_JSON"),
    EXERCISE_SHEET_ID: "14xSHd8mXofkixOoAaRmckrcbH_gq4OPQC58-DyYOZlc",
    SCHEDULE_SHEET_ID: "14xSHd8mXofkixOoAaRmckrcbH_gq4OPQC58-DyYOZlc",
    TIMEZONE: getEnv("TIMEZONE", "Europe/Prague"),
    NOTION_TASKS_DATABASE_ID: "b901624ee2024a2b8c2bfbe6f94cacd4",
  };
};

export const config: Config = createConfig();
