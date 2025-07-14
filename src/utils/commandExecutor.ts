import { Client, TextChannel, User, CommandInteraction, ChatInputCommandInteraction, Guild, GuildMember } from "discord.js";
import { commands } from "./commandHandler";

// Simulate a minimal interaction object for command execution
class FakeInteraction {
  public commandName: string;
  public options: any;
  public channel: TextChannel | null;
  public user: User;
  public replied = false;
  public deferred = false;
  public repliedContent: string | null = null;
  public flags: any[] = [];

  constructor(commandName: string, options: any, channel: TextChannel | null, user: User) {
    this.commandName = commandName;
    this.options = options;
    this.channel = channel;
    this.user = user;
  }

  async reply({ content, ...rest }: { content: string }) {
    this.replied = true;
    this.repliedContent = content;
    if (this.channel) {
      await this.channel.send(content);
    } else if (this.user) {
      await this.user.send(content);
    }
  }

  async deferReply() {
    this.deferred = true;
  }

  async editReply({ content }: { content: string }) {
    this.repliedContent = content;
    if (this.channel) {
      await this.channel.send(content);
    } else if (this.user) {
      await this.user.send(content);
    }
  }
}

// Parse a command string like '/today' or '/exercise pullup amount:10'
function parseCommandString(commandString: string) {
  const [cmd, ...args] = commandString.trim().split(/\s+/);
  const commandName = cmd.replace("/", "");
  const options: Record<string, any> = {};
  args.forEach((arg) => {
    const [key, ...rest] = arg.split(":");
    if (rest.length) {
      options[key] = rest.join(":");
    } else {
      // For positional args (e.g., subcommands)
      options[arg] = true;
    }
  });
  return { commandName, options };
}

export async function executeCommandString({
  commandString,
  client,
  targetChannelId,
  targetUserId,
}: {
  commandString: string;
  client: Client;
  targetChannelId?: string;
  targetUserId?: string;
}) {
  try {
    const { commandName, options } = parseCommandString(commandString);
    const command = commands.get(commandName);
    if (!command) {
      throw new Error(`Command not found: ${commandName}`);
    }
    let channel: TextChannel | null = null;
    let user: User | null = null;
    if (targetChannelId) {
      channel = (await client.channels.fetch(targetChannelId)) as TextChannel;
    }
    if (targetUserId) {
      user = await client.users.fetch(targetUserId);
    }
    if (!channel && !user) {
      throw new Error("No valid target for command execution");
    }
    // Use a fake user if only channel is provided
    if (!user && channel) {
      // Use the bot's user as the sender
      user = client.user!;
    }
    const fakeInteraction = new FakeInteraction(commandName, options, channel, user!);
    await command.execute(fakeInteraction as unknown as ChatInputCommandInteraction);
    console.log(`[CommandExecutor] Executed: ${commandString} for ${targetChannelId ? `channel ${targetChannelId}` : `user ${targetUserId}`}`);
  } catch (error) {
    console.error(`[CommandExecutor] Failed to execute: ${commandString}`, error);
  }
} 