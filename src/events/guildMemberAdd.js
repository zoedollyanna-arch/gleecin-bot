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

    // Create welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('⚙️ New connection detected…')
      .setDescription(`Welcome to GLEECIN, ${member}.\n\nWhere digital infrastructure meets creative retail.\n\nFrom full RP systems and automation to skins, clothing, and curated releases — this is the core.\n\nActivate your access below to enter the network.`)
      .setColor('#00ff88')
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    // Create access button
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('get_access')
          .setLabel('Get Access')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔓')
      );

    // Send welcome message
    await entryChannel.send({
      content: `<@${member.user.id}>`,
      embeds: [welcomeEmbed],
      components: [row]
    }).catch(console.error);
  }
};
