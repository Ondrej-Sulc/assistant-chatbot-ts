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
            // Option 1: Direct default export (most common and desired)
            if (commandModule.default && typeof commandModule.default === 'object') {
                command = commandModule.default as Command;
            } 
            // Option 2: Named export (less common for command files, but safe to check)
            else if (commandModule.command && typeof commandModule.command === 'object') {
                command = commandModule.command as Command; // If you used 'export const command = ...'
            }

            if (command && 'data' in command && 'execute' in command) {
                commands.set(command.data.name, command);
                console.log(`   ✅ Loaded command: /${command.data.name}`);
            } else {
                console.warn(`   ⚠️ [WARNING] The command at ${filePath} is missing a required "data" or "execute" property, or its export structure is unexpected.`);
                console.warn(`   Received module: ${JSON.stringify(Object.keys(commandModule))}`);
            }
        } catch (error) {
            console.error(`   ❌ Error loading command from ${filePath}:`, error);
        }
    }
}