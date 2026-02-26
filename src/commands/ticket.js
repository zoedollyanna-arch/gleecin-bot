import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Open a private support ticket')
    .addStringOption(opt =>
      opt.setName('topic')
        .setDescription('What do you need help with?')
        .setRequired(true)
    ),

  async execute(interaction) {
    const topic = interaction.options.getString('topic', true);
    const guild = interaction.guild;
    const user = interaction.user;

    if (!guild) return interaction.reply({ content: 'This only works in a server.', ephemeral: true });

    // Create channel
    const channelName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const ticketChannel = await guild.channels.create({
      name: channelName.slice(0, 90),
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        // Add staff role here if you want:
        // { id: 'STAFF_ROLE_ID', allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('Support Ticket Opened')
      .setDescription(`**Topic:** ${topic}\n\nA team member will respond soon.`)
      .setFooter({ text: `Opened by ${user.tag}` })
      .setTimestamp();

    await ticketChannel.send({ content: `<@${user.id}>`, embeds: [embed] });
    await interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });
  }
};