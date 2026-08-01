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
  CLASS_TIERS,
  CLASS_INCLUDES,
  TURNAROUND,
  getCommissionType,
  getClassTier,
  priceLabel,
  formatPrice
} from '../config/pricing.js';

import { getSettings } from '../database/models/settings.js';

import {
  createTicket,
  findOpenTicketForUser,
  getTicketByChannel,
  closeTicket,
  addNote,
  saveTranscript,
  peekNextTicketNumber,
  countActiveCommissions,
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

/**
 * Commission availability, from the configured slot cap.
 *
 * A solo operator overcommits by accident; the panel refuses new intake once
 * the cap is reached rather than relying on remembering.
 */
export async function getCommissionAvailability(guildId) {
  const settings = await getSettings(guildId);
  const active = await countActiveCommissions(guildId);
  const cap = settings.commission_slots;

  return {
    open: settings.commissions_open && (cap === null || active < cap),
    manuallyClosed: !settings.commissions_open,
    active,
    cap,
    closedMessage: settings.closed_message
  };
}

export async function buildCommissionPanel(guildId) {
  const availability = guildId
    ? await getCommissionAvailability(guildId)
    : { open: true, active: 0, cap: null, manuallyClosed: false, closedMessage: null };

  const slotLine =
    availability.cap === null
      ? null
      : `**Slots** — ${availability.active} of ${availability.cap} taken`;

  const embed = new EmbedBuilder()
    .setTitle(availability.open ? '🎨 Open a Commission' : '🎨 Commissions Closed')
    .setColor(availability.open ? COLORS.commission : COLORS.danger)
    .setDescription(
      (availability.open
        ? 'Pick what you want built. The next step is a short form — the more detail you give, the faster you get a quote.'
        : availability.closedMessage ??
          (availability.manuallyClosed
            ? 'Commissions are paused right now. Check back soon — or open a support ticket if you have a question.'
            : 'All commission slots are currently full. Check back soon.')) +
      (slotLine ? `\n\n${slotLine}` : '') +
      `\n\n**Turnaround** — ${TURNAROUND.standard}\n${TURNAROUND.rush}\n${TURNAROUND.sameDay}`
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
    .setPlaceholder(availability.open ? 'What do you need built?' : 'Commissions are closed')
    .setDisabled(!availability.open)
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

// ---------------------------------------------------------------------------
// Scripting class applications
// ---------------------------------------------------------------------------

export function buildClassPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🎓 Apply to the Scripting Academy')
    .setColor(COLORS.info)
    .setDescription(
      'Enrolment is by application. Pick a tier and fill in the short form — that opens a private ' +
      'channel where we go through your application and arrange payment.\n\n' +
      'Your student role is granted once payment is confirmed.'
    )
    .addFields(
      {
        name: 'Tiers',
        value: CLASS_TIERS.map(
          (t) => `${t.emoji} **${t.label}** — ${formatPrice(t.price)}\n${t.blurb}`
        ).join('\n\n')
      },
      { name: '✅ Included in every tier', value: CLASS_INCLUDES }
    )
    .setFooter({ text: 'Classes run in monthly cohorts' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('class_select')
    .setPlaceholder('Which tier are you applying for?')
    .addOptions(
      CLASS_TIERS.map((tier) =>
        new StringSelectMenuOptionBuilder()
          .setValue(tier.value)
          .setLabel(`${tier.label} — ${formatPrice(tier.price)}`.slice(0, 100))
          .setDescription(tier.blurb.slice(0, 100))
          .setEmoji(tier.emoji)
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

export function buildClassModal(tierValue) {
  const tier = getClassTier(tierValue);
  const modal = new ModalBuilder()
    .setCustomId(`class_modal:${tierValue}`)
    .setTitle(`Apply — ${tier?.label ?? 'Class'}`.slice(0, 45));

  modal.addComponents(
    textInput('avatar', 'Your Second Life avatar name', { placeholder: 'firstname.lastname', max: 100 }),
    textInput('experience', 'Your scripting experience so far', {
      style: TextInputStyle.Paragraph,
      placeholder: 'Complete beginner? Written some LSL? Be honest — it shapes the pacing.',
      max: 800
    }),
    textInput('goals', 'What do you want to be able to build?', {
      style: TextInputStyle.Paragraph,
      placeholder: 'HUDs, vendors, RP systems, your own products…',
      max: 800
    }),
    textInput('availability', 'Availability / timezone', {
      placeholder: 'e.g. weekday evenings, SLT',
      max: 100
    }),
    textInput('questions', 'Anything you want to ask first?', {
      style: TextInputStyle.Paragraph,
      required: false,
      max: 500
    })
  );

  return modal;
}

// ---------------------------------------------------------------------------
// Ticket embed + staff controls
// ---------------------------------------------------------------------------

export const TYPE_ICONS = { commission: '🎨', support: '🆘', class: '🎓' };

const TYPE_COLORS = {
  commission: COLORS.commission,
  support: COLORS.support,
  class: COLORS.info
};

/** The catalog entry behind a ticket, whichever catalog that is. */
function categoryFor(ticket) {
  if (ticket.type === 'commission') return getCommissionType(ticket.category);
  if (ticket.type === 'class') return getClassTier(ticket.category);
  return getSupportCategory(ticket.category);
}

export function buildTicketEmbed(ticket) {
  const isCommission = ticket.type === 'commission';
  const type = categoryFor(ticket);

  const embed = new EmbedBuilder()
    .setTitle(
      `${TYPE_ICONS[ticket.type] ?? '🎫'} #${String(ticket.ticket_number).padStart(4, '0')} — ${ticket.subject ?? 'Ticket'}`
    )
    .setColor(TYPE_COLORS[ticket.type] ?? COLORS.info)
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
  if (ticket.type === 'class' && type) {
    embed.addFields(
      { name: 'Tier price', value: formatPrice(type.price), inline: true },
      { name: 'Included', value: CLASS_INCLUDES }
    );
  }
  if (ticket.budget) embed.addFields({ name: 'Client budget', value: ticket.budget, inline: true });
  if (ticket.deadline) embed.addFields({ name: 'Deadline', value: ticket.deadline, inline: true });
  if (ticket.revisions_used > 0 || ticket.revisions_allowed) {
    const allowed = ticket.revisions_allowed;
    embed.addFields({
      name: '🔁 Revisions',
      value: allowed
        ? `**${ticket.revisions_used} / ${allowed}**${ticket.revisions_used >= allowed ? ' — limit reached' : ''}`
        : `**${ticket.revisions_used}** used`,
      inline: true
    });
  }
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

  const priority = new ButtonBuilder()
    .setCustomId('tk:priority').setLabel('Priority').setStyle(ButtonStyle.Secondary).setEmoji('🚩');

  if (ticket.type === 'commission') {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk:quote').setLabel('Send Quote').setStyle(ButtonStyle.Success).setEmoji('💰'),
        new ButtonBuilder().setCustomId('tk:paid').setLabel('Mark Paid').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('tk:revision').setLabel('Log Revision').setStyle(ButtonStyle.Secondary).setEmoji('🔁'),
        priority
      )
    );
  } else if (ticket.type === 'class') {
    // Class applications share the payment step — Mark Paid is what grants
    // the student role, so the tier price stands in for a quote.
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk:paid').setLabel('Mark Paid').setStyle(ButtonStyle.Success).setEmoji('✅'),
        priority
      )
    );
  } else {
    rows.push(new ActionRowBuilder().addComponents(priority));
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
export async function openTicket({ guild, user, type, fields = {}, openedBy = null, force = false }) {
  const existing = await findOpenTicketForUser(guild.id, user.id, type);
  if (existing) {
    return { duplicate: true, ticket: existing };
  }

  // Staff opening on someone's behalf bypasses the cap deliberately — they can
  // see the queue and are making the call knowingly.
  if (type === 'commission' && !force) {
    const availability = await getCommissionAvailability(guild.id);
    if (!availability.open) {
      return { closed: true, availability };
    }
  }

  const parentId =
    type === 'commission'
      ? process.env.COMMISSION_CATEGORY_ID
      : type === 'class'
        ? process.env.CLASS_CATEGORY_ID || process.env.SUPPORT_CATEGORY_ID
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

// ---------------------------------------------------------------------------
// Status side effects
// ---------------------------------------------------------------------------

/** Prompt shown when a commission is marked delivered. */
export function buildReviewPrompt(guildId) {
  const reviewsChannelId = process.env.REVIEWS_CHANNEL_ID;

  const embed = new EmbedBuilder()
    .setTitle('📦 Delivered — thank you!')
    .setColor(COLORS.success)
    .setDescription(
      'Your commission is complete. If you are happy with it, a quick review genuinely helps — ' +
      'it takes about thirty seconds.'
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tk:review')
      .setLabel('Leave a Review')
      .setStyle(ButtonStyle.Success)
      .setEmoji('⭐')
  );

  if (reviewsChannelId) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('See other reviews')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guildId}/${reviewsChannelId}`)
    );
  }

  return { embeds: [embed], components: [row] };
}

export function buildReviewModal() {
  const modal = new ModalBuilder().setCustomId('tk_review_modal').setTitle('Leave a Review');
  modal.addComponents(
    textInput('rating', 'Rating out of 5', { placeholder: '5', max: 3 }),
    textInput('comment', 'How did it go?', {
      style: TextInputStyle.Paragraph,
      placeholder: 'What you ordered, how it turned out, how the process was…',
      max: 1000
    })
  );
  return modal;
}

/**
 * Side effects that should fire however the status was changed — button,
 * dropdown, or slash command. Centralised so the three paths can't drift.
 *
 * Everything here is best-effort: a missing role or channel should never stop
 * the status change itself from going through.
 */
/** What a client should be told, by DM, when their ticket moves. */
const STATUS_DMS = {
  quoted: (t) =>
    `💰 Your quote is ready${t.quote_amount ? ` — **${formatPrice(t.quote_amount)}**` : ''}.`,
  paid: () => '✅ Payment confirmed — work starts now.',
  in_progress: () => '🔨 Work has started on your project.',
  review: () => '👀 Something is ready for you to look over.',
  delivered: () => '📦 Your order has been delivered.'
};

export async function applyStatusSideEffects({ guild, channel, ticket, status }) {
  const notes = [];

  if (status === 'paid') {
    // Commissions grant the client role; class applications grant the student
    // role — paying is what turns an application into an enrolment.
    const roleId =
      ticket.type === 'class' ? process.env.STUDENT_ROLE_ID : process.env.CLIENT_ROLE_ID;

    if (roleId) {
      try {
        const member = await guild.members.fetch(ticket.user_id);
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId, `Paid ticket #${ticket.ticket_number}`);
          notes.push(`Granted <@&${roleId}> to <@${ticket.user_id}>.`);
        }
      } catch (error) {
        console.error('[TICKET] Could not grant role:', error.message);
        notes.push("⚠️ Could not grant the role — check the bot's role position in Server Settings.");
      }
    }
  }

  if (status === 'delivered' && ticket.type === 'commission') {
    await channel.send(buildReviewPrompt(guild.id)).catch(() => {});
  }

  // Clients rarely watch a ticket channel; a DM is what actually gets a reply.
  const dm = STATUS_DMS[status];
  if (dm) {
    try {
      const user = await guild.client.users.fetch(ticket.user_id);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(TYPE_COLORS[ticket.type] ?? COLORS.info)
            .setTitle(`${TYPE_ICONS[ticket.type] ?? '🎫'} Ticket #${ticket.ticket_number}`)
            .setDescription(`${dm(ticket)}\n\n[Open the ticket](https://discord.com/channels/${guild.id}/${ticket.channel_id})`)
            .setFooter({ text: guild.name })
            .setTimestamp()
        ]
      });
    } catch {
      // Closed DMs are common and not an error worth surfacing.
      notes.push(`ℹ️ Could not DM <@${ticket.user_id}> — they have DMs closed.`);
    }
  }

  return notes;
}

