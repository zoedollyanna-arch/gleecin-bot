/**
 * Unified Interaction Handler
 * Routes buttons, select menus, and modal submissions.
 */

import {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';

import {
  COLORS,
  isStaff,
  buildCommissionPanel,
  buildSupportPanel,
  buildClassPanel,
  buildCommissionModal,
  buildSupportModal,
  buildClassModal,
  buildTicketEmbed,
  buildStaffRows,
  buildStatusMenu,
  buildPriorityMenu,
  buildQuoteModal,
  buildNoteModal,
  buildReviewModal,
  buildTranscript,
  applyStatusSideEffects,
  openTicket,
  closeAndArchive,
  getSupportCategory
} from '../tickets/index.js';

import {
  getTicketByChannel,
  setStatus,
  setPriority,
  setQuote,
  setAwaitingClient,
  addNote,
  addRevision,
  STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITIES
} from '../database/models/ticket.js';

import { getCommissionType, getClassTier, formatPrice } from '../config/pricing.js';

const EPHEMERAL = { flags: MessageFlags.Ephemeral };

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    try {
      if (interaction.isButton()) return await handleButton(interaction);
      if (interaction.isStringSelectMenu()) return await handleSelect(interaction);
      if (interaction.isModalSubmit()) return await handleModal(interaction);
    } catch (error) {
      console.error('[INTERACTION ERROR]', error);
      await safeReply(interaction, '❌ Something went wrong handling that. Check the logs.');
    }
  }
};

/** Reply, or follow up if the interaction was already acknowledged. */
async function safeReply(interaction, content) {
  const payload = { content, ...EPHEMERAL };
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch {
    /* interaction expired — nothing useful left to do */
  }
}

/** Staff gate for ticket controls. Returns the ticket, or null if refused. */
async function requireStaffTicket(interaction) {
  if (!isStaff(interaction.member)) {
    await interaction.reply({ content: '❌ Staff only.', ...EPHEMERAL });
    return null;
  }
  const ticket = await getTicketByChannel(interaction.channel.id);
  if (!ticket) {
    await interaction.reply({ content: '❌ This is not a ticket channel.', ...EPHEMERAL });
    return null;
  }
  return ticket;
}

/**
 * Re-render the ticket embed in place so the header always reflects current
 * status, priority, and quote rather than the values it was opened with.
 */
async function refreshTicketMessage(channel, ticket) {
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return;
  const target = messages.find(
    (m) => m.author.bot && m.components.length > 0 && m.embeds.length > 0
  );
  if (!target) return;
  await target
    .edit({ embeds: [buildTicketEmbed(ticket)], components: buildStaffRows(ticket) })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id === 'get_access') return handleGetAccess(interaction);
  if (id === 'visit_marketplace') return handleVisitMarketplace(interaction);

  // Legacy panel buttons now lead into the select → modal intake flow.
  if (id === 'open_commission') {
    return interaction.reply({ ...(await buildCommissionPanel(interaction.guild.id)), ...EPHEMERAL });
  }
  if (id === 'open_support') {
    return interaction.reply({ ...buildSupportPanel(), ...EPHEMERAL });
  }
  if (id === 'enroll_class' || id === 'apply_class') {
    return interaction.reply({ ...buildClassPanel(), ...EPHEMERAL });
  }

  // Open to the client, not just staff — it's their review to leave.
  if (id === 'tk:review') return interaction.showModal(buildReviewModal());

  if (id.startsWith('tk:')) return handleTicketButton(interaction, id.slice(3));

  // Buttons from before the rewrite carried the channel id in the custom id.
  if (id.startsWith('close_ticket_')) return handleTicketButton(interaction, 'close');
  if (id.startsWith('claim_ticket_')) {
    return interaction.reply({
      content: 'ℹ️ Claiming was removed — use **Set Status** to move the ticket to In Progress.',
      ...EPHEMERAL
    });
  }

  return interaction.reply({ content: '❌ This button is no longer configured.', ...EPHEMERAL });
}

