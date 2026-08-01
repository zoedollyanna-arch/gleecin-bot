/**
 * /mycommissions — a client's own tickets and where each one stands.
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

import { COLORS } from '../tickets/index.js';
import { getTicketsForUser, STATUS_LABELS } from '../database/models/ticket.js';
import { formatPrice } from '../config/pricing.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mycommissions')
    .setDescription('See your commissions and support tickets'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Server only.',
        flags: MessageFlags.Ephemeral
      });
    }

    const tickets = await getTicketsForUser(interaction.guild.id, interaction.user.id);

    if (tickets.length === 0) {
      return interaction.reply({
        content:
          "You don't have any tickets yet. Head to the intake channel and open one — " +
          'or run `/pricing` to see what we build.',
        flags: MessageFlags.Ephemeral
      });
    }

    const active = tickets.filter((t) => t.status !== 'closed');
    const past = tickets.filter((t) => t.status === 'closed');

    const embed = new EmbedBuilder()
      .setTitle('Your Tickets')
      .setColor(COLORS.commission)
      .setTimestamp();

    const render = (t) =>
      `${t.type === 'commission' ? '🎨' : '🆘'} **#${t.ticket_number} — ${t.subject ?? t.type}**\n` +
      `${STATUS_LABELS[t.status]}` +
      (t.quote_amount ? ` · Quoted ${formatPrice(t.quote_amount)}` : '') +
      (t.status !== 'closed' ? ` · <#${t.channel_id}>` : '') +
      (t.awaiting_client ? '\n⏳ _We\'re waiting on a reply from you._' : '');

    if (active.length) {
      embed.addFields({ name: `Active (${active.length})`, value: active.map(render).join('\n\n').slice(0, 1024) });
    }
    if (past.length) {
      embed.addFields({
        name: `Closed (${past.length})`,
        value: past.slice(0, 5).map(render).join('\n\n').slice(0, 1024)
      });
    }

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
