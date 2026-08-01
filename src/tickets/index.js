/**
 * Ticket system — shared building blocks.
 *
 * Panels, modals, embeds, staff controls, and the create/close service used by
 * both the slash commands and the button/select handlers. Previously the
 * command and the interaction handler each carried their own copy of this
 * logic and had already drifted apart; this is the single implementation.
 */

import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

import {
  COMMISSION_TYPES,
  ADD_ONS,
  TURNAROUND,
  getCommissionType,
  priceLabel,
  addOnLabel,
  formatPrice
} from '../config/pricing.js';

import {
  createTicket,
  findOpenTicketForUser,
  getTicketByChannel,
  closeTicket,
  addNote,
  peekNextTicketNumber,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TICKET_STATUSES
} from '../database/models/ticket.js';

export const COLORS = {
  commission: 0xff6b9d,
  support: 0xff6600,
  success: 0x00ff88,
  danger: 0xff3355,
  info: 0x5865f2
};

/** Support request categories — the support equivalent of the price list. */
export const SUPPORT_CATEGORIES = [
  { value: 'order', label: 'Order / Delivery issue', emoji: '📦', blurb: "Something you bought didn't arrive or arrived broken." },
  { value: 'product', label: 'Product bug or fault', emoji: '🐞', blurb: 'A script or system is misbehaving in-world.' },
  { value: 'academy', label: 'Academy access', emoji: '🎓', blurb: 'Enrolment, class access, or course materials.' },
  { value: 'payment', label: 'Payment / Billing', emoji: '💳', blurb: 'Charges, refunds, or payment problems.' },
  { value: 'account', label: 'Account / Roles', emoji: '🔑', blurb: 'Wrong roles, missing channels, access problems.' },
  { value: 'other', label: 'Something else', emoji: '💬', blurb: "Anything that doesn't fit the list." }
];

export const getSupportCategory = (value) =>
  SUPPORT_CATEGORIES.find((c) => c.value === value) ?? null;

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Staff check.
 *
 * Deliberately broader than a single role ID: the server owner and anyone with
 * Administrator always count. On a one-person operation the STAFF role often
 * isn't actually assigned to the owner, and a bare role check would lock them
 * out of their own staff controls.
 */
export function isStaff(member) {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;

  const staffRoles = [process.env.STAFF_ROLE_ID, process.env.INSTRUCTOR_ROLE_ID].filter(Boolean);
  return staffRoles.some((roleId) => member.roles.cache.has(roleId));
}

// ---------------------------------------------------------------------------
// Panels (posted once into the intake channels)
// ---------------------------------------------------------------------------