async function handleTicketButton(interaction, action) {
  const ticket = await requireStaffTicket(interaction);
  if (!ticket) return;

  switch (action) {
    case 'status':
      return interaction.reply({
        content: `Current status: **${STATUS_LABELS[ticket.status]}**`,
        components: [buildStatusMenu()],
        ...EPHEMERAL
      });

    case 'priority':
      return interaction.reply({
        content: `Current priority: **${PRIORITY_LABELS[ticket.priority]}**`,
        components: [buildPriorityMenu()],
        ...EPHEMERAL
      });

    case 'quote':
      return interaction.showModal(buildQuoteModal(ticket));

    case 'note':
      return interaction.showModal(buildNoteModal());

    case 'paid': {
      const updated = await setStatus(interaction.channel.id, 'paid');
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Payment Received')
            .setColor(COLORS.success)
            .setDescription(
              updated.quote_amount
                ? `**${formatPrice(updated.quote_amount)}** marked as paid. Work starts now — thank you!`
                : 'Payment marked as received. Work starts now — thank you!'
            )
            .setTimestamp()
        ]
      });

      const notes = await applyStatusSideEffects({
        guild: interaction.guild,
        channel: interaction.channel,
        ticket: updated,
        status: 'paid'
      });
      if (notes.length) await interaction.followUp({ content: notes.join('\n'), ...EPHEMERAL });

      return refreshTicketMessage(interaction.channel, updated);
    }

    case 'revision': {
      const updated = await addRevision(interaction.channel.id);
      const allowed = updated.revisions_allowed;
      const overLimit = allowed && updated.revisions_used > allowed;

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(overLimit ? COLORS.danger : COLORS.info)
            .setTitle('🔁 Revision Logged')
            .setDescription(
              allowed
                ? `**${updated.revisions_used} of ${allowed}** revisions used.` +
                  (overLimit ? '\n\nThis is beyond the agreed scope — further changes may be chargeable.' : '')
                : `**${updated.revisions_used}** revision(s) logged on this project.`
            )
            .setTimestamp()
        ]
      });
      return refreshTicketMessage(interaction.channel, updated);
    }

    case 'nudge': {
      const updated = await setAwaitingClient(interaction.channel.id, true);
      return interaction.reply({
        content: `<@${ticket.user_id}>`,
        embeds: [
          new EmbedBuilder()
            .setTitle('🔔 Waiting on you')
            .setColor(COLORS.info)
            .setDescription(
              'We need a bit more from you before this can move forward — check the messages above and reply here when you can.'
            )
        ]
      }).then(() => refreshTicketMessage(interaction.channel, updated));
    }

    case 'transcript': {
      await interaction.deferReply(EPHEMERAL);
      const file = await buildTranscript(interaction.channel, ticket);
      return interaction.editReply({ content: '📄 Transcript:', files: [file] });
    }

    case 'close': {
      await interaction.deferReply(EPHEMERAL);
      await closeAndArchive({
        channel: interaction.channel,
        ticket,
        closedBy: interaction.user,
        reason: 'Closed from ticket controls'
      });
      return interaction.editReply({
        content: '✅ Closed and archived. The channel is kept with a transcript attached.'
      });
    }

    default:
      return interaction.reply({ content: '❌ Unknown ticket action.', ...EPHEMERAL });
  }
}

// ---------------------------------------------------------------------------
// Select menus
// ---------------------------------------------------------------------------

async function handleSelect(interaction) {
  const id = interaction.customId;
  const value = interaction.values[0];

  // These open a modal, so they must not be deferred first.
  if (id === 'commission_select') return interaction.showModal(buildCommissionModal(value));
  if (id === 'support_select') return interaction.showModal(buildSupportModal(value));
  if (id === 'class_select') return interaction.showModal(buildClassModal(value));

  if (id === 'tk_status_select' || id === 'tk_priority_select') {
    const ticket = await requireStaffTicket(interaction);
    if (!ticket) return;

    const updated =
      id === 'tk_status_select'
        ? await setStatus(interaction.channel.id, value)
        : await setPriority(interaction.channel.id, value);

    const label =
      id === 'tk_status_select' ? STATUS_LABELS[value] : PRIORITY_LABELS[value];

    await interaction.update({
      content: `✅ Updated to **${label}**.`,
      components: []
    });

    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.info)
          .setDescription(
            id === 'tk_status_select'
              ? `📊 Status is now **${label}**.`
              : `🚩 Priority is now **${label}**.`
          )
          .setTimestamp()
      ]
    });

    if (id === 'tk_status_select') {
      const notes = await applyStatusSideEffects({
        guild: interaction.guild,
        channel: interaction.channel,
        ticket: updated,
        status: value
      });
      if (notes.length) await interaction.followUp({ content: notes.join('\n'), ...EPHEMERAL });
    }

    return refreshTicketMessage(interaction.channel, updated);
  }
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

