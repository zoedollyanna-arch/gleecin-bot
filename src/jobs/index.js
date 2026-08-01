/**
 * Background jobs.
 *
 * All of these exist because a single operator cannot also be a cron daemon:
 * chasing silent clients, remembering to post class reminders, noticing a
 * certificate was issued, and reviewing the queue each morning.
 *
 * Every job is wrapped so a failure logs and the schedule survives.
 */

import { EmbedBuilder } from 'discord.js';

import {
  findStaleTickets,
  markNudged,
  getOpenTickets,
  getTicketByChannel,
  STATUS_LABELS
} from '../database/models/ticket.js';

import { closeAndArchive, COLORS, TYPE_ICONS } from '../tickets/index.js';
import { formatPrice } from '../config/pricing.js';
import { query } from '../database/connection.js';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** Days of client silence before a nudge, and before an auto-archive. */
const NUDGE_AFTER_DAYS = 3;
const ARCHIVE_AFTER_DAYS = 7;

/** Hour of the day (server local time) the digest is sent. */
const DIGEST_HOUR = 9;

const safely = (name, fn) => async () => {
  try {
    await fn();
  } catch (error) {
    console.error(`[JOB:${name}]`, error.message);
  }
};

// ---------------------------------------------------------------------------

/**
 * Nudge tickets that have gone quiet, then archive the ones still quiet after
 * a further stretch. Only touches tickets waiting on the client, so a job
 * sitting in 'in_progress' on your side is never auto-closed.
 */
async function sweepStaleTickets(client) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return;

  for (const ticket of await findStaleTickets({ days: NUDGE_AFTER_DAYS, stage: 'nudge' })) {
    const channel = await guild.channels.fetch(ticket.channel_id).catch(() => null);
    if (!channel) continue;

    await channel.send({
      content: `<@${ticket.user_id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle('🔔 Still there?')
          .setDescription(
            `This ticket has been quiet for ${NUDGE_AFTER_DAYS} days. Reply here to keep it open — ` +
            `otherwise it will be archived in ${ARCHIVE_AFTER_DAYS - NUDGE_AFTER_DAYS} days. ` +
            'You can always open a new one later.'
          )
      ]
    }).catch(() => {});

    await markNudged(ticket.channel_id);
    console.log(`[JOB:stale] Nudged ticket #${ticket.ticket_number}`);
  }

  for (const ticket of await findStaleTickets({ days: ARCHIVE_AFTER_DAYS, stage: 'archive' })) {
    const channel = await guild.channels.fetch(ticket.channel_id).catch(() => null);
    if (!channel) continue;

    await closeAndArchive({
      channel,
      ticket,
      closedBy: client.user,
      reason: `Automatically archived after ${ARCHIVE_AFTER_DAYS} days with no reply.`
    }).catch(() => {});

    console.log(`[JOB:stale] Auto-archived ticket #${ticket.ticket_number}`);
  }
}

// ---------------------------------------------------------------------------

/** Morning summary, DMed to the guild owner. */
async function sendDailyDigest(client) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return;

  const tickets = await getOpenTickets(guild.id);
  const waitingOnYou = tickets.filter((t) => !t.awaiting_client && t.status !== 'quoted');
  const unpaid = tickets.filter((t) => t.quote_amount && !t.paid_at);
  const unpaidTotal = unpaid.reduce((sum, t) => sum + t.quote_amount, 0);
  const oldest = tickets[tickets.length - 1];

  const embed = new EmbedBuilder()
    .setTitle('☀️ Daily Digest')
    .setColor(COLORS.info)
    .setDescription(
      tickets.length === 0
        ? 'Queue is clear. Nothing open.'
        : `**${tickets.length}** open · **${waitingOnYou.length}** waiting on you · ` +
          `**${formatPrice(unpaidTotal)}** quoted and unpaid`
    )
    .setTimestamp();

  if (waitingOnYou.length) {
    embed.addFields({
      name: '🔴 Needs you',
      value: waitingOnYou
        .slice(0, 10)
        .map(
          (t) =>
            `${TYPE_ICONS[t.type] ?? '🎫'} **#${t.ticket_number}** ${t.subject ?? t.user_tag} — ` +
            `${STATUS_LABELS[t.status]} · <#${t.channel_id}>`
        )
        .join('\n')
        .slice(0, 1024)
    });
  }

  if (unpaid.length) {
    embed.addFields({
      name: '💰 Awaiting payment',
      value: unpaid
        .slice(0, 10)
        .map((t) => `**#${t.ticket_number}** ${formatPrice(t.quote_amount)} · <#${t.channel_id}>`)
        .join('\n')
        .slice(0, 1024)
    });
  }

  if (oldest) {
    embed.addFields({
      name: '⏳ Oldest open',
      value: `**#${oldest.ticket_number}** — opened <t:${Math.floor(new Date(oldest.created_at).getTime() / 1000)}:R>`
    });
  }

  const owner = await guild.fetchOwner().catch(() => null);
  if (owner) {
    await owner.send({ embeds: [embed] }).catch(() => {
      console.warn('[JOB:digest] Owner has DMs closed.');
    });
  }
}

