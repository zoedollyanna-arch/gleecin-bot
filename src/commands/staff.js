/**
 * /staff — the operator's queue view.
 *
 * Built for a single operator: rather than splitting work across people, this
 * answers "what needs me right now, and in what order".
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

import { COLORS, isStaff } from '../tickets/index.js';
import { getOpenTickets, STATUS_LABELS, PRIORITY_LABELS } from '../database/models/ticket.js';
import { formatPrice } from '../config/pricing.js';

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

/** Statuses where the ball is in the client's court, not yours. */
const WAITING_ON_CLIENT = new Set(['quoted', 'review']);

export default {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Staff tools')
    .addSubcommand((s) =>
      s.setName('workload').setDescription('What needs attention, ordered by priority')
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server only.', ...EPHEMERAL });
    }
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Staff only.', ...EPHEMERAL });
    }

    const tickets = await getOpenTickets(interaction.guild.id);

    if (tickets.length === 0) {
      return interaction.reply({ content: '✨ Queue is clear — no open tickets.', ...EPHEMERAL });
    }

    const onYou = tickets.filter((t) => !t.awaiting_client && !WAITING_ON_CLIENT.has(t.status));
    const onThem = tickets.filter((t) => t.awaiting_client || WAITING_ON_CLIENT.has(t.status));

    const pipeline = tickets
      .filter((t) => !t.paid_at && t.quote_amount)
      .reduce((sum, t) => sum + t.quote_amount, 0);

    const age = (t) => `<t:${Math.floor(new Date(t.created_at).getTime() / 1000)}:R>`;
    const render = (t) =>
      `${t.type === 'commission' ? '🎨' : '🆘'} **#${t.ticket_number}** ${t.subject ?? t.user_tag}\n` +
      `<#${t.channel_id}> · ${PRIORITY_LABELS[t.priority]} · ${STATUS_LABELS[t.status]}` +
      (t.quote_amount ? ` · ${formatPrice(t.quote_amount)}` : '') +
      ` · opened ${age(t)}`;

    const embed = new EmbedBuilder()
      .setTitle('🗂️ Your Queue')
      .setColor(COLORS.info)
      .setDescription(
        `**${tickets.length}** open · **${onYou.length}** need you · ` +
        `**${formatPrice(pipeline)}** quoted and unpaid`
      )
      .setTimestamp();

    if (onYou.length) {
      embed.addFields({
        name: `🔴 Waiting on you (${onYou.length})`,
        value: onYou.slice(0, 10).map(render).join('\n\n').slice(0, 1024)
      });
    }
    if (onThem.length) {
      embed.addFields({
        name: `⏳ Waiting on client (${onThem.length})`,
        value: onThem.slice(0, 10).map(render).join('\n\n').slice(0, 1024)
      });
    }

    return interaction.reply({ embeds: [embed], ...EPHEMERAL });
  }
};
