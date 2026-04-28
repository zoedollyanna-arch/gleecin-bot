/**
 * Send the welcome embed to a real Discord channel for visual preview
 * Usage: node test-welcome-discord.js <channel_id>
 * Or set TEST_CHANNEL_ID in your .env
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const TEST_CHANNEL_ID = process.argv[2] || process.env.TEST_CHANNEL_ID || process.env.ENTRY_CHANNEL_ID;
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN environment variable');
  process.exit(1);
}

if (!TEST_CHANNEL_ID) {
  console.error('❌ Please provide a channel ID: node test-welcome-discord.js <channel_id>');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(TEST_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error('❌ Channel not found or is not a text channel');
      process.exit(1);
    }

    // Build the welcome embed exactly like guildMemberAdd does
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('⚙️ Welcome to GLEECIN')
      .setDescription(`Welcome to the hub of digital infrastructure and creative excellence, <@${client.user.id}>.

**Where advanced scripting meets curated digital assets.**

We offer comprehensive scripting education, premium tools, and creative marketplace access. Whether you're learning to code or selling your creations, you've found the right place.

🎓 **Explore your options below:**`)
      .setColor('#00ff88')
      .setThumbnail(client.user.displayAvatarURL())
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

    const row3 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('get_access')
          .setLabel('Activate Member Access')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔓')
      );

    const message = await channel.send({
      content: `<@${client.user.id}>`,
      embeds: [welcomeEmbed],
      components: [row1, row2, row3]
    });

    console.log(`✅ Welcome message sent to #${channel.name}`);
    console.log(`🔗 Message URL: https://discord.com/channels/${channel.guildId}/${channel.id}/${message.id}`);

  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);

