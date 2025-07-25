import { readdirSync } from "node:fs"; // Node.js file system module
import { join } from "node:path"; // Node.js path module
import { Collection } from "discord.js";
import { Command } from "../types/command";

const commandsPath = join(__dirname, "..", "commands");

export const commands = new Collection<string, Command>();
/**
 * A collection of all the bot's commands.
 */

export async function loadCommands() {
/**
 * Loads all the commands from the commands directory.
 */
  const isDevelopment = process.env.NODE_ENV === "development";
  const fileExtension = isDevelopment ? ".ts" : ".js";
  const commandFiles = readdirSync(commandsPath).filter((file) =>
    file.endsWith(fileExtension)
  );

  console.log(`🔎 Found ${commandFiles.length} command files.`);

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    try {
      const commandModule = await import(filePath);

      let command: Command | undefined;
      // This order is crucial. Try module.default.default first, then module.default, then module itself.
      if (
        commandModule.default &&
        typeof commandModule.default === "object" &&
        commandModule.default.default &&
        typeof commandModule.default.default === "object" &&
        "data" in commandModule.default.default &&
        "execute" in commandModule.default.default
      ) {
        command = commandModule.default.default as Command;
        console.log(
          `   💡 Found command as module.default.default for: ${file}`
        );
      } else if (
        commandModule.default &&
        typeof commandModule.default === "object" &&
        "data" in commandModule.default &&
        "execute" in commandModule.default
      ) {
        command = commandModule.default as Command;
        console.log(`   💡 Found command as module.default for: ${file}`);
      } else if (
        typeof commandModule === "object" &&
        "data" in commandModule &&
        "execute" in commandModule
      ) {
        command = commandModule as Command;
        console.log(`   💡 Found command as module root for: ${file}`);
      }

      if (command) {
        commands.set(command.data.name, command);
        console.log(`   ✅ Loaded command: /${command.data.name}`);
      } else {
        console.warn(
          `   ⚠️ [WARNING] The command at ${filePath} is missing a required "data" or "execute" property, or its export structure is unexpected.`
        );
        console.warn(
          `   Received module keys: ${JSON.stringify(
            Object.keys(commandModule)
          )}`
        );
        if (commandModule.default) {
          console.warn(
            `   module.default keys: ${JSON.stringify(
              Object.keys(commandModule.default)
            )}`
          );
          if (commandModule.default.default) {
            // Log nested default if it exists
            console.warn(
              `   module.default.default content (if object): ${
                typeof commandModule.default.default === "object"
                  ? JSON.stringify(Object.keys(commandModule.default.default))
                  : commandModule.default.default
              }`
            );
          }
        }
      }
    } catch (error) {
      console.error(`   ❌ Error loading command from ${filePath}:`, error);
    }
  }
}
