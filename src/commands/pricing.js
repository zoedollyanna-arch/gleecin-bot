/**
 * /pricing — the official price list, generated from the catalog.
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

import { COLORS } from '../tickets/index.js';
import {
  groupedCatalog,
  ADD_ONS,
  TURNAROUND,
  POLICIES,
  priceLabel,
  addOnLabel
} from '../config/pricing.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pricing')
    .setDescription('Show the official JWETT Commissions price list')
    .addBooleanOption((o) =>
      o.setName('public')
        .setDescription('Post it visibly in the channel instead of just to you')
        .setRequired(false)
    ),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('JWETT COMMISSIONS — Official Price List')
      .setDescription('Custom Builds · Systems · Experiences')
      .setColor(COLORS.commission)
      .setFooter({ text: 'Built by Jwett' })
      .setTimestamp();

    for (const [group, items] of groupedCatalog()) {
      embed.addFields({
        name: group === 'Trending' ? '🔥 Trending' : group,
        value: items.map((t) => `${t.emoji} **${t.label}** — ${priceLabel(t)}`).join('\n')
      });
    }

    embed.addFields(
      {
        name: '⚙️ Add-ons',
        value: ADD_ONS.map((a) => `• **${a.label}** — ${addOnLabel(a)}`).join('\n')
      },
      {
        name: '⏱️ Turnaround',
        value: `${TURNAROUND.standard}\n${TURNAROUND.rush}\n${TURNAROUND.sameDay}`
      },
      {
        name: '📋 Included',
        value: POLICIES.map((p) => `• ${p}`).join('\n')
      }
    );

    const isPublic = interaction.options.getBoolean('public') ?? false;
    return interaction.reply({
      embeds: [embed],
      ...(isPublic ? {} : { flags: MessageFlags.Ephemeral })
    });
  }
};
