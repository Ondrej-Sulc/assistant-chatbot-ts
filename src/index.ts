import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  Collection,
  MessageFlags,
} from "discord.js";
import { config } from "./config";
import { loadCommands, commands } from "./utils/commandHandler";
import { Command } from "./types/command";
import { getButtonHandler } from "./utils/buttonHandlerRegistry";
import { startScheduler } from "./utils/schedulerService";

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
  // Start scheduler after bot is ready
  await startScheduler(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Handle button interactions generically
  if (interaction.isButton()) {
    const handler = getButtonHandler(interaction.customId);
    if (handler) {
      await handler(interaction);
    } else {
      await interaction.reply({ content: "Unknown button.", ephemeral: true });
    }
    return;
  }

  // Handle autocomplete interactions
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (command && command.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Error in autocomplete for command ${interaction.commandName}:`, error);
      }
    }
    return;
  }

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
          content: "There was an error while executing this command!",
          flags: [],
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: [MessageFlags.Ephemeral],
        });
      }
    }
  });
  
  if (!config.BOT_TOKEN) {
    throw new Error("DISCORD_BOT_TOKEN is not defined in the .env file.");
  }
  try {
    client.login(config.BOT_TOKEN);
  } catch (error) {
    console.error("Failed to login to Discord:", error);
    process.exit(1);
  }
