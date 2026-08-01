/**
 * /ticket — staff-side ticket management.
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

import {
  COLORS,
  isStaff,
  buildCommissionPanel,
  buildSupportPanel,
  buildClassPanel,
  buildTicketEmbed,
  buildStaffRows,
  buildTranscript,
  transcriptFile,
  applyStatusSideEffects,
  closeAndArchive,
  reportClose,
  TYPE_ICONS
} from '../tickets/index.js';

import {
  getTicketByChannel,
  getOpenTickets,
  getTicketStats,
  setStatus,
  setQuote,
  setRevisionsAllowed,
  getTranscriptByNumber,
  getClosedTickets,
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
            { name: 'Support', value: 'support' },
            { name: 'Scripting class application', value: 'class' }
          )
        )
    )
    .addSubcommand((s) =>
      s.setName('revisions')
        .setDescription('Set how many revisions are included on this ticket (staff)')
        .addIntegerOption((o) =>
          o.setName('allowed').setDescription('Included revisions').setRequired(true).setMinValue(0).setMaxValue(20)
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
        .setDescription('Close this ticket — transcript is saved and the channel removed')
        .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(false))
    )
    .addSubcommand((s) =>
      s.setName('history')
        .setDescription('Pull a closed ticket back from the database (staff)')
        .addIntegerOption((o) =>
          o.setName('number').setDescription('Ticket number to retrieve').setRequired(false).setMinValue(1)
        )
        .addUserOption((o) =>
          o.setName('user').setDescription('List closed tickets for this person').setRequired(false)
        )
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
      revisions: handleRevisions,
      transcript: handleTranscript,
      notes: handleNotes,
      close: handleClose,
      history: handleHistory,
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
  const panel =
    type === 'commission'
      ? await buildCommissionPanel(interaction.guild.id)
      : type === 'class'
        ? buildClassPanel()
        : buildSupportPanel();

  await interaction.channel.send(panel);
  return interaction.reply({ content: `✅ ${type} panel posted.`, ...EPHEMERAL });
}

async function handleRevisions(interaction) {
  const ticket = await ticketHere(interaction);
  if (!ticket) return;

  const allowed = interaction.options.getInteger('allowed');
  const updated = await setRevisionsAllowed(interaction.channel.id, allowed);

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.info)
        .setDescription(
          `🔁 **${allowed}** revision(s) included on this project. ` +
          `Used so far: **${updated.revisions_used}**.`
        )
        .setTimestamp()
    ]
  });
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

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.info)
        .setDescription(`📊 Status is now **${STATUS_LABELS[updated.status]}**.`)
        .setTimestamp()
    ]
  });

  const notes = await applyStatusSideEffects({
    guild: interaction.guild,
    channel: interaction.channel,
    ticket: updated,
    status
  });
  if (notes.length) await interaction.followUp({ content: notes.join('\n'), ...EPHEMERAL });
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
  const result = await closeAndArchive({
    channel: interaction.channel,
    ticket,
    closedBy: interaction.user,
    reason: interaction.options.getString('reason') || 'No reason given'
  });

  return reportClose(interaction, ticket, result);
}

/**
 * Pull a closed ticket's record back out of the database.
 *
 * This is what replaces keeping dead channels around: the conversation is
 * stored on close and retrieved on demand.
 */
async function handleHistory(interaction) {
  await interaction.deferReply(EPHEMERAL);

  const number = interaction.options.getInteger('number');

  if (number) {
    const record = await getTranscriptByNumber(interaction.guild.id, number);
    if (!record) {
      return interaction.editReply({ content: `❌ No ticket #${number} in this server.` });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${TYPE_ICONS[record.type] ?? '🎫'} #${record.ticket_number} — ${record.subject ?? record.type}`)
      .setColor(COLORS.info)
      .addFields(
        { name: 'Opened by', value: `<@${record.user_id}>`, inline: true },
        { name: 'Status', value: STATUS_LABELS[record.status] ?? record.status, inline: true },
        ...(record.quote_amount
          ? [{ name: 'Value', value: formatPrice(record.quote_amount), inline: true }]
          : []),
        {
          name: 'Opened',
          value: `<t:${Math.floor(new Date(record.created_at).getTime() / 1000)}:D>`,
          inline: true
        },
        ...(record.closed_at
          ? [{
              name: 'Closed',
              value: `<t:${Math.floor(new Date(record.closed_at).getTime() / 1000)}:D>`,
              inline: true
            }]
          : [])
      )
      .setTimestamp();

    if (!record.body) {
      embed.setFooter({ text: 'No transcript stored for this ticket.' });
      return interaction.editReply({ embeds: [embed] });
    }

    embed.setFooter({ text: `${record.message_count} messages` });
    return interaction.editReply({
      embeds: [embed],
      files: [transcriptFile(record.body, record.ticket_number)]
    });
  }

  const user = interaction.options.getUser('user');
  const closed = await getClosedTickets(interaction.guild.id, { userId: user?.id ?? null });

  if (closed.length === 0) {
    return interaction.editReply({
      content: user ? `📋 No closed tickets for ${user}.` : '📋 No closed tickets yet.'
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(user ? `📋 Closed tickets — ${user.displayName ?? user.username}` : '📋 Closed tickets')
    .setColor(COLORS.info)
    .setDescription(
      closed
        .map(
          (t) =>
            `${TYPE_ICONS[t.type] ?? '🎫'} **#${t.ticket_number}** ${t.subject ?? t.user_tag}` +
            (t.quote_amount ? ` · ${formatPrice(t.quote_amount)}` : '') +
            (t.closed_at ? ` · <t:${Math.floor(new Date(t.closed_at).getTime() / 1000)}:R>` : '') +
            (t.has_transcript ? '' : ' · _no transcript_')
        )
        .join('\n')
        .slice(0, 4000)
    )
    .setFooter({ text: 'Use /ticket history number:<n> to pull the full transcript' });

  return interaction.editReply({ embeds: [embed] });
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