export function buildCommissionPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🎨 Open a Commission')
    .setColor(COLORS.commission)
    .setDescription(
      'Pick what you want built. The next step is a short form — the more detail you give, the faster you get a quote.\n\n' +
      `**Turnaround** — ${TURNAROUND.standard}\n${TURNAROUND.rush}\n${TURNAROUND.sameDay}`
    )
    .addFields({
      name: 'Starting prices',
      value: COMMISSION_TYPES.filter((t) => !t.quoteOnly)
        .map((t) => `${t.emoji} **${t.label}** — ${priceLabel(t)}`)
        .join('\n')
    })
    .setFooter({ text: 'Free project consultation • Revisions included based on scope' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('commission_select')
    .setPlaceholder('What do you need built?')
    .addOptions(
      COMMISSION_TYPES.map((type) =>
        new StringSelectMenuOptionBuilder()
          .setValue(type.value)
          .setLabel(`${type.label} — ${priceLabel(type)}`.slice(0, 100))
          .setDescription(type.blurb.slice(0, 100))
          .setEmoji(type.emoji)
      )
    );

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}

export function buildSupportPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🆘 Open a Support Ticket')
    .setColor(COLORS.support)
    .setDescription('Pick the closest match and fill in the short form. A private channel opens just for you.')
    .addFields({
      name: 'Categories',
      value: SUPPORT_CATEGORIES.map((c) => `${c.emoji} **${c.label}** — ${c.blurb}`).join('\n')
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('support_select')
    .setPlaceholder('What do you need help with?')
    .addOptions(
      SUPPORT_CATEGORIES.map((c) =>
        new StringSelectMenuOptionBuilder()
          .setValue(c.value)
          .setLabel(c.label)
          .setDescription(c.blurb.slice(0, 100))
          .setEmoji(c.emoji)
      )
    );

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}

// ---------------------------------------------------------------------------
// Intake modals
// ---------------------------------------------------------------------------

const textInput = (id, label, { style = TextInputStyle.Short, required = true, placeholder, max } = {}) => {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label.slice(0, 45))
    .setStyle(style)
    .setRequired(required);
  if (placeholder) input.setPlaceholder(placeholder.slice(0, 100));
  if (max) input.setMaxLength(max);
  return new ActionRowBuilder().addComponents(input);
};

export function buildCommissionModal(typeValue) {
  const type = getCommissionType(typeValue);
  const modal = new ModalBuilder()
    .setCustomId(`commission_modal:${typeValue}`)
    .setTitle(`${type?.label ?? 'Commission'}`.slice(0, 45));

  modal.addComponents(
    textInput('subject', 'Project title', { placeholder: 'e.g. Vendor HUD for my main store', max: 100 }),
    textInput('description', 'What do you need? Be specific.', {
      style: TextInputStyle.Paragraph,
      placeholder: 'Features, how it should behave, where it will be used…',
      max: 1500
    }),
    textInput('budget', 'Your budget (L$)', {
      required: false,
      placeholder: type?.quoteOnly ? 'Optional' : `Guide price: ${priceLabel(type)}`,
      max: 60
    }),
    textInput('deadline', 'Deadline / when do you need it?', {
      required: false,
      placeholder: 'e.g. 2 weeks, or "rush — 2 days"',
      max: 100
    }),
    textInput('references', 'Reference links or examples', {
      style: TextInputStyle.Paragraph,
      required: false,
      placeholder: 'Marketplace links, screenshots, similar products…',
      max: 500
    })
  );

  return modal;
}

export function buildSupportModal(categoryValue) {
  const category = getSupportCategory(categoryValue);
  const modal = new ModalBuilder()
    .setCustomId(`support_modal:${categoryValue}`)
    .setTitle(`${category?.label ?? 'Support'}`.slice(0, 45));

  modal.addComponents(
    textInput('subject', 'Short summary', { placeholder: 'One line — what is wrong?', max: 100 }),
    textInput('description', 'Full details', {
      style: TextInputStyle.Paragraph,
      placeholder: 'What happened, what you expected, what you already tried…',
      max: 1500
    }),
    textInput('reference', 'Product / order reference', {
      required: false,
      placeholder: 'Product name, order number, or transaction ID',
      max: 100
    }),
    textInput('urgency', 'How urgent is this?', {
      required: false,
      placeholder: 'low / normal / high / urgent',
      max: 20
    })
  );

  return modal;
}

// ---------------------------------------------------------------------------
// Ticket embed + staff controls
// ---------------------------------------------------------------------------

export function buildTicketEmbed(ticket) {
  const isCommission = ticket.type === 'commission';
  const type = isCommission ? getCommissionType(ticket.category) : getSupportCategory(ticket.category);

  const embed = new EmbedBuilder()
    .setTitle(`${isCommission ? '🎨' : '🆘'} #${String(ticket.ticket_number).padStart(4, '0')} — ${ticket.subject ?? 'Ticket'}`)
    .setColor(isCommission ? COLORS.commission : COLORS.support)
    .setDescription(ticket.description || '_No description given._')
    .addFields(
      { name: 'Type', value: type?.label ?? ticket.type, inline: true },
      { name: 'Status', value: STATUS_LABELS[ticket.status] ?? ticket.status, inline: true },
      { name: 'Priority', value: PRIORITY_LABELS[ticket.priority] ?? ticket.priority, inline: true },
      { name: 'Opened by', value: `<@${ticket.user_id}>`, inline: true }
    )
    .setFooter({ text: `Ticket #${ticket.ticket_number}` })
    .setTimestamp(new Date(ticket.created_at));

  if (isCommission && type && !type.quoteOnly) {
    embed.addFields({ name: 'Guide price', value: priceLabel(type), inline: true });
  }
  if (ticket.budget) embed.addFields({ name: 'Client budget', value: ticket.budget, inline: true });
  if (ticket.deadline) embed.addFields({ name: 'Deadline', value: ticket.deadline, inline: true });
  if (ticket.quote_amount) {
    embed.addFields({
      name: '💰 Quoted',
      value: `**${formatPrice(ticket.quote_amount)}**${ticket.quote_note ? `\n${ticket.quote_note}` : ''}`
    });
  }
  if (ticket.reference_links) {
    embed.addFields({ name: 'References', value: ticket.reference_links.slice(0, 1024) });
  }

  return embed;
}

/**
 * Staff controls.
 *
 * No claim/escalate buttons: with a single operator handling every ticket,
 * assignment and hand-off are noise. These are the actions that actually move
 * a job forward.
 */
export function buildStaffRows(ticket) {
  const rows = [];

  const common = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk:status').setLabel('Set Status').setStyle(ButtonStyle.Primary).setEmoji('📊'),
    new ButtonBuilder().setCustomId('tk:note').setLabel('Add Note').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
    new ButtonBuilder().setCustomId('tk:nudge').setLabel('Nudge Client').setStyle(ButtonStyle.Secondary).setEmoji('🔔'),
    new ButtonBuilder().setCustomId('tk:transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
    new ButtonBuilder().setCustomId('tk:close').setLabel('Close & Archive').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );

  if (ticket.type === 'commission') {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk:quote').setLabel('Send Quote').setStyle(ButtonStyle.Success).setEmoji('💰'),
        new ButtonBuilder().setCustomId('tk:paid').setLabel('Mark Paid').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('tk:priority').setLabel('Priority').setStyle(ButtonStyle.Secondary).setEmoji('🚩')
      )
    );
  } else {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk:priority').setLabel('Priority').setStyle(ButtonStyle.Secondary).setEmoji('🚩')
      )
    );
  }

  rows.push(common);
  return rows;
}