async function handleModal(interaction) {
  const [id, arg] = interaction.customId.split(':');

  const intakeTypes = {
    commission_modal: 'commission',
    support_modal: 'support',
    class_modal: 'class'
  };
  if (intakeTypes[id]) return handleIntakeModal(interaction, intakeTypes[id], arg);
  if (id === 'tk_quote_modal') return handleQuoteModal(interaction);
  if (id === 'tk_note_modal') return handleNoteModal(interaction);
  if (id === 'tk_review_modal') return handleReviewModal(interaction);
}

/**
 * Publish a client review into the reviews channel.
 *
 * Posted by the bot rather than requiring the client to find the channel and
 * write it themselves — the whole point is that it takes one click.
 */
async function handleReviewModal(interaction) {
  await interaction.deferReply(EPHEMERAL);

  const ticket = await getTicketByChannel(interaction.channel.id);
  const raw = interaction.fields.getTextInputValue('rating').replace(/[^0-9]/g, '');
  const rating = Math.min(5, Math.max(1, Number.parseInt(raw, 10) || 5));
  const comment = interaction.fields.getTextInputValue('comment').trim();

  const reviewsChannelId = process.env.REVIEWS_CHANNEL_ID;
  if (!reviewsChannelId) {
    return interaction.editReply({
      content: '⚠️ No reviews channel is configured, so this could not be posted. Staff have been notified.'
    });
  }

  const channel = await interaction.guild.channels.fetch(reviewsChannelId).catch(() => null);
  if (!channel) {
    return interaction.editReply({ content: '⚠️ The reviews channel could not be reached.' });
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({
      name: interaction.user.displayName ?? interaction.user.username,
      iconURL: interaction.user.displayAvatarURL()
    })
    .setDescription(`${'⭐'.repeat(rating)}${'☆'.repeat(5 - rating)}\n\n${comment}`)
    .setTimestamp();

  if (ticket?.category) {
    const type = getCommissionType(ticket.category);
    if (type) embed.setFooter({ text: type.label });
  }

  await channel.send({ embeds: [embed] });

  return interaction.editReply({
    content: `⭐ Thank you — your review is posted in <#${reviewsChannelId}>.`
  });
}

async function handleIntakeModal(interaction, type, category) {
  await interaction.deferReply(EPHEMERAL);

  const get = (field) => {
    try {
      return interaction.fields.getTextInputValue(field)?.trim() || null;
    } catch {
      return null; // field isn't on this modal
    }
  };

  const fields =
    type === 'class'
      ? {
          category,
          subject: `${getClassTier(category)?.label ?? 'Class'} application`,
          description:
            `**Avatar:** ${get('avatar') ?? '—'}\n\n` +
            `**Experience**\n${get('experience') ?? '—'}\n\n` +
            `**Goals**\n${get('goals') ?? '—'}` +
            (get('questions') ? `\n\n**Questions**\n${get('questions')}` : ''),
          deadline: get('availability')
        }
      : {
          category,
          subject: get('subject'),
          description: get('description'),
          budget: type === 'commission' ? get('budget') : null,
          deadline: type === 'commission' ? get('deadline') : null,
          references: type === 'commission' ? get('references') : get('reference')
        };

  const result = await openTicket({
    guild: interaction.guild,
    user: interaction.user,
    type,
    fields
  });

  if (result.duplicate) {
    return interaction.editReply({
      content:
        `⚠️ You already have an open ${type} ticket: <#${result.ticket.channel_id}>\n` +
        'Please continue there, or ask staff to close it first.'
    });
  }

  if (result.closed) {
    const { active, cap, closedMessage, manuallyClosed } = result.availability;
    return interaction.editReply({
      content:
        closedMessage ??
        (manuallyClosed
          ? '🚫 Commissions are paused right now. Please check back soon.'
          : `🚫 All commission slots are full (${active} of ${cap}). Please check back soon.`)
    });
  }

  // Support intake takes a free-text urgency; map it onto the priority field.
  if (type === 'support') {
    const urgency = interaction.fields.getTextInputValue('urgency')?.trim().toLowerCase();
    if (urgency && PRIORITIES.includes(urgency)) {
      const updated = await setPriority(result.channel.id, urgency);
      await refreshTicketMessage(result.channel, updated);
    }
  }

  const label =
    type === 'commission'
      ? getCommissionType(category)?.label ?? 'Commission'
      : type === 'class'
        ? getClassTier(category)?.label ?? 'Class'
        : getSupportCategory(category)?.label ?? 'Support';

  return interaction.editReply({
    content: `✅ **${label}** ticket #${result.ticket.ticket_number} opened: ${result.channel}`
  });
}

async function handleQuoteModal(interaction) {
  const ticket = await getTicketByChannel(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ content: '❌ This is not a ticket channel.', ...EPHEMERAL });
  }

  const raw = interaction.fields.getTextInputValue('amount').replace(/[^0-9]/g, '');
  const amount = Number.parseInt(raw, 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return interaction.reply({
      content: '❌ That amount didn\'t parse. Enter digits only, e.g. `6000`.',
      ...EPHEMERAL
    });
  }

  const scope = interaction.fields.getTextInputValue('scope')?.trim();
  const turnaround = interaction.fields.getTextInputValue('turnaround')?.trim();

  const updated = await setQuote(interaction.channel.id, { amount, note: scope });

  await interaction.reply({
    content: `<@${ticket.user_id}>`,
    embeds: [
      new EmbedBuilder()
        .setTitle('💰 Your Quote')
        .setColor(COLORS.success)
        .setDescription(`**${formatPrice(amount)}**`)
        .addFields(
          { name: "What's included", value: scope || '_See the brief above._' },
          ...(turnaround ? [{ name: 'Turnaround', value: turnaround }] : [])
        )
        .setFooter({ text: 'Reply here to accept, or ask about anything that needs adjusting.' })
        .setTimestamp()
    ]
  });

  return refreshTicketMessage(interaction.channel, updated);
}

