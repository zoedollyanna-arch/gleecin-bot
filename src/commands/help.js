import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('GLEECIN Assistant — Help')
      .setDescription([
        '**/ping** — bot status',
        '**/help** — this menu',
        '**/ticket** — open a private support ticket',
        '**/welcome** — manage welcome system (admin only)',
        '**/channels** — manage channel behaviors (admin only)'
      ].join('\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};