/** Newest-last plain-text transcript of a ticket channel, as raw text. */
export async function buildTranscriptText(channel, ticket) {
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

  return { text: [...header, ...body].join('\n'), messageCount: ordered.length };
}

/** Wrap transcript text as a downloadable .txt attachment. */
export function transcriptFile(text, ticketNumber) {
  return new AttachmentBuilder(Buffer.from(text, 'utf8'), {
    name: `transcript-${String(ticketNumber).padStart(4, '0')}.txt`
  });
}

/** Live transcript of an open ticket, as a file. */
export async function buildTranscript(channel, ticket) {
  const { text } = await buildTranscriptText(channel, ticket);
  return transcriptFile(text, ticket.ticket_number);
}

/**
 * Close a ticket: persist everything, then delete the channel.
 *
 * The full conversation is written to discord_ticket_transcripts, so the
 * business record survives without leaving dozens of dead channels sitting in
 * the server. Pull it back any time with /ticket history.
 *
 * Deletion happens last and only after the transcript is safely stored — if
 * saving fails, the channel is left alone rather than losing the record.
 */
export async function closeAndArchive({ channel, ticket, closedBy, reason }) {
  let transcript = null;
  let saved = false;

  try {
    transcript = await buildTranscriptText(channel, ticket);
    await saveTranscript({
      ticketId: ticket.id,
      body: transcript.text,
      messageCount: transcript.messageCount
    });
    saved = true;
  } catch (error) {
    console.error(`[TICKET] Could not save transcript for #${ticket.ticket_number}:`, error.message);
  }

  const updated = await closeTicket({
    channelId: channel.id,
    closedBy: closedBy.id,
    closedByTag: closedBy.tag
  });

  // Optional durable copy in Discord itself, so the record isn't only in the DB.
  const logChannelId = process.env.TICKET_LOG_CHANNEL_ID;
  if (logChannelId) {
    const logChannel = await channel.guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`🔒 #${String(ticket.ticket_number).padStart(4, '0')} closed — ${ticket.subject ?? ticket.type}`)
        .setColor(COLORS.danger)
        .addFields(
          { name: 'Type', value: ticket.type, inline: true },
          { name: 'Opened by', value: `<@${ticket.user_id}>`, inline: true },
          { name: 'Closed by', value: `<@${closedBy.id}>`, inline: true },
          ...(ticket.quote_amount
            ? [{ name: 'Value', value: formatPrice(ticket.quote_amount), inline: true }]
            : []),
          { name: 'Reason', value: reason || 'No reason given' }
        )
        .setFooter({ text: `Pull it back with /ticket history number:${ticket.ticket_number}` })
        .setTimestamp();

      await logChannel
        .send({
          embeds: [embed],
          files: transcript ? [transcriptFile(transcript.text, ticket.ticket_number)] : []
        })
        .catch(() => {});
    }
  }

  if (!saved) {
    // Keep the channel so nothing is lost; staff can retry or copy it manually.
    await channel
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.danger)
            .setTitle('⚠️ Transcript could not be saved')
            .setDescription(
              'This ticket is marked closed, but the transcript failed to save, so the channel has ' +
              'been left in place. Copy anything you need before deleting it manually.'
            )
        ]
      })
      .catch(() => {});
    return { ticket: updated ?? ticket, deleted: false, saved: false };
  }

  await channel.delete(`Ticket #${ticket.ticket_number} closed — transcript saved`).catch((error) => {
    console.error('[TICKET] Could not delete channel:', error.message);
  });

  return { ticket: updated ?? ticket, deleted: true, saved: true, transcript };
}

/**
 * Confirm a close back to the staff member who triggered it.
 *
 * Deleting the channel invalidates the interaction response, so editReply is
 * best-effort and the transcript is DMed as well — that copy always lands.
 */
export async function reportClose(interaction, ticket, result) {
  if (!result.saved) {
    return interaction
      .editReply({
        content:
          '⚠️ Ticket marked closed, but the transcript could not be saved — the channel has been ' +
          'left in place so nothing is lost. Check the logs.'
      })
      .catch(() => {});
  }

  if (result.transcript) {
    await interaction.user
      .send({
        content:
          `🔒 Ticket **#${ticket.ticket_number}** (${ticket.subject ?? ticket.type}) is closed and its ` +
          `transcript is saved. Pull it back any time with \`/ticket history number:${ticket.ticket_number}\`.`,
        files: [transcriptFile(result.transcript.text, ticket.ticket_number)]
      })
      .catch(() => {});
  }

  return interaction
    .editReply({ content: '✅ Closed. Transcript saved to the database — the channel has been removed.' })
    .catch(() => {});
}

export { getTicketByChannel, addNote };
