import { readdirSync } from "node:fs"; // Node.js file system module
import { join } from "node:path"; // Node.js path module
import { Collection } from "discord.js";
import { Command } from "../types/command";

const commandsPath = join(__dirname, "..", "commands");

export const commands = new Collection<string, Command>();

export async function loadCommands() {
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith(".js"));

    console.log(`🔎 Found ${commandFiles.length} command files.`);

    for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        try {
            const commandModule = await import(filePath);

            let command: Command | undefined;
            // Priority 1: Check if the module itself is the command (can happen with some compiled exports)
            if (typeof commandModule === 'object' && 'data' in commandModule && 'execute' in commandModule) {
                command = commandModule as Command;
                console.log(`   💡 Found command as module root for: ${file}`);
            } 
            // Priority 2: Check for the '.default' property (most common for 'export default')
            else if (commandModule.default && typeof commandModule.default === 'object' && 'data' in commandModule.default && 'execute' in commandModule.default) {
                command = commandModule.default as Command;
                console.log(`   💡 Found command as module.default for: ${file}`);
            }

            if (command) {
                commands.set(command.data.name, command);
                console.log(`   ✅ Loaded command: /${command.data.name}`);
            } else {
                console.warn(`   ⚠️ [WARNING] The command at ${filePath} is missing a required "data" or "execute" property, or its export structure is unexpected.`);
                console.warn(`   Received module keys: ${JSON.stringify(Object.keys(commandModule))}`);
                // Also log default and core properties if they exist for more insight
                if (commandModule.default) console.warn(`   module.default keys: ${JSON.stringify(Object.keys(commandModule.default))}`);
                if (commandModule.core) console.warn(`   module.core keys: ${JSON.stringify(Object.keys(commandModule.core))}`);
            }
        } catch (error) {
            console.error(`   ❌ Error loading command from ${filePath}:`, error);
        }
    }
}