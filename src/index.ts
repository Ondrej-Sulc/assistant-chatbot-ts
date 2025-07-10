import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { config } from "./config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`🚀 Bot is online and ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content.toLowerCase() === "ping") {
    await message.reply("Pong!");
  }
});

if (!config.BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN is not defined in the .env file.");
}
client.login(config.BOT_TOKEN);