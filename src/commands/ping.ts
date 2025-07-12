import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  MediaGalleryBuilder,
  ContainerBuilder,
} from "discord.js";
import { Command } from "../types/command";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const container = new ContainerBuilder();

      const header = new MediaGalleryBuilder().addItems([
        {
          media: {
            url: "https://sdmntprnortheu.oaiusercontent.com/files/00000000-5d78-61f4-b1a0-8c86d07af834/raw?se=2025-07-12T09%3A19%3A55Z&sp=r&sv=2024-08-04&sr=b&scid=f4a4cf30-3fc0-5a49-94d1-e98a88d00441&skoid=f71d6506-3cac-498e-b62a-67f9228033a9&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-07-12T00%3A11%3A25Z&ske=2025-07-13T00%3A11%3A25Z&sks=b&skv=2024-08-04&sig=oIbR27wSkaJb6a7G8iV1NHmUfnjMp1llI%2Bng3AJCAZ4%3D",
          },
        },
      ]);

      container.addMediaGalleryComponents(header);

      const separator = new SeparatorBuilder();

      container.addSeparatorComponents(separator);

      const text = new TextDisplayBuilder().setContent("# Pong");

      const buttonComponent = new ButtonBuilder()
        .setCustomId("ping")
        .setLabel("Ping")
        .setStyle(ButtonStyle.Primary);

      const section = new SectionBuilder()
        .addTextDisplayComponents(text)
        .setButtonAccessory(buttonComponent);

      container.addSectionComponents(section);

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2],
        components: [container],
      });
    } catch (error) {
      console.error("Ping command error:", error);
      if (!interaction.replied) {
        await interaction.reply({ content: "An error occurred. Please try again later.", flags: [MessageFlags.Ephemeral] });
      }
    }
  },
} as Command;