// ---------------------------------------------------------------------------

/**
 * Remind the class channel about sessions scheduled for tomorrow.
 *
 * Reads the website's `schedules` table directly — same database, and the
 * academy is already managed from the web admin.
 */
async function postClassReminders(client) {
  const channelId = process.env.CLASS_UPDATES_CHANNEL_ID;
  if (!channelId) return;

  const result = await query(
    `SELECT id, title, instructor, scheduled_date, scheduled_time, description
     FROM schedules
     WHERE published = true AND scheduled_date = CURRENT_DATE + INTERVAL '1 day'`
  ).catch(() => null);
  if (!result || result.rows.length === 0) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  // Don't re-announce something already announced on a previous tick.
  const recent = await channel.messages.fetch({ limit: 30 }).catch(() => null);

  for (const row of result.rows) {
    const marker = `schedule-${row.id}`;
    if (recent?.some((m) => m.embeds[0]?.footer?.text === marker)) continue;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`📅 Tomorrow — ${row.title}`)
          .setColor(COLORS.info)
          .setDescription(row.description || 'See you there!')
          .addFields(
            { name: 'Time', value: row.scheduled_time || 'TBC', inline: true },
            ...(row.instructor ? [{ name: 'Instructor', value: row.instructor, inline: true }] : [])
          )
          .setFooter({ text: marker })
      ]
    }).catch(() => {});

    console.log(`[JOB:class] Announced schedule ${row.id}`);
  }
}

// ---------------------------------------------------------------------------

/**
 * Celebrate newly issued certificates in the showcase channel.
 *
 * Uses the certifications table's own `shared` flag as the marker, so a
 * certificate is only ever posted once.
 */
async function postNewCertificates(client) {
  const channelId = process.env.SHOWCASE_CHANNEL_ID;
  if (!channelId) return;

  const result = await query(
    `SELECT c.id, c.course_name, c.certificate_url, c.issued_at, u.username, u.discord_id
     FROM certifications c
     JOIN users u ON u.id = c.user_id
     WHERE c.shared IS NOT TRUE
     ORDER BY c.issued_at ASC
     LIMIT 10`
  ).catch(() => null);
  if (!result || result.rows.length === 0) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  for (const row of result.rows) {
    const who = row.discord_id ? `<@${row.discord_id}>` : `**${row.username}**`;

    const embed = new EmbedBuilder()
      .setTitle('🎓 Certificate Earned')
      .setColor(COLORS.success)
      .setDescription(`${who} completed **${row.course_name}**. Congratulations!`)
      .setTimestamp(new Date(row.issued_at));

    if (row.certificate_url) embed.setURL(row.certificate_url);

    await channel.send({ embeds: [embed] }).catch(() => {});
    await query(
      `UPDATE certifications SET shared = true, shared_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [row.id]
    );
    console.log(`[JOB:certs] Announced certificate ${row.id}`);
  }
}

// ---------------------------------------------------------------------------

/**
 * Start every recurring job.
 *
 * Intervals rather than cron: the process is long-lived and the timings are
 * coarse enough that drift does not matter.
 */
export function startJobs(client) {
  const stale = safely('stale', () => sweepStaleTickets(client));
  const classes = safely('class', () => postClassReminders(client));
  const certs = safely('certs', () => postNewCertificates(client));

  setInterval(stale, 6 * HOUR);
  setInterval(classes, 6 * HOUR);
  setInterval(certs, 10 * MINUTE);

  // First pass shortly after boot, once the guild cache is warm.
  setTimeout(() => {
    stale();
    classes();
    certs();
  }, 2 * MINUTE);

  // Digest: check hourly, fire once on the first tick past DIGEST_HOUR.
  let lastDigestDay = null;
  setInterval(
    safely('digest', async () => {
      const now = new Date();
      const today = now.toDateString();
      if (now.getHours() !== DIGEST_HOUR || lastDigestDay === today) return;
      lastDigestDay = today;
      await sendDailyDigest(client);
    }),
    30 * MINUTE
  );

  console.log('✅ [JOBS] Background jobs scheduled');
}

export { sendDailyDigest };
