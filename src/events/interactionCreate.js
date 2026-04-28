/**
 * Unified Interaction Handler
 * Handles all button clicks, slash commands, and modals
 */

import {
  Events,
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
  deleteTicket
} from '../database/models/ticket.js';

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    if (interaction.isButton()) {
      await this.handleButton(interaction, client);
    } else if (interaction.isModalSubmit()) {
      await this.handleModal(interaction, client);
    }
  },

  async handleButton(interaction, client) {
    const buttonId = interaction.customId;

    if (buttonId === 'get_access') {
      await handleGetAccess(interaction);
    } else if (buttonId === 'enroll_class') {
      await handleEnrollClass(interaction);
    } else if (buttonId === 'open_commission') {
      await handleOpenTicket(interaction, 'commission');
    } else if (buttonId === 'open_support') {
      await handleOpenTicket(interaction, 'support');
    } else if (buttonId === 'visit_marketplace') {
      await handleVisitMarketplace(interaction);
    } else if (buttonId.startsWith('close_ticket_')) {
      await handleCloseTicketButton(interaction);
    } else if (buttonId.startsWith('claim_ticket_')) {
      await handleClaimTicket(interaction);
    } else {
      await interaction.reply({
        content: '❌ This button action is not yet configured.',
        ephemeral: true
      }).catch(() => {});
    }
  },

  async handleModal(interaction, client) {
    // Modal handlers will be added here if needed
  }
};

// =====================
// GET ACCESS
// =====================
async function handleGetAccess(interaction) {
  const visitorRoleId = process.env.VISITOR_ROLE_ID;
  const memberRoleId = process.env.MEMBER_ROLE_ID;

  if (!visitorRoleId || !memberRoleId) {
    await interaction.reply({
      content: 'Access system not properly configured. Please contact an administrator.',
      ephemeral: true
    });
    return;
  }

  const member = interaction.member;
  const visitorRole = await member.guild.roles.fetch(visitorRoleId).catch(() => null);
  const memberRole = await member.guild.roles.fetch(memberRoleId).catch(() => null);

  if (!visitorRole || !memberRole) {
    await interaction.reply({
      content: 'Roles not found. Please contact an administrator.',
      ephemeral: true
    });
    return;
  }

  try {
    if (member.roles.cache.has(visitorRoleId)) {
      await member.roles.remove(visitorRole);
    }
    await member.roles.add(memberRole);

    await interaction.reply({
      content: '🎉 **Access Granted!** Welcome to GLEECIN! You now have full member access.',
      ephemeral: true
    });

    console.log(`[ACCESS] ${member.user.tag} gained access to the server`);
  } catch (error) {
    console.error('[ACCESS ERROR]', error);
    await interaction.reply({
      content: 'There was an error granting access. Please contact an administrator.',
      ephemeral: true
    });
  }
}

// =====================
// ENROLL CLASS
// =====================
async function handleEnrollClass(interaction) {
  try {
    const enrollEmbed = new EmbedBuilder()
      .setTitle('🎓 Scripting Academy Enrollment')
      .setDescription('Ready to level up your scripting skills? Here\'s how to get started.')
      .setColor('#0099ff')
      .addFields(
        {
          name: '💰 Pricing',
          value:
            '**Standard Class:** 15,000 L$\n' +
            '**Premium Class:** 25,000 L$\n\n' +
            '• *Standard* covers core scripting fundamentals\n' +
            '• *Premium* includes advanced modules + 1-on-1 mentorship'
        },
        {
          name: '📩 How to Enroll',
          value:
            'To secure your spot, please reach out directly:\n\n' +
            '**Discord DMs:**\n' +
            '• <@1171505550333612112> (Lady Jwett)\n' +
            '• <@1171505550333612112> (GLEECIN)\n\n' +
            '**Instagram:**\n' +
            '• [@ladyjwettt](https://instagram.com/ladyjwettt)\n' +
            '• [@gleecin.sl](https://instagram.com/gleecin.sl)\n\n' +
            'Send your **desired tier** (Standard or Premium) and we\'ll get you set up.'
        },
        {
          name: '📅 Next Cohort',
          value: 'Classes run in monthly sessions. Next intake begins soon — reserve your seat now!'
        }
      )
      .setFooter({ text: 'GLEECIN Scripting Academy • Learn from the best' })
      .setTimestamp();

    await interaction.reply({ embeds: [enrollEmbed], ephemeral: true });
  } catch (error) {
    console.error('[ENROLL ERROR]', error);
    await interaction.reply({
      content: '❌ Failed to show enrollment info. Please contact an administrator.',
      ephemeral: true
    });
  }
}

