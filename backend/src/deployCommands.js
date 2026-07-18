import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';
import { config } from './config.js';

if (!config.token || !config.clientId) {
  console.error('DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.token);
const route = config.devGuildId ? Routes.applicationGuildCommands(config.clientId, config.devGuildId) : Routes.applicationCommands(config.clientId);
console.log(`Registering ${commands.length} commands ${config.devGuildId ? `in development guild ${config.devGuildId}` : 'globally'}...`);
await rest.put(route, { body: commands });
console.log('ModerationDesk commands registered successfully.');
