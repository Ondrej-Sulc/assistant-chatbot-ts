import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import { Command } from "../types/command";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),

  cooldown: 5,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: false });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await interaction.editReply("Pong!");
  },
} as Command;

