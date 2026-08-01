/**
 * JWETT COMMISSIONS — service catalog.
 *
 * Single source of truth for the /pricing command, the commission select
 * menu, and quote validation. Prices are in L$.
 *
 * Transcribed from the official price cards (Feb 24 through Apr 22). The cards
 * disagree in places; see PRICING_RULINGS below for how each was settled.
 */

export const CURRENCY = 'L$';

const fmt = (n) => `${CURRENCY}${n.toLocaleString('en-US')}`;

/**
 * Commission types. `value` is the select-menu value and the DB `category`,
 * so treat these strings as stable identifiers — renaming one orphans
 * existing ticket rows.
 */
export const COMMISSION_TYPES = [
  {
    value: 'hud_scripting',
    label: 'HUD + Scripting',
    emoji: '🔥',
    group: 'Trending',
    from: 5000,
    to: 6000,
    blurb: 'Trending — HUD design bundled with full scripting.'
  },
  {
    value: 'mesh_scripting',
    label: 'Custom Object Mesh + Scripting',
    emoji: '🔥',
    group: 'Trending',
    from: 5000,
    to: 6000,
    blurb: 'Trending — custom mesh object with scripting. Includes one texture.'
  },
  {
    value: 'discord_bot',
    label: 'Custom Discord Bot',
    emoji: '🤖',
    group: 'Systems',
    from: 6000,
    blurb: 'Slash commands, moderation, roles, tickets, economy/XP, dashboards.'
  },
  {
    value: 'rp_system',
    label: 'Custom RP System',
    emoji: '🎮',
    group: 'Experiences',
    from: 10000,
    blurb: 'NPC + object integration, HUD systems, full RP mechanics.'
  },
  {
    value: 'creator_kit',
    label: 'Creator Kit',
    emoji: '🧰',
    group: 'Systems',
    from: 5000,
    blurb: 'Full bundle — resize, texture HUD, unpackers, greeter, group inviter, vendor icons, landmark givers. Fully customizable.'
  },
  {
    value: 'building',
    label: 'Building',
    emoji: '🏛️',
    group: 'Creation',
    from: 5000,
    blurb: 'Full builds — structures and environments.'
  },
  {
    value: 'mesh',
    label: 'Mesh / Object Creation',
    emoji: '🧊',
    group: 'Creation',
    from: 2000,
    blurb: 'Custom mesh objects.'
  },
  {
    value: 'creator_scripts',
    label: 'Creator Scripts',
    emoji: '📜',
    group: 'Systems',
    from: 2000,
    blurb: 'Resize, texture HUD, unpackers, greeters, group inviters, vendor icons, landmark givers.'
  },
  {
    value: 'hud_design',
    label: 'HUD Design',
    emoji: '🎛️',
    group: 'Systems',
    from: 1000,
    blurb: 'HUD interface design.'
  },
  {
    value: 'fivem',
    label: 'FiveM Server System',
    emoji: '🚓',
    group: 'Systems',
    quoteOnly: true,
    blurb: 'FiveM server systems, FiveM Discord bots, custom dev for RP communities.'
  },
  {
    value: 'other',
    label: 'Something else / Not sure',
    emoji: '💬',
    group: 'Other',
    quoteOnly: true,
    blurb: 'Free project consultation — describe it and we scope it.'
  }
];

/** Optional extras, priced per the Add-Ons card. Multi-select. */
export const ADD_ONS = [
  { value: 'scripting', label: 'Scripting', price: 2000 },
  { value: 'animations_sounds', label: 'Animations / Sounds', price: 1000 },
  { value: 'npc', label: 'NPC Integrations', price: 2000 },
  { value: 'furniture', label: 'Furniture & Objects', price: 3000 },
  { value: 'advanced', label: 'Advanced Systems', price: 5000, upTo: true },
  { value: 'rush', label: 'Rush Delivery', price: 2000, note: 'Priority turnaround' },
  { value: 'rush_2day', label: 'Rush Delivery — guaranteed 2-day', price: 5000, note: 'Hard 2-day deadline' }
];

/**
 * Scripting Academy tiers.
 *
 * Enrolment is by application, not self-serve: applying opens a class ticket,
 * and the student role is granted only when that ticket is marked paid.
 */
export const CLASS_TIERS = [
  {
    value: 'standard',
    label: 'Standard Class',
    emoji: '📘',
    price: 15000,
    blurb: 'Core scripting fundamentals.'
  },
  {
    value: 'premium',
    label: 'Premium Class',
    emoji: '🌟',
    price: 25000,
    blurb: 'Advanced modules plus 1-on-1 mentorship.'
  }
];

export const getClassTier = (value) => CLASS_TIERS.find((t) => t.value === value) ?? null;

export const TURNAROUND = {
  standard: '1–2 weeks, based on project size',
  rush: `Rush delivery ${fmt(2000)}, or ${fmt(5000)} for a guaranteed 2-day turnaround`,
  sameDay: 'Same-day service available on request'
};

export const POLICIES = [
  'Free project consultation',
  'Private / exclusive builds available',
  'Revisions included based on scope'
];

/**
 * Where the Feb 24 and Apr price cards disagreed, these are the rulings that
 * settled it. Kept in the file so the numbers stay auditable against the cards
 * rather than looking like transcription errors.
 */
export const PRICING_RULINGS = [
  'Rush: split into two tiers — L$2,000 general, L$5,000 guaranteed 2-day (cards listed each separately).',
  'Discord bots: L$6,000, superseding both the Feb L$10,000 and the Apr L$8,000 promo.',
  'Custom RP: L$10,000 per the Feb card, not the Apr L$8,000.',
  'Creator Kit: reinstated from the Feb card, repriced to L$5,000, separate from Creator Scripts.',
  'Mesh + Scripting: includes one texture, per the Apr 22 card.',
  'Customization fee (Feb, L$4,000) not carried over — no longer a line item.'
];

/** Human-readable price for a commission type. */
export function priceLabel(type) {
  if (type.quoteOnly) return 'Quote on request';
  if (type.to) return `${fmt(type.from)}–${fmt(type.to)}`;
  return `from ${fmt(type.from)}`;
}

/** Human-readable price for an add-on. */
export function addOnLabel(addOn) {
  return addOn.upTo ? `up to +${fmt(addOn.price)}` : `+${fmt(addOn.price)}`;
}

/** Look up a commission type by its stable `value`. */
export function getCommissionType(value) {
  return COMMISSION_TYPES.find((t) => t.value === value) ?? null;
}

/** Group the catalog for rendering the /pricing embed. */
export function groupedCatalog() {
  const order = ['Trending', 'Creation', 'Systems', 'Experiences', 'Other'];
  const groups = new Map(order.map((g) => [g, []]));
  for (const type of COMMISSION_TYPES) {
    if (!groups.has(type.group)) groups.set(type.group, []);
    groups.get(type.group).push(type);
  }
  return [...groups.entries()].filter(([, items]) => items.length > 0);
}

export { fmt as formatPrice };
