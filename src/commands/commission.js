/**
 * /commission — post the intake panel, or open a commission for a member.
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

import {
  COLORS,
  isStaff,
  buildCommissionPanel,
  getCommissionAvailability,
  openTicket
} from '../tickets/index.js';
import { COMMISSION_TYPES, getCommissionType, priceLabel } from '../config/pricing.js';
import { updateSettings } from '../database/models/settings.js';

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
    )
    .addSubcommand((s) =>
      s.setName('slots')
        .setDescription('Cap how many commissions can be open at once (staff)')
        .addIntegerOption((o) =>
          o.setName('count')
            .setDescription('Max concurrent commissions. 0 removes the cap.')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(50)
        )
    )
    .addSubcommand((s) =>
      s.setName('open').setDescription('Reopen commission intake (staff)')
    )
    .addSubcommand((s) =>
      s.setName('close')
        .setDescription('Pause commission intake (staff)')
        .addStringOption((o) =>
          o.setName('message').setDescription('Shown on the panel while closed').setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s.setName('status').setDescription('Show current intake status and slot usage (staff)')
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server only.', ...EPHEMERAL });
    }
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Staff only.', ...EPHEMERAL });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      await interaction.channel.send(await buildCommissionPanel(interaction.guild.id));
      return interaction.reply({ content: '✅ Commission panel posted.', ...EPHEMERAL });
    }
    if (sub === 'for') return handleFor(interaction);
    return handleIntake(interaction, sub);
  }
};

/**
 * Intake controls.
 *
 * Repost the panel afterwards (`/commission panel`) if you want the visible
 * slot count to update — the posted message is a snapshot, not a live view.
 */
async function handleIntake(interaction, sub) {
  const guildId = interaction.guild.id;

  if (sub === 'slots') {
    const count = interaction.options.getInteger('count');
    await updateSettings(guildId, { commission_slots: count === 0 ? null : count });
    const availability = await getCommissionAvailability(guildId);

    return interaction.reply({
      content:
        count === 0
          ? '✅ Slot cap removed — commissions are unlimited.'
          : `✅ Capped at **${count}** concurrent commissions. Currently **${availability.active}** active.` +
            (availability.active >= count ? '\n⚠️ You are already at or over the cap, so intake is now closed.' : ''),
      ...EPHEMERAL
    });
  }

  if (sub === 'open') {
    await updateSettings(guildId, { commissions_open: true, closed_message: null });
    return interaction.reply({ content: '✅ Commission intake is open.', ...EPHEMERAL });
  }

  if (sub === 'close') {
    const message = interaction.options.getString('message');
    await updateSettings(guildId, { commissions_open: false, closed_message: message });
    return interaction.reply({
      content: `✅ Commission intake paused.${message ? `\nPanel will show: _${message}_` : ''}`,
      ...EPHEMERAL
    });
  }

  const availability = await getCommissionAvailability(guildId);
  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Commission Intake')
        .setColor(availability.open ? COLORS.success : COLORS.danger)
        .addFields(
          { name: 'Accepting', value: availability.open ? '✅ Yes' : '🚫 No', inline: true },
          { name: 'Active', value: `${availability.active}`, inline: true },
          { name: 'Cap', value: availability.cap === null ? 'Unlimited' : `${availability.cap}`, inline: true }
        )
    ],
    ...EPHEMERAL
  });
}

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
    force: true, // staff can see the queue; the cap is for self-serve intake
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