async function handleNoteModal(interaction) {
  const ticket = await getTicketByChannel(interaction.channel.id);
  if (!ticket) {
    return interaction.reply({ content: '❌ This is not a ticket channel.', ...EPHEMERAL });
  }

  const note = interaction.fields.getTextInputValue('note').trim();
  await addNote({
    ticketId: ticket.id,
    authorId: interaction.user.id,
    authorTag: interaction.user.tag,
    note
  });

  // Kept out of the channel so the client never sees it.
  return interaction.reply({
    content: `📝 Note saved to ticket #${ticket.ticket_number}:\n> ${note}`,
    ...EPHEMERAL
  });
}

// ---------------------------------------------------------------------------
// Existing non-ticket handlers
// ---------------------------------------------------------------------------

async function handleGetAccess(interaction) {
  const visitorRoleId = process.env.VISITOR_ROLE_ID;
  const memberRoleId = process.env.MEMBER_ROLE_ID;

  if (!visitorRoleId || !memberRoleId) {
    return interaction.reply({
      content: 'Access system not properly configured. Please contact an administrator.',
      ...EPHEMERAL
    });
  }

  const member = interaction.member;
  const memberRole = await member.guild.roles.fetch(memberRoleId).catch(() => null);
  if (!memberRole) {
    return interaction.reply({
      content: 'Roles not found. Please contact an administrator.',
      ...EPHEMERAL
    });
  }

  try {
    if (member.roles.cache.has(visitorRoleId)) {
      await member.roles.remove(visitorRoleId);
    }
    await member.roles.add(memberRole);

    await interaction.reply({
      content: '🎉 **Access Granted!** Welcome to GLEECIN! You now have full member access.',
      ...EPHEMERAL
    });
    console.log(`[ACCESS] ${member.user.tag} gained access to the server`);
  } catch (error) {
    console.error('[ACCESS ERROR]', error);
    await interaction.reply({
      content: 'There was an error granting access. Please contact an administrator.',
      ...EPHEMERAL
    });
  }
}

async function handleVisitMarketplace(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🛍️ GLEECIN Marketplace')
    .setDescription('Scripts, RP systems & exclusive releases — built for serious creators.')
    .setColor(COLORS.commission)
    .addFields(
      {
        name: '📦 Available Categories',
        value:
          '• **Scripts** — HUD systems, vendors, security tools\n' +
          '• **RP Systems** — Interactive roleplay mechanics\n' +
          '• **Exclusive Releases** — Limited drops and custom builds\n' +
          '• **Interactive Tools** — Retail, doors, rezzing systems'
      },
      { name: '💳 How to Purchase', value: 'Use the marketplace link below to browse and buy directly.' }
    )
    .setFooter({ text: 'Premium digital assets for Second Life creators' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Open Marketplace')
      .setStyle(ButtonStyle.Link)
      .setURL('https://marketplace.secondlife.com/stores/263297')
      .setEmoji('🛍️')
  );

  await interaction.reply({ embeds: [embed], components: [row], ...EPHEMERAL });
}