export function buildStatusMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('tk_status_select')
      .setPlaceholder('Move this ticket to…')
      .addOptions(
        TICKET_STATUSES.filter((s) => s !== 'closed').map((s) =>
          new StringSelectMenuOptionBuilder().setValue(s).setLabel(STATUS_LABELS[s])
        )
      )
  );
}

export function buildPriorityMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('tk_priority_select')
      .setPlaceholder('Set priority…')
      .addOptions(
        Object.entries(PRIORITY_LABELS).map(([value, label]) =>
          new StringSelectMenuOptionBuilder().setValue(value).setLabel(label)
        )
      )
  );
}

export function buildQuoteModal(ticket) {
  const modal = new ModalBuilder().setCustomId('tk_quote_modal').setTitle('Send Quote');
  modal.addComponents(
    textInput('amount', 'Amount in L$ (numbers only)', {
      placeholder: '6000',
      max: 12
    }),
    textInput('scope', "What's included at this price", {
      style: TextInputStyle.Paragraph,
      placeholder: 'Deliverables, revision count, what is out of scope…',
      max: 1000
    }),
    textInput('turnaround', 'Turnaround', {
      required: false,
      placeholder: 'e.g. 1–2 weeks, or 2 days (rush)',
      max: 100
    })
  );
  return modal;
}

export function buildNoteModal() {
  const modal = new ModalBuilder().setCustomId('tk_note_modal').setTitle('Private Staff Note');
  modal.addComponents(
    textInput('note', 'Note (not shown to the client)', {
      style: TextInputStyle.Paragraph,
      placeholder: 'Anything you want on the record for this job…',
      max: 1000
    })
  );
  return modal;
}

// ---------------------------------------------------------------------------
// Create / close
// ---------------------------------------------------------------------------

/** Discord channel names must be lowercase and are limited to 100 chars. */
function channelNameFor(type, ticketNumber, username) {
  const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const prefix = `${type}-${String(ticketNumber).padStart(4, '0')}`;
  // A username of entirely non-ASCII characters slugs to an empty string, which
  // Discord rejects — fall back to the number alone.
  return (slug ? `${prefix}-${slug}` : prefix).slice(0, 90);
}

/**
 * Create the private channel and the DB row, then post the ticket embed.
 *
 * Callers must have deferred or be prepared to reply — channel creation plus a
 * DB round trip comfortably exceeds Discord's 3 second interaction window.
 */
