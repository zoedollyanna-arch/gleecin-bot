import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Manage welcome system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup welcome system in current channel')
        .addRoleOption(option =>
          option.setName('visitor')
            .setDescription('Visitor role to assign on join')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('member')
            .setDescription('Member role to assign on access')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'setup') {
      const visitorRole = interaction.options.getRole('visitor');
      const memberRole = interaction.options.getRole('member');

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Welcome System Setup')
        .setDescription(`Welcome system configured!\n\n**Visitor Role:** ${visitorRole}\n**Member Role:** ${memberRole}`)
        .setColor('#00ff88')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
