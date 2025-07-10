import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  Collection,
} from "discord.js";
import { config } from "./config";
import { loadCommands, commands } from "./utils/commandHandler";
import { Command } from "./types/command";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

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

client.commands = commands;

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Bot connected as ${readyClient.user.username}`);
  await loadCommands();
  const commandData = Array.from(client.commands.values()).map((command) =>
    command.data.toJSON()
  );
  try {
    await readyClient.application.commands.set(commandData);
    console.log(
      `🔄 Successfully registered ${commandData.length} global slash command(s).`
    );
  } catch (error) {
    console.error(`❌ Failed to register global slash commands:`, error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "ping") {
    await message.reply("Pong!");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
  
    const command = client.commands.get(interaction.commandName);
  
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
  
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing command ${interaction.commandName}:`, error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "There was an error while executing this command!"
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  });
  
  if (!config.BOT_TOKEN) {
    throw new Error("DISCORD_BOT_TOKEN is not defined in the .env file.");
  }
  client.login(config.BOT_TOKEN);
