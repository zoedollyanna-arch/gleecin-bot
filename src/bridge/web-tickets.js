/**
 * Surfaces website support tickets in Discord.
 *
 * Before this, a ticket submitted through the site's support form only existed
 * in the database — you found out about it whenever you next opened the admin
 * dashboard. Now it arrives in a staff channel the moment it is submitted.
 */

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { bridge, BRIDGE_EVENTS } from './events.js';
import { COLORS } from '../tickets/index.js';

/**
 * Where web tickets get announced. Falls back through the configured staff
 * channels so this still works before a dedicated one is set up.
 */
function targetChannelId() {
  return (
    process.env.WEB_TICKET_CHANNEL_ID ||
    process.env.SUPPORT_CHANNEL_ID ||
    process.env.CLASS_UPDATES_CHANNEL_ID ||
    null
  );
}

export function registerWebTicketBridge(client) {
  bridge.on(BRIDGE_EVENTS.SUPPORT_TICKET_CREATED, async (ticket) => {
    try {
      const channelId = targetChannelId();
      if (!channelId) {
        console.warn('[BRIDGE] Web ticket received but no channel is configured.');
        return;
      }

      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        console.warn(`[BRIDGE] Web ticket channel ${channelId} could not be reached.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🌐 Website Support Ticket #${ticket.id}`)
        .setColor(COLORS.support)
        .setDescription(ticket.message.slice(0, 2000))
        .addFields(
          { name: 'Subject', value: ticket.subject.slice(0, 256), inline: false },
          { name: 'Category', value: ticket.category || '—', inline: true },
          {
            name: 'From',
            value: ticket.discordId ? `<@${ticket.discordId}> (${ticket.name})` : ticket.name,
            inline: true
          }
        )
        .setFooter({ text: 'Submitted through the website — reply by email or ping them here' })
        .setTimestamp();

      const components = [];
      const publicUrl = process.env.PUBLIC_URL;
      if (publicUrl) {
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Open in admin dashboard')
              .setStyle(ButtonStyle.Link)
              .setURL(`${publicUrl.replace(/\/$/, '')}/admin/support`)
          )
        );
      }

      const staffPing = process.env.STAFF_ROLE_ID ? `<@&${process.env.STAFF_ROLE_ID}>` : '';
      await channel.send({ content: staffPing || undefined, embeds: [embed], components });

      console.log(`[BRIDGE] Announced website ticket #${ticket.id}`);
    } catch (error) {
      console.error('[BRIDGE] Failed to announce web ticket:', error.message);
    }
  });

  console.log('✅ [BRIDGE] Website ticket bridge registered');
}
