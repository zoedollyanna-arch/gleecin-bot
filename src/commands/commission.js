/**
 * /commission — post the intake panel, or open a commission for a member.
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

import { COLORS, isStaff, buildCommissionPanel, openTicket } from '../tickets/index.js';
import { COMMISSION_TYPES, getCommissionType, priceLabel } from '../config/pricing.js';

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

export default {
  data: new SlashCommandBuilder()
    .setName('commission')
    .setDescription('Commission intake')
    .addSubcommand((s) =>
      s.setName('panel').setDescription('Post the commission panel in this channel (staff)')
    )
    .addSubcommand((s) =>
      s.setName('for')
        .setDescription('Open a commission ticket on behalf of a member (staff)')
        .addUserOption((o) => o.setName('user').setDescription('The client').setRequired(true))
        .addStringOption((o) =>
          o.setName('type')
            .setDescription('What they want built')
            .setRequired(true)
            .addChoices(
              ...COMMISSION_TYPES.map((t) => ({
                name: `${t.label} — ${priceLabel(t)}`.slice(0, 100),
                value: t.value
              }))
            )
        )
        .addStringOption((o) =>
          o.setName('brief').setDescription('What they asked for').setRequired(false)
        )
        .addStringOption((o) =>
          o.setName('budget').setDescription('Their stated budget').setRequired(false)
        )
        .addStringOption((o) =>
          o.setName('deadline').setDescription('When they need it').setRequired(false)
        )
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server only.', ...EPHEMERAL });
    }
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Staff only.', ...EPHEMERAL });
    }

    if (interaction.options.getSubcommand() === 'panel') {
      await interaction.channel.send(buildCommissionPanel());
      return interaction.reply({ content: '✅ Commission panel posted.', ...EPHEMERAL });
    }

    return handleFor(interaction);
  }
};

async function handleFor(interaction) {
  await interaction.deferReply(EPHEMERAL);

  const user = interaction.options.getUser('user');
  if (user.bot) {
    return interaction.editReply({ content: '❌ Bots cannot be commission clients.' });
  }

  const typeValue = interaction.options.getString('type');
  const type = getCommissionType(typeValue);

  const result = await openTicket({
    guild: interaction.guild,
    user,
    type: 'commission',
    openedBy: interaction.user.id,
    fields: {
      category: typeValue,
      subject: type?.label ?? 'Commission',
      description:
        interaction.options.getString('brief') ??
        `Opened by staff on behalf of ${user.tag}. Details to be confirmed in-channel.`,
      budget: interaction.options.getString('budget'),
      deadline: interaction.options.getString('deadline')
    }
  });

  if (result.duplicate) {
    return interaction.editReply({
      content: `⚠️ ${user} already has an open commission: <#${result.ticket.channel_id}>`
    });
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ Commission opened')
        .setDescription(
          `Ticket **#${result.ticket.ticket_number}** for ${user} — ${result.channel}\n` +
          `Type: **${type?.label}** (${priceLabel(type)})`
        )
    ]
  });
}
