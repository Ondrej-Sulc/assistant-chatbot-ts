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
            const command: Command | undefined = (commandModule.default && typeof commandModule.default === 'object')
                ? commandModule.default
                : commandModule;

            if (command && 'data' in command && 'execute' in command) {
                commands.set(command.data.name, command);
                console.log(`   ✅ Loaded command: /${command.data.name}`);
            } else {
                console.log(`   ⚠️ [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        } catch (error) {
            console.error(`   ❌ Error loading command from ${filePath}:`, error);
        }
    }
}