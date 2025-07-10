import "dotenv/config";

export const config = {
  BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  APPLICATION_ID: process.env.DISCORD_APPLICATION_ID,
  OWNER_ID: process.env.DISCORD_USER_ID,
  NOTION_API_KEY: process.env.NOTION_API_KEY,
  NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
};