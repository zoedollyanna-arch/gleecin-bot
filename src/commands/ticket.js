/**
 * /ticket — staff-side ticket management.
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

import {
  COLORS,
  isStaff,
  buildCommissionPanel,
  buildSupportPanel,
  buildTicketEmbed,
  buildStaffRows,
  buildTranscript,
  closeAndArchive
} from '../tickets/index.js';

import {
  getTicketByChannel,
  getOpenTickets,
  getTicketStats,
  setStatus,
  setQuote,
  getNotes,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TICKET_STATUSES
} from '../database/models/ticket.js';

import { formatPrice } from '../config/pricing.js';

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support and commission tickets')
    .addSubcommand((s) =>
      s.setName('panel')
        .setDescription('Post the intake panel in this channel (staff)')
        .addStringOption((o) =>
          o.setName('type').setDescription('Which panel').setRequired(true).addChoices(
            { name: 'Commission', value: 'commission' },
            { name: 'Support', value: 'support' }
          )
        )
    )
    .addSubcommand((s) =>
      s.setName('add')
        .setDescription('Add someone to this ticket (staff)')
        .addUserOption((o) => o.setName('user').setDescription('Who to add').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('remove')
        .setDescription('Remove someone from this ticket (staff)')
        .addUserOption((o) => o.setName('user').setDescription('Who to remove').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('rename')
        .setDescription('Rename this ticket channel (staff)')
        .addStringOption((o) => o.setName('name').setDescription('New name').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('status')
        .setDescription('Move this ticket to a new status (staff)')
        .addStringOption((o) =>
          o.setName('status').setDescription('New status').setRequired(true).addChoices(
            ...TICKET_STATUSES.filter((v) => v !== 'closed').map((v) => ({ name: STATUS_LABELS[v], value: v }))
          )
        )
    )
    .addSubcommand((s) =>
      s.setName('quote')
        .setDescription('Record and send a quote (staff)')
        .addIntegerOption((o) => o.setName('amount').setDescription('Amount in L$').setRequired(true).setMinValue(1))
        .addStringOption((o) => o.setName('scope').setDescription("What's included").setRequired(false))
    )
    .addSubcommand((s) => s.setName('transcript').setDescription('Export this ticket (staff)'))
    .addSubcommand((s) => s.setName('notes').setDescription('Show private notes on this ticket (staff)'))
    .addSubcommand((s) =>
      s.setName('close')
        .setDescription('Close and archive this ticket')
        .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
    )
    .addSubcommand((s) =>
      s.setName('list')
        .setDescription('List open tickets (staff)')
        .addStringOption((o) =>
          o.setName('type').setDescription('Filter').setRequired(false).addChoices(
            { name: 'Commission', value: 'commission' },
            { name: 'Support', value: 'support' }
          )
        )
    )
    .addSubcommand((s) => s.setName('stats').setDescription('Ticket statistics (staff)')),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server only.', ...EPHEMERAL });
    }

    const sub = interaction.options.getSubcommand();
    const staff = isStaff(interaction.member);

    // Everything except `close` is staff-only; ticket owners may close their own.
    if (!staff && sub !== 'close') {
      return interaction.reply({ content: '❌ Staff only.', ...EPHEMERAL });
    }

    const handlers = {
      panel: handlePanel,
      add: handleAdd,
      remove: handleRemove,
      rename: handleRename,
      status: handleStatus,
      quote: handleQuote,
      transcript: handleTranscript,
      notes: handleNotes,
      close: handleClose,
      list: handleList,
      stats: handleStats
    };

    return handlers[sub](interaction);
  }
};

/** Fetch the ticket for this channel, replying with an error if there isn't one. */
async function ticketHere(interaction) {
  const ticket = await getTicketByChannel(interaction.channel.id);
  if (!ticket) {
    await interaction.reply({ content: '❌ This is not a ticket channel.', ...EPHEMERAL });
    return null;
  }
  return ticket;
}

async function handlePanel(interaction) {
  const type = interaction.options.getString('type');
  const panel = type === 'commission' ? buildCommissionPanel() : buildSupportPanel();
  await interaction.channel.send(panel);
  return interaction.reply({ content: `✅ ${type} panel posted.`, ...EPHEMERAL });
}

async function handleAdd(interaction) {
  const ticket = await ticketHere(interaction);
  if (!ticket) return;

  const user = interaction.options.getUser('user');
  await interaction.channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true
  });

  await interaction.reply({ content: `✅ Added ${user} to this ticket.` });
}

async function handleRemove(interaction) {
  const ticket = await ticketHere(interaction);
  if (!ticket) return;

  const user = interaction.options.getUser('user');
  if (user.id === ticket.user_id) {
    return interaction.reply({
      content: '❌ That is the ticket owner — close the ticket instead.',
      ...EPHEMERAL
    });
  }

  await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {});
  return interaction.reply({ content: `✅ Removed ${user} from this ticket.` });
}

async function handleRename(interaction) {
  const ticket = await ticketHere(interaction);
  if (!ticket) return;

  const raw = interaction.options.getString('name');
  const name = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
  if (!name) {
    return interaction.reply({ content: '❌ That name has no usable characters.', ...EPHEMERAL });
  }

  await interaction.deferReply(EPHEMERAL);
  await interaction.channel.setName(name);
  return interaction.editReply({ content: `✅ Renamed to \`${name}\`.` });
}

