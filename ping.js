import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if the bot is alive'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Pong ✅')
      .setDescription(`Latency: **${Date.now() - interaction.createdTimestamp}ms**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};