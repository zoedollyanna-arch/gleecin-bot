/**
 * Unified Ticket System
 * Supports both /ticket commands and button interactions
 * Types: support, commission
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import {
  createTicket,
  getTicketByChannel,
  closeTicket,
  reopenTicket,
  deleteTicket,
  getOpenTickets,
  getTicketStats
} from '../database/models/ticket.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support and commission tickets')
    .addSubcommand(subcommand =>
      subcommand
        .setName('open')
        .setDescription('Open a new ticket')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Ticket type')
            .setRequired(true)
            .addChoices(
              { name: 'Support', value: 'support' },
              { name: 'Commission', value: 'commission' }
            )
        )
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('Describe your request')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close this ticket (staff only)')
        .addStringOption(opt =>
          opt.setName('reason')
            .setDescription('Reason for closing')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all open tickets (staff only)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Show ticket statistics (staff only)')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const user = interaction.user;

    if (!guild) {
      return interaction.reply({ content: '❌ This only works in a server.', ephemeral: true });
    }

    if (subcommand === 'open') {
      await handleOpenTicket(interaction, user, guild);
    } else if (subcommand === 'close') {
      await handleCloseTicket(interaction, user, guild);
    } else if (subcommand === 'list') {
      await handleListTickets(interaction, user, guild);
    } else if (subcommand === 'stats') {
      await handleTicketStats(interaction, user, guild);
    }
  }
};

// =====================
// TICKET OPEN
// =====================
async function handleOpenTicket(interaction, user, guild) {
  const type = interaction.options.getString('type');
  const description = interaction.options.getString('description');

  const typeConfig = {
    support: { icon: '🆘', color: '#ff6600', label: 'Support' },
    commission: { icon: '🎨', color: '#ff6b9d', label: 'Commission' }
  };

  const config = typeConfig[type];
  const channelName = `${config.icon}-${type}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);

  try {
    const staffRoleId = process.env.STAFF_ROLE_ID;
    const permissionOverwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      }
    ];

    if (staffRoleId) {
      permissionOverwrites.push({
        id: staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles
        ]
      });
    }

    // Create private channel
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites
    });

    // Save to database
    await createTicket({
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: user.id,
      userTag: user.tag,
      type,
      description
    });

    // Build ticket embed
    const embed = new EmbedBuilder()
      .setTitle(`${config.icon} ${config.label} Ticket Opened`)
      .setDescription(`**Request:**\n${description}`)
      .setColor(config.color)
      .addFields(
        { name: 'Type', value: config.label, inline: true },
        { name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: true },
        { name: 'Status', value: '🟢 Open', inline: true }
      )
      .setFooter({ text: `Ticket ID: ${ticketChannel.id}` })
      .setTimestamp();

    // Staff controls
    const staffRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketChannel.id}`)
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId(`claim_ticket_${ticketChannel.id}`)
        .setLabel('Claim Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👤')
    );

    await ticketChannel.send({ content: `<@${user.id}>`, embeds: [embed], components: [staffRow] });
    await interaction.reply({
      content: `✅ ${config.label} ticket created: ${ticketChannel}`,
      ephemeral: true
    });

    console.log(`[TICKET] ${type.toUpperCase()} ticket opened by ${user.tag} — ${ticketChannel.name}`);
  } catch (error) {
    console.error('[TICKET OPEN ERROR]', error);
    await interaction.reply({ content: '❌ Failed to create ticket. Please try again.', ephemeral: true });
  }
}

// =====================
// TICKET CLOSE
// =====================
async function handleCloseTicket(interaction, user, guild) {
  const channel = interaction.channel;
  const reason = interaction.options.getString('reason') || 'No reason provided';

  // Check if this is a ticket channel
  const ticket = await getTicketByChannel(channel.id);
  if (!ticket) {
    return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
  }

  // Check permissions (staff or ticket owner)
  const staffRoleId = process.env.STAFF_ROLE_ID;
  const isStaff = staffRoleId && interaction.member.roles.cache.has(staffRoleId);
  const isOwner = ticket.user_id === user.id;

  if (!isStaff && !isOwner) {
    return interaction.reply({ content: '❌ Only staff or the ticket owner can close this ticket.', ephemeral: true });
  }

  try {
    // Update database
    await closeTicket({
      channelId: channel.id,
      closedBy: user.id,
      closedByTag: user.tag
    });

    // Send close embed
    const closeEmbed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription(`This ticket has been closed by ${user.tag}`)
      .setColor('#ff0000')
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Closed By', value: `${user.tag} (<@${user.id}>)`, inline: true },
        { name: 'Original User', value: `${ticket.user_tag} (<@${ticket.user_id}>)`, inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });

    await interaction.reply({
      content: '✅ Ticket closed. This channel will be deleted in 10 seconds.',
      ephemeral: true
    });

    console.log(`[TICKET] Closed by ${user.tag} — ${channel.name}`);

    // Delete channel after delay
    setTimeout(async () => {
      try {
        await channel.delete('Ticket closed');
        await deleteTicket(channel.id);
      } catch (err) {
        console.error('[TICKET DELETE ERROR]', err);
      }
    }, 10000);

  } catch (error) {
    console.error('[TICKET CLOSE ERROR]', error);
    await interaction.reply({ content: '❌ Failed to close ticket.', ephemeral: true });
  }
}

// =====================
// TICKET LIST
// =====================
async function handleListTickets(interaction, user, guild) {
  const staffRoleId = process.env.STAFF_ROLE_ID;
  if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
    return interaction.reply({ content: '❌ Staff only command.', ephemeral: true });
  }

  try {
    const tickets = await getOpenTickets(guild.id);

    if (tickets.length === 0) {
      return interaction.reply({ content: '📋 No open tickets.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Open Tickets')
      .setColor('#0099ff')
      .setDescription(`**${tickets.length}** open ticket(s)`)
      .setTimestamp();

    for (const ticket of tickets.slice(0, 25)) {
      const typeIcon = ticket.type === 'commission' ? '🎨' : '🆘';
      embed.addFields({
        name: `${typeIcon} ${ticket.type.toUpperCase()} — ${ticket.user_tag}`,
        value: `> <#${ticket.channel_id}>\n> ${ticket.description.slice(0, 60)}${ticket.description.length > 60 ? '...' : ''}`,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('[TICKET LIST ERROR]', error);
    await interaction.reply({ content: '❌ Failed to list tickets.', ephemeral: true });
  }
}

// =====================
// TICKET STATS
// =====================
async function handleTicketStats(interaction, user, guild) {
  const staffRoleId = process.env.STAFF_ROLE_ID;
  if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
    return interaction.reply({ content: '❌ Staff only command.', ephemeral: true });
  }

  try {
    const stats = await getTicketStats(guild.id);

    const embed = new EmbedBuilder()
      .setTitle('📊 Ticket Statistics')
      .setColor('#00ff88')
      .addFields(
        { name: '🟢 Open', value: `${stats.open_count || 0}`, inline: true },
        { name: '🔒 Closed', value: `${stats.closed_count || 0}`, inline: true },
        { name: '📈 Total', value: `${(parseInt(stats.open_count) || 0) + (parseInt(stats.closed_count) || 0)}`, inline: true },
        { name: '🆘 Support', value: `${stats.support_count || 0}`, inline: true },
        { name: '🎨 Commission', value: `${stats.commission_count || 0}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('[TICKET STATS ERROR]', error);
    await interaction.reply({ content: '❌ Failed to get stats.', ephemeral: true });
  }
}

