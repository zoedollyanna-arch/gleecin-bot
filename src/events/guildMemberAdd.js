import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

export default {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // Find the entry channel (you can configure this channel ID)
    const entryChannelId = process.env.ENTRY_CHANNEL_ID;
    const visitorRoleId = process.env.VISITOR_ROLE_ID;
    const memberRoleId = process.env.MEMBER_ROLE_ID;

    if (!entryChannelId || !visitorRoleId || !memberRoleId) {
      console.log('[WELCOME] Missing environment variables for welcome system');
      return;
    }

    const entryChannel = await client.channels.fetch(entryChannelId).catch(() => null);
    const visitorRole = await member.guild.roles.fetch(visitorRoleId).catch(() => null);

    if (!entryChannel || !visitorRole) {
      console.log('[WELCOME] Could not find entry channel or visitor role');
      return;
    }

    // Assign Visitor role
    await member.roles.add(visitorRole).catch(console.error);

    // Create welcome embed with branded styling
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('⚙️ Welcome to GLEECIN')
      .setDescription(`Welcome to the hub of digital infrastructure and creative excellence, ${member}.\n\n**Where advanced scripting meets curated digital assets.**\n\nWe offer comprehensive scripting education, premium tools, and creative marketplace access. Whether you're learning to code or selling your creations, you've found the right place.\n\n🎓 **Explore your options below:**`)
      .setColor('#00ff88')
      .setThumbnail(member.user.displayAvatarURL())
      .setImage('attachment://gleecin-logo.png')
      .addFields(
        {
          name: '📚 Scripting Academy',
          value: 'Learn professional scripting with hands-on courses and real-world projects.'
        },
        {
          name: '🎨 Commission Work',
          value: 'Submit a commission request & let our team craft something custom-built for you. From HUDs to full systems — we bring your vision to life.'
        },
        {
          name: '🛍️ Marketplace',
          value: 'Scripts, RP systems & exclusive releases — built for serious creators.'
        },
        {
          name: '🔧 Get Support',
          value: 'Need help? Create a support ticket for technical issues or inquiries.'
        }
      )
      .setFooter({ text: 'Gleecin • Premium Digital Academy & Marketplace' })
      .setTimestamp();

    // Create action buttons (4 buttons in 2 rows for better UX)
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('enroll_class')
          .setLabel('Enroll in Scripting Class')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎓'),
        new ButtonBuilder()
          .setCustomId('open_commission')
          .setLabel('Open Commission Ticket')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🎨')
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('visit_marketplace')
          .setLabel('Visit Marketplace')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🛍️'),
        new ButtonBuilder()
          .setCustomId('open_support')
          .setLabel('Open Support Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔧')
      );

    // Also include the original "Get Access" button for membership access
    const row3 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('get_access')
          .setLabel('Activate Member Access')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔓')
      );

    // Send welcome message
    await entryChannel.send({
      content: `<@${member.user.id}>`,
      embeds: [welcomeEmbed],
      components: [row1, row2, row3],
      files: []  // Logo will be fetched from workspace if available
    }).catch(console.error);
  }
};
