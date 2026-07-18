import crypto from 'node:crypto';

const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

export function parseDuration(input, { min = 1_000, max = 2_419_200_000 } = {}) {
  const match = /^\s*(\d+)\s*([smhdw])\s*$/i.exec(String(input || ''));
  if (!match) return 0;
  const value = Number(match[1]) * units[match[2].toLowerCase()];
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : 0;
}

export function formatDuration(ms) {
  for (const [unit, size] of [['w', units.w], ['d', units.d], ['h', units.h], ['m', units.m], ['s', units.s]]) {
    if (ms >= size && ms % size === 0) return `${ms / size}${unit}`;
  }
  return `${Math.ceil(ms / 1_000)}s`;
}

export function truncate(value, max = 1_000) {
  const text = String(value ?? '');
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function constantTimeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function discordTimestamp(value = Date.now(), style = 'F') {
  const ms = value instanceof Date ? value.getTime() : Number(value);
  return `<t:${Math.floor(ms / 1_000)}:${style}>`;
}

export async function respond(interaction, payload) {
  const body = typeof payload === 'string' ? { content: payload } : payload;
  if (interaction.deferred) return interaction.editReply(body);
  if (interaction.replied) return interaction.followUp(body);
  return interaction.reply(body);
}

export function normaliseWords(values) {
  return [...new Set((values || []).map(value => String(value).trim().toLowerCase()).filter(Boolean))];
}

export function safeUrlDomain(raw) {
  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isSnowflake(value) {
  return /^\d{17,20}$/.test(String(value || ''));
}

export function clamp(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
