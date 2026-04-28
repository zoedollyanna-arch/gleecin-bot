import { Events, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

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
      await handleOpenCommission(interaction);
    } else if (buttonId === 'visit_marketplace') {
      await handleVisitMarketplace(interaction);
    } else if (buttonId === 'open_support') {
      await handleOpenSupport(interaction);
    } else if (buttonId.startsWith('close_ticket_')) {
      await handleCloseTicket(interaction);
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
    // Remove Visitor role
    if (member.roles.cache.has(visitorRoleId)) {
      await member.roles.remove(visitorRole);
    }

    // Add Member role
    await member.roles.add(memberRole);

    await interaction.reply({
      content: '🎉 **Access Granted!** Welcome to GLEECIN! You now have full member access.',
      ephemeral: true
    });

    // Log the access grant
    console.log(`[ACCESS] ${member.user.tag} (${member.user.id}) gained access to the server`);
  } catch (error) {
    console.error('[ACCESS ERROR]', error);
    await interaction.reply({
      content: 'There was an error granting access. Please contact an administrator.',
      ephemeral: true
    });
  }
}

async function handleEnrollClass(interaction) {
  const studentRoleId = process.env.STUDENT_ROLE_ID;

  if (!studentRoleId) {
    return interaction.reply({
      content: '❌ Student role not configured.',
      ephemeral: true
    });
  }

  try {
    const member = interaction.member;
    const hasStudentRole = member.roles.cache.has(studentRoleId);

    if (hasStudentRole) {
      return interaction.reply({
        content: '✅ You\'re already enrolled in the Scripting Academy!',
        ephemeral: true
      });
    }

    await member.roles.add(studentRoleId);

    const enrollEmbed = new EmbedBuilder()
      .setTitle('🎓 Enrolled in Scripting Academy!')
      .setDescription('You are now enrolled in the Jwett Scripting Academy.')
      .setColor('#0099ff')
      .addFields(
        { name: '📅 Class Starts', value: 'May 1st, 2026', inline: true },
        { name: '📍 Main Hub', value: 'Check #class-updates for announcements', inline: true },
        { name: '🔗 Quick Links', value: 'Use `/class schedule` for class times\nUse `/class curriculum` for course content' }
      )
      .setFooter({ text: 'Ready to level up your scripting skills!' })
      .setTimestamp();

    await interaction.reply({ embeds: [enrollEmbed], ephemeral: true });

    // Log to class channel
    const classChannelId = process.env.CLASS_UPDATES_CHANNEL_ID;
    if (classChannelId) {
      const channel = await interaction.guild.channels.fetch(classChannelId).catch(() => null);
      if (channel) {
        const joinEmbed = new EmbedBuilder()
          .setTitle('👤 New Student Enrolled')
          .setDescription(`${interaction.user.username} has joined the Scripting Academy!`)
          .setColor('#00ff88')
          .setTimestamp();
        await channel.send({ embeds: [joinEmbed] }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[ENROLL ERROR]', error);
    await interaction.reply({ content: 'Failed to enroll. Please contact an administrator.', ephemeral: true });
  }
}

async function handleOpenCommission(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;
  const staffRoleId = process.env.STAFF_ROLE_ID;

  try {
    const channelName = `🎨-commission-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);

    const permissionOverwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
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
      .setTitle('🎨 Commission Request Opened')
      .setDescription(`A staff member will review your commission request shortly.`)
      .setColor('#ff9900')
      .addFields(
        { name: 'Status', value: 'Pending Review', inline: true },
        { name: 'User', value: `${user.tag}`, inline: true }
      )
      .setFooter({ text: `Commission ID: ${ticketChannel.id}` })
      .setTimestamp();

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketChannel.id}`)
        .setLabel('Close Request')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    await ticketChannel.send({ content: `<@${user.id}>`, embeds: [embed], components: [closeButton] });
    await interaction.reply({
      content: `✅ Commission request created: ${ticketChannel}`,
      ephemeral: true
    });
  } catch (error) {
    console.error('[COMMISSION ERROR]', error);
    await interaction.reply({
      content: 'Failed to create commission request. Please try again.',
      ephemeral: true
    });
  }
}

async function handleOpenSupport(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;
  const staffRoleId = process.env.STAFF_ROLE_ID;

  try {
    const channelName = `🆘-support-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);

    const permissionOverwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
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
      .setTitle('🆘 Support Ticket Opened')
      .setDescription('A team member will assist you shortly.')
      .setColor('#ff6600')
      .addFields(
        { name: 'Status', value: 'Awaiting Response', inline: true },
        { name: 'User', value: `${user.tag}`, inline: true }
      )
      .setFooter({ text: `Support Ticket ID: ${ticketChannel.id}` })
      .setTimestamp();

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketChannel.id}`)
        .setLabel('Close Support')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    await ticketChannel.send({ content: `<@${user.id}>`, embeds: [embed], components: [closeButton] });
    await interaction.reply({
      content: `✅ Support ticket created: ${ticketChannel}`,
      ephemeral: true
    });
  } catch (error) {
    console.error('[SUPPORT TICKET ERROR]', error);
    await interaction.reply({
      content: 'Failed to create support ticket. Please try again.',
      ephemeral: true
    });
  }
}

async function handleVisitMarketplace(interaction) {
  const marketplaceEmbed = new EmbedBuilder()
    .setTitle('🛍️ GLEECIN Marketplace')
    .setDescription('Explore our curated collection of digital assets, scripts, and creative tools.')
    .setColor('#ff6b9d')
    .addFields(
      {
        name: '📦 Available Categories',
        value: '• **Scripts** — HUD systems, vendors, security tools\n• **Skins & Clothing** — Fashion and avatars\n• **Animations** — Custom movements and gestures\n• **Interactive Systems** — Retail, doors, rezzing tools'
      },
      {
        name: '💳 How to Purchase',
        value: 'Use the marketplace link below to browse and buy directly.'
      }
    )
    .setFooter({ text: 'Premium digital assets for creators' })
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

async function handleCloseTicket(interaction) {
  const channel = interaction.channel;
  
  if (!channel.name.includes('ticket') && !channel.name.includes('commission') && !channel.name.includes('support')) {
    return interaction.reply({
      content: '❌ This button only works in support channels.',
      ephemeral: true
    });
  }

  try {
    const closeEmbed = new EmbedBuilder()
      .setTitle('🔒 Support Request Closed')
      .setDescription(`This request has been closed by ${interaction.user.tag}`)
      .setColor('#ff0000')
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });
    
    // Rename to indicate closed status
    const oldName = channel.name;
    if (!oldName.includes('closed')) {
      await channel.setName(`closed-${oldName.slice(0, 85)}`).catch(() => {});
    }

    await interaction.reply({
      content: '✅ Support request closed. This channel will be archived shortly.',
      ephemeral: true
    });

    console.log(`[CLOSED] ${channel.name} closed by ${interaction.user.tag}`);
  } catch (error) {
    console.error('[CLOSE TICKET ERROR]', error);
    await interaction.reply({
      content: 'Failed to close ticket. Please contact an administrator.',
      ephemeral: true
    });
  }
}
