import { REST, Routes } from 'discord.js';
import { commandBuilders } from './commands.js';
import { config } from './config.js';
import { getGuildConfig, updateGuildConfig } from './store.js';

const NAME_PATTERN = /^[a-z0-9_-]{1,32}$/;
const baseCommands = commandBuilders.map(builder => builder.toJSON());

export function commandCatalog() {
  return baseCommands.map(command => ({ key: command.name, name: command.name, description: command.description }));
}

export function sanitiseCommandSettings(value = {}) {
  const names = new Set();
  const overrides = {};
  for (const command of baseCommands) {
    const input = value.overrides?.[command.name] || {};
    const name = String(input.name || command.name).trim().toLowerCase();
    const description = String(input.description || command.description).trim().slice(0, 100);
    const enabled = input.enabled !== false;
    if (!NAME_PATTERN.test(name)) throw new Error(`/${name || command.name} must use lowercase letters, numbers, hyphens or underscores.`);
    if (names.has(name)) throw new Error(`The command name /${name} is used more than once.`);
    names.add(name);
    overrides[command.name] = { name, description, enabled };
  }
  return { overrides, syncedAt: '' };
}

export async function syncGuildCommands(guildId) {
  if (!config.token || !config.clientId) throw new Error('Discord command sync is not configured on the bot.');
  const settings = getGuildConfig(guildId).commandSettings || {};
  const body = baseCommands.flatMap(command => {
    const override = settings.overrides?.[command.name] || {};
    if (override.enabled === false) return [];
    return [{ ...command, name: override.name || command.name, description: override.description || command.description }];
  });
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(config.clientId, String(guildId)), { body });
  return updateGuildConfig(guildId, { commandSettings: { syncedAt: new Date().toISOString() } });
}

export function canonicalCommandName(guildId, commandName) {
  const settings = getGuildConfig(guildId).commandSettings || {};
  return Object.entries(settings.overrides || {}).find(([, value]) => value.enabled !== false && value.name === commandName)?.[0] || commandName;
}