// =====================
// OPEN TICKET (Unified)
// =====================
async function handleOpenTicket(interaction, ticketType) {
  const guild = interaction.guild;
  const user = interaction.user;
  const staffRoleId = process.env.STAFF_ROLE_ID;

  const typeConfig = {
    support: {
      icon: '🆘',
      color: '#ff6600',
      label: 'Support',
      description: 'A team member will assist you shortly.',
      defaultDesc: 'Support request from welcome message'
    },
    commission: {
      icon: '🎨',
      color: '#ff6b9d',
      label: 'Commission',
      description: 'A staff member will review your commission request shortly.',
      defaultDesc: 'Commission request from welcome message'
    }
  };

  const config = typeConfig[ticketType];

  try {
    const channelName = `${config.icon}-${ticketType}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);

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

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites
    });

    // Save to database
    const description = config.defaultDesc;
    await createTicket({
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: user.id,
      userTag: user.tag,
      type: ticketType,
      description
    });

    const embed = new EmbedBuilder()
      .setTitle(`${config.icon} ${config.label} Ticket Opened`)
      .setDescription(config.description)
      .setColor(config.color)
      .addFields(
        { name: 'Type', value: config.label, inline: true },
        { name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: true },
        { name: 'Status', value: '🟢 Open', inline: true }
      )
      .setFooter({ text: `Ticket ID: ${ticketChannel.id}` })
      .setTimestamp();

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

    console.log(`[TICKET] ${ticketType.toUpperCase()} ticket opened by ${user.tag} — ${ticketChannel.name}`);
  } catch (error) {
    console.error(`[${ticketType.toUpperCase()} TICKET ERROR]`, error);
    await interaction.reply({
      content: `❌ Failed to create ${ticketType} ticket. Please try again.`,
      ephemeral: true
    });
  }
}

// =====================
// CLOSE TICKET (Button)
// =====================
async function handleCloseTicketButton(interaction) {
  const channel = interaction.channel;

  // Verify this is a ticket channel
  const ticket = await getTicketByChannel(channel.id);
  if (!ticket) {
    return interaction.reply({
      content: '❌ This is not a ticket channel.',
      ephemeral: true
    });
  }

  // Check permissions
  const staffRoleId = process.env.STAFF_ROLE_ID;
  const isStaff = staffRoleId && interaction.member.roles.cache.has(staffRoleId);
  const isOwner = ticket.user_id === interaction.user.id;

  if (!isStaff && !isOwner) {
    return interaction.reply({
      content: '❌ Only staff or the ticket owner can close this ticket.',
      ephemeral: true
    });
  }

  try {
    // Update database
    await closeTicket({
      channelId: channel.id,
      closedBy: interaction.user.id,
      closedByTag: interaction.user.tag
    });

    const closeEmbed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription(`This ticket has been closed by ${interaction.user.tag}`)
      .setColor('#ff0000')
      .addFields(
        { name: 'Closed By', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
        { name: 'Original User', value: `${ticket.user_tag} (<@${ticket.user_id}>)`, inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });

    await interaction.reply({
      content: '✅ Ticket closed. This channel will be deleted in 10 seconds.',
      ephemeral: true
    });

    console.log(`[TICKET] Closed by ${interaction.user.tag} — ${channel.name}`);

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
    await interaction.reply({
      content: '❌ Failed to close ticket.',
      ephemeral: true
    });
  }
}

// =====================
// CLAIM TICKET
// =====================
async function handleClaimTicket(interaction) {
  const staffRoleId = process.env.STAFF_ROLE_ID;

  if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
    return interaction.reply({
      content: '❌ Staff only.',
      ephemeral: true
    });
  }

  const channel = interaction.channel;
  const ticket = await getTicketByChannel(channel.id);
  if (!ticket) {
    return interaction.reply({ content: '❌ Not a valid ticket channel.', ephemeral: true });
  }

  try {
    const claimEmbed = new EmbedBuilder()
      .setTitle('👤 Ticket Claimed')
      .setDescription(`This ticket has been claimed by ${interaction.user.tag}`)
      .setColor('#00ff88')
      .addFields(
        { name: 'Claimed By', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
        { name: 'Status', value: '🔵 In Progress', inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [claimEmbed] });
    await interaction.reply({ content: '✅ Ticket claimed.', ephemeral: true });

    console.log(`[TICKET] Claimed by ${interaction.user.tag} — ${channel.name}`);
  } catch (error) {
    console.error('[TICKET CLAIM ERROR]', error);
    await interaction.reply({ content: '❌ Failed to claim ticket.', ephemeral: true });
  }
}

// =====================
// VISIT MARKETPLACE
// =====================
async function handleVisitMarketplace(interaction) {
  const marketplaceEmbed = new EmbedBuilder()
    .setTitle('🛍️ GLEECIN Marketplace')
    .setDescription('Scripts, RP systems & exclusive releases — built for serious creators.')
    .setColor('#ff6b9d')
    .addFields(
      {
        name: '📦 Available Categories',
        value: '• **Scripts** — HUD systems, vendors, security tools\n• **RP Systems** — Interactive roleplay mechanics\n• **Exclusive Releases** — Limited drops and custom builds\n• **Interactive Tools** — Retail, doors, rezzing systems'
      },
      {
        name: '💳 How to Purchase',
        value: 'Use the marketplace link below to browse and buy directly.'
      }
    )
    .setFooter({ text: 'Premium digital assets for Second Life creators' })
    .setTimestamp();

  const marketplaceButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Open Marketplace')
      .setStyle(ButtonStyle.Link)
      .setURL('https://marketplace.secondlife.com/stores/263297')
      .setEmoji('🛍️')
  );

  await interaction.reply({
    embeds: [marketplaceEmbed],
    components: [marketplaceButton],
    ephemeral: true
  });
}