async function handleStatus(interaction) {
  const ticket = await ticketHere(interaction);
  if (!ticket) return;

  const status = interaction.options.getString('status');
  const updated = await setStatus(interaction.channel.id, status);

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.info)
        .setDescription(`📊 Status is now **${STATUS_LABELS[updated.status]}**.`)
        .setTimestamp()
    ]
  });
}

async function handleQuote(interaction) {
  const ticket = await ticketHere(interaction);
  if (!ticket) return;

  const amount = interaction.options.getInteger('amount');
  const scope = interaction.options.getString('scope');
  await setQuote(interaction.channel.id, { amount, note: scope });

  return interaction.reply({
    content: `<@${ticket.user_id}>`,
    embeds: [
      new EmbedBuilder()
        .setTitle('💰 Your Quote')
        .setColor(COLORS.success)
        .setDescription(`**${formatPrice(amount)}**`)
        .addFields({ name: "What's included", value: scope || '_See the brief above._' })
        .setFooter({ text: 'Reply here to accept, or ask about anything that needs adjusting.' })
        .setTimestamp()
    ]
  });
}

async function handleTranscript(interaction) {
  const ticket = await ticketHere(interaction);
  if (!ticket) return;

  await interaction.deferReply(EPHEMERAL);
  const file = await buildTranscript(interaction.channel, ticket);
  return interaction.editReply({ content: '📄 Transcript:', files: [file] });
}

async function handleNotes(interaction) {
  const ticket = await ticketHere(interaction);
  if (!ticket) return;

  const notes = await getNotes(ticket.id);
  if (notes.length === 0) {
    return interaction.reply({ content: '📝 No notes on this ticket yet.', ...EPHEMERAL });
  }

  const embed = new EmbedBuilder()
    .setTitle(`📝 Notes — Ticket #${ticket.ticket_number}`)
    .setColor(COLORS.info)
    .setDescription(
      notes
        .slice(-15)
        .map((n) => `**${n.author_tag}** · <t:${Math.floor(new Date(n.created_at).getTime() / 1000)}:R>\n> ${n.note}`)
        .join('\n\n')
        .slice(0, 4000)
    );

  return interaction.reply({ embeds: [embed], ...EPHEMERAL });
}

async function handleClose(interaction) {
  const ticket = await ticketHere(interaction);
  if (!ticket) return;

  const staff = isStaff(interaction.member);
  if (!staff && ticket.user_id !== interaction.user.id) {
    return interaction.reply({
      content: '❌ Only staff or the ticket owner can close this.',
      ...EPHEMERAL
    });
  }

  await interaction.deferReply(EPHEMERAL);
  await closeAndArchive({
    channel: interaction.channel,
    ticket,
    closedBy: interaction.user,
    reason: interaction.options.getString('reason') || 'No reason given'
  });

  return interaction.editReply({
    content: '✅ Closed and archived. The channel is kept with a transcript attached.'
  });
}

async function handleList(interaction) {
  const type = interaction.options.getString('type');
  const tickets = await getOpenTickets(interaction.guild.id, { type });

  if (tickets.length === 0) {
    return interaction.reply({ content: '📋 No open tickets.', ...EPHEMERAL });
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Open Tickets')
    .setColor(COLORS.info)
    .setDescription(`**${tickets.length}** open`)
    .setTimestamp();

  for (const t of tickets.slice(0, 25)) {
    embed.addFields({
      name: `${t.type === 'commission' ? '🎨' : '🆘'} #${t.ticket_number} — ${t.subject ?? t.user_tag}`,
      value:
        `<#${t.channel_id}> · ${STATUS_LABELS[t.status]} · ${PRIORITY_LABELS[t.priority]}` +
        (t.quote_amount ? ` · ${formatPrice(t.quote_amount)}` : '') +
        (t.awaiting_client ? ' · ⏳ awaiting client' : ''),
      inline: false
    });
  }

  return interaction.reply({ embeds: [embed], ...EPHEMERAL });
}

async function handleStats(interaction) {
  const s = await getTicketStats(interaction.guild.id);
  const n = (v) => Number.parseInt(v, 10) || 0;

  const embed = new EmbedBuilder()
    .setTitle('📊 Ticket Statistics')
    .setColor(COLORS.success)
    .addFields(
      { name: '🟢 Open', value: `${n(s.open_count)}`, inline: true },
      { name: '🔒 Closed', value: `${n(s.closed_count)}`, inline: true },
      { name: '📈 Total', value: `${n(s.open_count) + n(s.closed_count)}`, inline: true },
      { name: '🎨 Commission', value: `${n(s.commission_count)}`, inline: true },
      { name: '🆘 Support', value: `${n(s.support_count)}`, inline: true },
      { name: '⏳ Awaiting client', value: `${n(s.awaiting_count)}`, inline: true },
      { name: '💰 Paid', value: formatPrice(n(s.paid_total)), inline: true },
      { name: '📬 Pipeline', value: formatPrice(n(s.pipeline_total)), inline: true }
    )
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ...EPHEMERAL });
}
