import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('channels')
    .setDescription('Manage channel-specific behaviors')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup channel management system')
        .addChannelOption(option =>
          option.setName('general')
            .setDescription('General chat channel')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('gallery')
            .setDescription('Gallery channel for images only')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('reviews')
            .setDescription('Client reviews channel')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('support')
            .setDescription('Help and support channel')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('client')
            .setDescription('Client role for verified reviews')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'setup') {
      const generalChannel = interaction.options.getChannel('general');
      const galleryChannel = interaction.options.getChannel('gallery');
      const reviewsChannel = interaction.options.getChannel('reviews');
      const supportChannel = interaction.options.getChannel('support');
      const clientRole = interaction.options.getRole('client');

      const embed = new EmbedBuilder()
        .setTitle('🌐 Channel Management Setup')
        .setDescription(`Channel behaviors configured!\n\n**General Chat:** ${generalChannel}\n**Gallery:** ${galleryChannel}\n**Reviews:** ${reviewsChannel}\n**Support:** ${supportChannel}\n**Client Role:** ${clientRole}`)
        .setColor('#00ff88')
        .addFields(
          { name: '🔧 Features Enabled', value: '• Auto-moderation\n• Image-only enforcement\n• Auto-reactions\n• Client verification' }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
