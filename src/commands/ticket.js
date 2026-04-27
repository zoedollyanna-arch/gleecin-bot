import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support tickets')
    .addSubcommand(subcommand =>
      subcommand
        .setName('open')
        .setDescription('Open a new support ticket')
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Ticket category')
            .setRequired(true)
            .addChoices(
              { name: 'Support', value: 'support' },
              { name: 'Commission', value: 'commission' },
              { name: 'Bug Report', value: 'bug' },
              { name: 'Service Inquiry', value: 'inquiry' },
              { name: 'Technical Issue', value: 'technical' }
            )
        )
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('Describe your issue')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close this ticket')
        .addStringOption(opt =>
          opt.setName('reason')
            .setDescription('Why are you closing this ticket?')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reopen')
        .setDescription('Reopen a closed ticket')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const user = interaction.user;

    if (!guild) return interaction.reply({ content: 'This only works in a server.', ephemeral: true });

    if (subcommand === 'open') {
      await handleOpenTicket(interaction, user, guild);
    } else if (subcommand === 'close') {
      await handleCloseTicket(interaction, user, guild);
    } else if (subcommand === 'reopen') {
      await handleReopenTicket(interaction, user, guild);
    }
  }
};

async function handleOpenTicket(interaction, user, guild) {
  const category = interaction.options.getString('category');
  const description = interaction.options.getString('description');

  const categoryIcons = {
    support: '🆘',
    commission: '🎨',
    bug: '🐛',
    inquiry: '❓',
    technical: '⚙️'
  };

  const channelName = `${categoryIcons[category]}-ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);

  try {
    const staffRoleId = process.env.STAFF_ROLE_ID;
    const permissionOverwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ];

    if (staffRoleId) {
      permissionOverwrites.push({
        id: staffRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites
    });

    const embed = new EmbedBuilder()
      .setTitle(`${categoryIcons[category]} ${category.toUpperCase()} Ticket Opened`)
      .setDescription(`**Issue:** ${description}\n\nA team member will respond shortly.`)
      .setColor('#ff9900')
      .addFields(
        { name: 'Category', value: category.toUpperCase(), inline: true },
        { name: 'User', value: `${user.tag}`, inline: true }
      )
      .setFooter({ text: `Ticket ID: ${ticketChannel.id}` })
      .setTimestamp();

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketChannel.id}`)
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    await ticketChannel.send({ content: `<@${user.id}>`, embeds: [embed], components: [closeButton] });
    await interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });
  } catch (error) {
    console.error('[TICKET ERROR]', error);
    await interaction.reply({ content: 'Failed to create ticket. Please try again.', ephemeral: true });
  }
}

async function handleCloseTicket(interaction, user, guild) {
  const channel = interaction.channel;
  if (!channel.name.includes('ticket')) {
    return interaction.reply({ content: '❌ This command only works in ticket channels.', ephemeral: true });
  }

  const reason = interaction.options.getString('reason') || 'No reason provided';

  try {
    const closeEmbed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription(`This ticket has been closed by ${user.tag}`)
      .setColor('#ff0000')
      .addFields({ name: 'Reason', value: reason })
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });

    // Rename channel to show it's closed
    await channel.setName(channel.name.replace('ticket', 'closed-ticket'));

    // Remove user permissions
    await channel.permissionOverwrites.edit(user.id, { SendMessages: false });

    await interaction.reply({ content: '✅ Ticket closed. The user can no longer send messages.', ephemeral: true });
  } catch (error) {
    console.error('[CLOSE TICKET ERROR]', error);
    await interaction.reply({ content: 'Failed to close ticket.', ephemeral: true });
  }
}

async function handleReopenTicket(interaction, user, guild) {
  const channel = interaction.channel;
  if (!channel.name.includes('closed-ticket')) {
    return interaction.reply({ content: '❌ This command only works in closed ticket channels.', ephemeral: true });
  }

  try {
    // Rename channel back
    await channel.setName(channel.name.replace('closed-ticket', 'ticket'));

    // Restore user permissions
    const userId = channel.name.match(/\d+/) ? channel.name.match(/\d+/)[0] : null;
    if (userId) {
      await channel.permissionOverwrites.edit(userId, { SendMessages: true });
    }

    const reopenEmbed = new EmbedBuilder()
      .setTitle('🔓 Ticket Reopened')
      .setDescription(`This ticket has been reopened by ${user.tag}`)
      .setColor('#00ff00')
      .setTimestamp();

    await channel.send({ embeds: [reopenEmbed] });
    await interaction.reply({ content: '✅ Ticket reopened.', ephemeral: true });
  } catch (error) {
    console.error('[REOPEN TICKET ERROR]', error);
    await interaction.reply({ content: 'Failed to reopen ticket.', ephemeral: true });
  }
}