export async function openTicket({ guild, user, type, fields = {}, openedBy = null }) {
  const existing = await findOpenTicketForUser(guild.id, user.id, type);
  if (existing) {
    return { duplicate: true, ticket: existing };
  }

  const parentId =
    type === 'commission'
      ? process.env.COMMISSION_CATEGORY_ID
      : process.env.SUPPORT_CATEGORY_ID;

  const staffRoles = [process.env.STAFF_ROLE_ID, process.env.INSTRUCTOR_ROLE_ID].filter(Boolean);

  const permissionOverwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },
    ...staffRoles.map((id) => ({
      id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }))
  ];

  // Read the number before creating the channel so it can be named correctly
  // on the first attempt — see peekNextTicketNumber for why renaming is costly.
  const ticketNumber = await peekNextTicketNumber(guild.id);

  const ticketChannel = await guild.channels.create({
    name: channelNameFor(type, ticketNumber, user.username),
    type: ChannelType.GuildText,
    parent: parentId || null,
    permissionOverwrites,
    reason: `${type} ticket for ${user.tag}`
  });

  let ticket;
  try {
    ticket = await createTicket({
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: user.id,
      userTag: user.tag,
      type,
      ticketNumber,
      category: fields.category ?? null,
      subject: fields.subject ?? null,
      description: fields.description ?? null,
      budget: fields.budget ?? null,
      deadline: fields.deadline ?? null,
      referenceLinks: fields.references ?? null
    });
  } catch (error) {
    // Don't strand an orphan channel if the insert fails.
    await ticketChannel.delete('Ticket row could not be created').catch(() => {});
    throw error;
  }

  const staffPing = process.env.STAFF_ROLE_ID ? `<@&${process.env.STAFF_ROLE_ID}> ` : '';
  await ticketChannel.send({
    content: `${staffPing}<@${user.id}>${openedBy ? ` — opened on your behalf by <@${openedBy}>` : ''}`,
    embeds: [buildTicketEmbed(ticket)],
    components: buildStaffRows(ticket)
  });

  return { duplicate: false, ticket, channel: ticketChannel };
}

/** Newest-last plain-text transcript of a ticket channel. */
export async function buildTranscript(channel, ticket) {
  const collected = [];
  let before;

  while (collected.length < 500) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch || batch.size === 0) break;
    collected.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }

  const ordered = collected.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const header = [
    `Ticket #${ticket.ticket_number} — ${ticket.type}`,
    `Subject: ${ticket.subject ?? '(none)'}`,
    `Opened by: ${ticket.user_tag} (${ticket.user_id})`,
    `Status: ${ticket.status}`,
    ticket.quote_amount ? `Quoted: L$${ticket.quote_amount}` : null,
    `Channel: #${channel.name}`,
    `Generated: ${new Date().toISOString()}`,
    ''.padEnd(60, '='),
    ''
  ].filter(Boolean);

  const body = ordered.map((m) => {
    const stamp = new Date(m.createdTimestamp).toISOString();
    const embedText = m.embeds
      .map((e) => [e.title, e.description, ...e.fields.map((f) => `${f.name}: ${f.value}`)].filter(Boolean).join(' | '))
      .join(' || ');
    const attachments = m.attachments.map((a) => a.url).join(' ');
    return `[${stamp}] ${m.author.tag}: ${[m.content, embedText, attachments].filter(Boolean).join(' ')}`.trim();
  });

  const text = [...header, ...body].join('\n');
  return new AttachmentBuilder(Buffer.from(text, 'utf8'), {
    name: `transcript-${String(ticket.ticket_number).padStart(4, '0')}.txt`
  });
}

/**
 * Close, transcript, and archive.
 *
 * The channel is kept, not deleted — a paid commission is a business record.
 * The client loses write access; staff keep full history.
 */
export async function closeAndArchive({ channel, ticket, closedBy, reason }) {
  const transcript = await buildTranscript(channel, ticket).catch(() => null);
  const updated = await closeTicket({
    channelId: channel.id,
    closedBy: closedBy.id,
    closedByTag: closedBy.tag
  });

  const embed = new EmbedBuilder()
    .setTitle('🔒 Ticket Closed')
    .setColor(COLORS.danger)
    .addFields(
      { name: 'Closed by', value: `<@${closedBy.id}>`, inline: true },
      { name: 'Opened by', value: `<@${ticket.user_id}>`, inline: true },
      { name: 'Reason', value: reason || 'No reason given' }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed], files: transcript ? [transcript] : [] }).catch(() => {});

  const archiveId = process.env.TICKET_ARCHIVE_CATEGORY_ID;
  if (archiveId) {
    await channel.setParent(archiveId, { lockPermissions: false, reason: 'Ticket archived' }).catch(() => {});
  }
  await channel.permissionOverwrites
    .edit(ticket.user_id, { SendMessages: false }, { reason: 'Ticket archived' })
    .catch(() => {});
  await channel.setName(`closed-${channel.name}`.slice(0, 90)).catch(() => {});

  return updated ?? ticket;
}

export { getTicketByChannel, addNote };
