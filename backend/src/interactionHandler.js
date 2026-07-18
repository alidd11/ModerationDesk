import { logger } from './logger.js';
import { respond } from './utils.js';
import { isGuildAdmin, isStaff } from './permissions.js';
import { handleAppealCommand } from './handlers/appealCommands.js';
import { handleCaseCommand } from './handlers/caseCommands.js';
import { handleChannelCommand } from './handlers/channelCommands.js';
import { handleCommunityCommand, handleSuggestionCommand } from './handlers/communityCommands.js';
import { handleConfigCommand } from './handlers/configCommands.js';
import { handleModerationCommand } from './handlers/moderationCommands.js';
import { handlePremiumCommand } from './handlers/premiumCommands.js';
import { handleRoleCommand } from './handlers/roleCommands.js';
import { handleSecurityCommand } from './handlers/securityCommands.js';
import { handleUtilityCommand } from './handlers/utilityCommands.js';
import { handleVerificationCommand } from './handlers/verificationCommands.js';
import { handleMigrationCommand } from './handlers/migrationCommands.js';

const staffCommands = new Set(['mod', 'case', 'appeal']);
const adminCommands = new Set(['security', 'verify', 'migration', 'config']);

export function attachInteractionHandler(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || !interaction.guild) return;
    try {
      if (staffCommands.has(interaction.commandName) && !isStaff(interaction.member)) {
        return interaction.reply({ content: 'You are not authorised to use ModerationDesk staff commands.', ephemeral: true });
      }
      if (adminCommands.has(interaction.commandName) && !isGuildAdmin(interaction.member)) {
        return interaction.reply({ content: 'You are not authorised to manage ModerationDesk for this server.', ephemeral: true });
      }

      const handlers = {
        mod: handleModerationCommand,
        case: handleCaseCommand,
        channel: handleChannelCommand,
        security: handleSecurityCommand,
        roles: handleRoleCommand,
        community: handleCommunityCommand,
        suggest: handleSuggestionCommand,
        utility: handleUtilityCommand,
        verify: handleVerificationCommand,
        migration: handleMigrationCommand,
        config: handleConfigCommand,
        appeal: handleAppealCommand,
        premium: handlePremiumCommand
      };
      const handler = handlers[interaction.commandName];
      if (handler) await handler(interaction);
    } catch (error) {
      logger.error('Command failed', { command: interaction.commandName, guildId: interaction.guildId, userId: interaction.user.id, error: error.stack || error.message });
      await respond(interaction, { content: `❌ Command failed: ${error.message || 'Check permissions, role hierarchy and configuration.'}`, ephemeral: true }).catch(() => {});
    }
  });
}
