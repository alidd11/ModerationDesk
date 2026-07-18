import { PermissionFlagsBits } from 'discord.js';
import { addWarning, getGuildConfig, incrementStat, recordCase } from './store.js';
import { hasPlan } from './premium.js';
import { sendLog, WARNING_COLOUR } from './services/logService.js';
import { truncate } from './utils.js';

const activity = new Map();
const urlRegex = /https?:\/\/[^\s<]+/gi;
const inviteRegex = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-z0-9-]+)/ig;

function exempt(message, cfg) {
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  if (cfg.exemptChannelIds.includes(message.channelId)) return true;
  return cfg.exemptRoleIds.some(roleId => message.member?.roles.cache.has(roleId));
}

function domainAllowed(hostname, allowed) {
  const clean = hostname.toLowerCase().replace(/^www\./, '');
  return allowed.some(domain => clean === domain || clean.endsWith(`.${domain}`));
}

function inspectMessage(message, cfg) {
  const content = message.content || '';
  const lower = content.toLowerCase();
  const inviteMatches = [...content.matchAll(inviteRegex)];
  if (cfg.antiInvites && inviteMatches.some(match => !cfg.allowedInviteCodes.includes(match[1].toLowerCase()))) return 'Unauthorised Discord invite';

  if (cfg.antiLinks) {
    const links = content.match(urlRegex) || [];
    for (const link of links) {
      try {
        if (!domainAllowed(new URL(link).hostname, cfg.allowedDomains)) return 'Unauthorised link';
      } catch {}
    }
  }

  const blocked = cfg.blockedWords.find(word => lower.includes(word));
  if (blocked) return 'Blocked word or phrase';
  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (cfg.antiMassMentions && mentionCount >= cfg.maxMentions) return 'Mass mentions';

  if (cfg.antiCaps && content.length >= cfg.minCapsLength) {
    const letters = content.replace(/[^a-z]/gi, '');
    const capitals = (letters.match(/[A-Z]/g) || []).length;
    if (letters.length && capitals / letters.length * 100 >= cfg.maxCapsPercent) return 'Excessive capital letters';
  }

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const state = activity.get(key) || [];
  const recent = state.filter(row => now - row.time <= cfg.spamWindowSeconds * 1_000);
  recent.push({ time: now, content: lower.trim() });
  activity.set(key, recent.slice(-Math.max(cfg.spamMaxMessages, cfg.duplicateMax) * 2));
  if (cfg.antiSpam && recent.length >= cfg.spamMaxMessages) return 'Message spam';
  if (cfg.antiDuplicates && lower.trim() && recent.filter(row => row.content === lower.trim()).length >= cfg.duplicateMax) return 'Repeated messages';
  return '';
}

export function attachAutomod(client) {
  const cleanup = setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [key, rows] of activity) {
      const recent = rows.filter(row => row.time >= cutoff);
      if (recent.length) activity.set(key, recent);
      else activity.delete(key);
    }
  }, 300_000);
  cleanup.unref();

  client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot || !message.content) return;
    const cfg = getGuildConfig(message.guild.id).automod;
    if (!cfg.enabled || exempt(message, cfg)) return;
    const reason = inspectMessage(message, cfg);
    if (!reason) return;

    await message.delete().catch(() => {});
    const action = cfg.action === 'delete' || !hasPlan(message.guild.id, 'pro') ? 'delete' : cfg.action;
    const row = recordCase({ guildId: message.guild.id, userId: message.author.id, moderatorId: client.user.id, action: `automod-${action}`, reason, metadata: { channelId: message.channelId } });
    incrementStat(message.guild.id, 'automodActions');

    if (action === 'warn') addWarning({ guildId: message.guild.id, userId: message.author.id, moderatorId: client.user.id, reason, caseId: row.id });
    if (action === 'timeout' && message.member?.moderatable) await message.member.timeout(Math.min(cfg.timeoutSeconds * 1_000, 2_419_200_000), `ModerationDesk AutoMod: ${reason}`).catch(() => {});

    await message.author.send(`A message you sent in **${message.guild.name}** was removed by AutoMod. Reason: **${reason}**. Case #${row.id}.`).catch(() => {});
    await sendLog(message.guild, 'security', {
      title: `AutoMod: ${reason}`,
      colour: WARNING_COLOUR,
      fields: [
        { name: 'User', value: `${message.author.tag} (${message.author.id})` },
        { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
        { name: 'Action', value: action, inline: true },
        { name: 'Content', value: truncate(message.content, 1_000) }
      ]
    });
  });
}
