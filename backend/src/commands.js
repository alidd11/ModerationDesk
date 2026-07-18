import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

const reason = option => option.addStringOption(input => input.setName('reason').setDescription('Reason for the action').setMaxLength(500));
const user = option => option.addUserOption(input => input.setName('user').setDescription('Target member').setRequired(true));
const duration = option => option.addStringOption(input => input.setName('duration').setDescription('Examples: 30m, 2h, 7d').setRequired(true).setMaxLength(12));
const textChannel = input => input.addChannelOption(option => option.setName('channel').setDescription('Text channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement));

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName('mod').setDescription('Moderate members and maintain staff records')
    .addSubcommand(command => reason(user(command.setName('warn').setDescription('Warn a member'))))
    .addSubcommand(command => user(command.setName('warnings').setDescription('View active warnings')))
    .addSubcommand(command => user(command.setName('clear-warning').setDescription('Clear one warning or all warnings')).addStringOption(option => option.setName('warning-id').setDescription('Leave blank to clear every active warning')))
    .addSubcommand(command => reason(user(command.setName('kick').setDescription('Kick a member'))))
    .addSubcommand(command => reason(user(command.setName('ban').setDescription('Ban a member')).addIntegerOption(option => option.setName('delete-days').setDescription('Delete 0-7 days of messages').setMinValue(0).setMaxValue(7))))
    .addSubcommand(command => reason(duration(user(command.setName('tempban').setDescription('Temporarily ban a member')))))
    .addSubcommand(command => reason(user(command.setName('softban').setDescription('Ban and immediately unban a member'))))
    .addSubcommand(command => reason(command.setName('unban').setDescription('Unban a user by ID').addStringOption(option => option.setName('user-id').setDescription('Discord user ID').setRequired(true))))
    .addSubcommand(command => reason(duration(user(command.setName('timeout').setDescription('Temporarily prevent a member from communicating')))))
    .addSubcommand(command => reason(user(command.setName('untimeout').setDescription('Remove a member timeout'))))
    .addSubcommand(command => reason(user(command.setName('nickname').setDescription('Set or reset a nickname')).addStringOption(option => option.setName('nickname').setDescription('Leave blank to reset').setMaxLength(32))))
    .addSubcommand(command => user(command.setName('note').setDescription('Add a private moderator note').addStringOption(option => option.setName('note').setDescription('Private note').setRequired(true).setMaxLength(1_000))))
    .addSubcommand(command => user(command.setName('notes').setDescription('View private moderator notes')))
    .setDefaultMemberPermissions(null),

  new SlashCommandBuilder()
    .setName('case').setDescription('Review and manage moderation cases')
    .addSubcommand(command => command.setName('view').setDescription('View a case').addIntegerOption(option => option.setName('id').setDescription('Case number').setRequired(true).setMinValue(1)))
    .addSubcommand(command => user(command.setName('history').setDescription('View recent cases for a member')))
    .addSubcommand(command => command.setName('reason').setDescription('Update a case reason').addIntegerOption(option => option.setName('id').setDescription('Case number').setRequired(true).setMinValue(1)).addStringOption(option => option.setName('reason').setDescription('New reason').setRequired(true).setMaxLength(500)))
    .addSubcommand(command => command.setName('void').setDescription('Void a case without deleting its audit trail').addIntegerOption(option => option.setName('id').setDescription('Case number').setRequired(true).setMinValue(1)).addStringOption(option => option.setName('reason').setDescription('Why the case is being voided').setRequired(true).setMaxLength(500)))
    .setDefaultMemberPermissions(null),

  new SlashCommandBuilder()
    .setName('channel').setDescription('Moderate the current channel')
    .addSubcommand(command => command.setName('purge').setDescription('Bulk-delete recent messages').addIntegerOption(option => option.setName('count').setDescription('Number of messages, 1-100').setRequired(true).setMinValue(1).setMaxValue(100)).addUserOption(option => option.setName('user').setDescription('Only delete messages from this user')).addStringOption(option => option.setName('contains').setDescription('Only delete messages containing this text').setMaxLength(100)).addBooleanOption(option => option.setName('bots').setDescription('Only delete bot messages')))
    .addSubcommand(command => command.setName('lock').setDescription('Prevent @everyone from sending messages').addStringOption(option => option.setName('reason').setDescription('Reason').setMaxLength(500)))
    .addSubcommand(command => command.setName('unlock').setDescription('Remove the ModerationDesk channel lock').addStringOption(option => option.setName('reason').setDescription('Reason').setMaxLength(500)))
    .addSubcommand(command => command.setName('slowmode').setDescription('Set channel slowmode').addIntegerOption(option => option.setName('seconds').setDescription('0-21600 seconds').setRequired(true).setMinValue(0).setMaxValue(21600)))
    .addSubcommand(command => command.setName('nuke').setDescription('Clone and replace the channel').addStringOption(option => option.setName('confirmation').setDescription('Type NUKE to confirm').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('security').setDescription('Configure AutoMod, anti-raid, anti-nuke and lockdown')
    .addSubcommand(command => command.setName('status').setDescription('Show the current security posture'))
    .addSubcommand(command => command.setName('automod').setDescription('Enable or disable AutoMod').addBooleanOption(option => option.setName('enabled').setDescription('Enabled').setRequired(true)))
    .addSubcommand(command => command.setName('automod-action').setDescription('Choose the action used by AutoMod').addStringOption(option => option.setName('action').setDescription('Action').setRequired(true).addChoices({ name: 'Delete only', value: 'delete' }, { name: 'Delete and warn', value: 'warn' }, { name: 'Delete and timeout', value: 'timeout' })).addIntegerOption(option => option.setName('timeout-seconds').setDescription('Timeout length when action is timeout').setMinValue(10).setMaxValue(2_419_200)))
    .addSubcommand(command => command.setName('blocked-word-add').setDescription('Add a blocked word or phrase').addStringOption(option => option.setName('word').setDescription('Word or phrase').setRequired(true).setMaxLength(100)))
    .addSubcommand(command => command.setName('blocked-word-remove').setDescription('Remove a blocked word or phrase').addStringOption(option => option.setName('word').setDescription('Word or phrase').setRequired(true).setMaxLength(100)))
    .addSubcommand(command => command.setName('blocked-word-list').setDescription('List blocked words and phrases'))
    .addSubcommand(command => command.setName('allow-domain-add').setDescription('Allow a domain through link filtering').addStringOption(option => option.setName('domain').setDescription('Example: example.com').setRequired(true).setMaxLength(100)))
    .addSubcommand(command => command.setName('allow-domain-remove').setDescription('Remove an allowed domain').addStringOption(option => option.setName('domain').setDescription('Domain').setRequired(true).setMaxLength(100)))
    .addSubcommand(command => command.setName('anti-raid').setDescription('Configure join-rate protection').addBooleanOption(option => option.setName('enabled').setDescription('Enabled').setRequired(true)).addIntegerOption(option => option.setName('join-threshold').setDescription('Joins during the window').setMinValue(3).setMaxValue(100)).addIntegerOption(option => option.setName('window-seconds').setDescription('Detection window').setMinValue(5).setMaxValue(300)).addIntegerOption(option => option.setName('auto-unlock-minutes').setDescription('Automatic unlock delay').setMinValue(1).setMaxValue(1440)))
    .addSubcommand(command => command.setName('anti-nuke').setDescription('Configure destructive-action protection').addBooleanOption(option => option.setName('enabled').setDescription('Enabled').setRequired(true)).addStringOption(option => option.setName('action').setDescription('Enforcement action').addChoices({ name: 'Strip dangerous roles', value: 'strip_roles' }, { name: 'Ban executor', value: 'ban' })))
    .addSubcommand(command => command.setName('trust-user').setDescription('Add or remove an anti-nuke trusted user').addUserOption(option => option.setName('user').setDescription('Trusted user').setRequired(true)).addBooleanOption(option => option.setName('trusted').setDescription('Whether the user is trusted').setRequired(true)))
    .addSubcommand(command => command.setName('trust-role').setDescription('Add or remove an anti-nuke trusted role').addRoleOption(option => option.setName('role').setDescription('Trusted role').setRequired(true)).addBooleanOption(option => option.setName('trusted').setDescription('Whether the role is trusted').setRequired(true)))
    .addSubcommand(command => command.setName('exempt-role').setDescription('Add or remove a role from AutoMod exemptions').addRoleOption(option => option.setName('role').setDescription('Exempt role').setRequired(true)).addBooleanOption(option => option.setName('exempt').setDescription('Whether the role is exempt').setRequired(true)))
    .addSubcommand(command => command.setName('exempt-channel').setDescription('Add or remove a channel from AutoMod exemptions').addChannelOption(option => option.setName('channel').setDescription('Exempt channel').setRequired(true)).addBooleanOption(option => option.setName('exempt').setDescription('Whether the channel is exempt').setRequired(true)))
    .addSubcommand(command => command.setName('lockdown').setDescription('Lock all text channels').addStringOption(option => option.setName('reason').setDescription('Reason').setMaxLength(500)))
    .addSubcommand(command => command.setName('unlockdown').setDescription('End a server lockdown').addStringOption(option => option.setName('reason').setDescription('Reason').setMaxLength(500)))
    .setDefaultMemberPermissions(null),

  new SlashCommandBuilder()
    .setName('roles').setDescription('Manage member roles and automated role systems')
    .addSubcommand(command => user(command.setName('add').setDescription('Add a role to a member').addRoleOption(option => option.setName('role').setDescription('Role').setRequired(true))))
    .addSubcommand(command => user(command.setName('remove').setDescription('Remove a role from a member').addRoleOption(option => option.setName('role').setDescription('Role').setRequired(true))))
    .addSubcommand(command => command.setName('autorole-add').setDescription('Assign a role to new members').addRoleOption(option => option.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(command => command.setName('autorole-remove').setDescription('Remove a role from autoroles').addRoleOption(option => option.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(command => command.setName('sticky-toggle').setDescription('Enable or disable sticky role restoration').addBooleanOption(option => option.setName('enabled').setDescription('Enabled').setRequired(true)))
    .addSubcommand(command => command.setName('sticky-role-add').setDescription('Add a role to sticky role restoration').addRoleOption(option => option.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(command => command.setName('sticky-role-remove').setDescription('Remove a sticky role').addRoleOption(option => option.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(command => command.setName('list').setDescription('Show configured role automation'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName('community').setDescription('Announcements, polls, embeds, giveaways and starboard')
    .addSubcommand(command => textChannel(command.setName('announce').setDescription('Post an announcement').addStringOption(option => option.setName('message').setDescription('Announcement').setRequired(true).setMaxLength(4_000))))
    .addSubcommand(command => command.setName('poll').setDescription('Create a reaction poll').addStringOption(option => option.setName('question').setDescription('Question').setRequired(true).setMaxLength(256)).addStringOption(option => option.setName('options').setDescription('Separate 2-10 options with |').setRequired(true).setMaxLength(1_000)))
    .addSubcommand(command => duration(command.setName('giveaway').setDescription('Start a reaction giveaway').addStringOption(option => option.setName('prize').setDescription('Prize').setRequired(true).setMaxLength(500))).addIntegerOption(option => option.setName('winners').setDescription('Winner count').setMinValue(1).setMaxValue(20)))
    .addSubcommand(command => command.setName('giveaway-reroll').setDescription('Reroll a completed giveaway').addStringOption(option => option.setName('message-id').setDescription('Giveaway message ID').setRequired(true)).addIntegerOption(option => option.setName('winners').setDescription('Winner count').setMinValue(1).setMaxValue(20)))
    .addSubcommand(command => command.setName('embed').setDescription('Send a custom embed').addStringOption(option => option.setName('title').setDescription('Title').setRequired(true).setMaxLength(256)).addStringOption(option => option.setName('description').setDescription('Description').setRequired(true).setMaxLength(4_000)).addStringOption(option => option.setName('colour').setDescription('Hex colour, e.g. #5865F2')))
    .addSubcommand(command => command.setName('starboard').setDescription('Configure reaction starboard').addBooleanOption(option => option.setName('enabled').setDescription('Enabled').setRequired(true)).addChannelOption(option => option.setName('channel').setDescription('Starboard channel').addChannelTypes(ChannelType.GuildText)).addIntegerOption(option => option.setName('threshold').setDescription('Required reactions').setMinValue(2).setMaxValue(100)).addStringOption(option => option.setName('emoji').setDescription('Unicode emoji, default ⭐').setMaxLength(32)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('suggest').setDescription('Submit a server suggestion')
    .addStringOption(option => option.setName('suggestion').setDescription('Your suggestion').setRequired(true).setMaxLength(4_000)),

  new SlashCommandBuilder()
    .setName('utility').setDescription('Server and member information')
    .addSubcommand(command => command.setName('ping').setDescription('Show bot and API latency'))
    .addSubcommand(command => command.setName('serverinfo').setDescription('Show server information'))
    .addSubcommand(command => command.setName('userinfo').setDescription('Show member information').addUserOption(option => option.setName('user').setDescription('Member')))
    .addSubcommand(command => command.setName('avatar').setDescription('Show a user avatar').addUserOption(option => option.setName('user').setDescription('User')))
    .addSubcommand(command => command.setName('roleinfo').setDescription('Show role information').addRoleOption(option => option.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(command => command.setName('afk').setDescription('Set your AFK status').addStringOption(option => option.setName('reason').setDescription('Reason').setMaxLength(200)))
    .addSubcommand(command => command.setName('diagnose').setDescription('Check ModerationDesk permissions and configuration'))
    .addSubcommand(command => command.setName('invite').setDescription('Get the ModerationDesk invite link'))
    .addSubcommand(command => command.setName('dashboard').setDescription('Open the ModerationDesk dashboard'))
    .addSubcommand(command => command.setName('privacy').setDescription('View privacy and data controls')),

  new SlashCommandBuilder()
    .setName('verify').setDescription('Configure member verification')
    .addSubcommand(command => command.setName('setup').setDescription('Configure verification').addChannelOption(option => option.setName('channel').setDescription('Verification channel').setRequired(true).addChannelTypes(ChannelType.GuildText)).addRoleOption(option => option.setName('verified-role').setDescription('Role granted after verification').setRequired(true)).addStringOption(option => option.setName('mode').setDescription('Verification mode').setRequired(true).addChoices({ name: 'Button', value: 'button' }, { name: 'Discord OAuth', value: 'oauth' })).addRoleOption(option => option.setName('unverified-role').setDescription('Role removed after verification')).addStringOption(option => option.setName('message').setDescription('Panel message').setMaxLength(2_000)))
    .addSubcommand(command => command.setName('disable').setDescription('Disable verification'))
    .addSubcommand(command => command.setName('refresh').setDescription('Repost the verification panel'))
    .addSubcommand(command => command.setName('status').setDescription('Show verification configuration'))
    .setDefaultMemberPermissions(null),

  new SlashCommandBuilder()
    .setName('migration').setDescription('Consent-based server migration and role restoration')
    .addSubcommand(command => command.setName('setup').setDescription('Choose the source server').addStringOption(option => option.setName('source-server-id').setDescription('Source server ID').setRequired(true)))
    .addSubcommand(command => command.setName('role-map').setDescription('Map a source role to a destination role').addStringOption(option => option.setName('source-role-id').setDescription('Source role ID').setRequired(true)).addRoleOption(option => option.setName('destination-role').setDescription('Destination role').setRequired(true)))
    .addSubcommand(command => command.setName('role-unmap').setDescription('Remove a role mapping').addStringOption(option => option.setName('source-role-id').setDescription('Source role ID').setRequired(true)))
    .addSubcommand(command => command.setName('start').setDescription('Start a migration campaign').addChannelOption(option => option.setName('channel').setDescription('Destination verification channel').setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(command => command.setName('stop').setDescription('Stop the migration campaign'))
    .addSubcommand(command => command.setName('status').setDescription('Show migration status and analytics'))
    .setDefaultMemberPermissions(null),

  new SlashCommandBuilder()
    .setName('config').setDescription('Configure server-wide ModerationDesk settings')
    .addSubcommand(command => command.setName('logs').setDescription('Set a log channel').addStringOption(option => option.setName('type').setDescription('Log category').setRequired(true).addChoices({ name: 'All logs', value: 'all' }, { name: 'Member logs', value: 'member' }, { name: 'Moderation logs', value: 'moderation' }, { name: 'Message logs', value: 'messages' }, { name: 'Server logs', value: 'server' }, { name: 'Security logs', value: 'security' }, { name: 'Appeals', value: 'appeals' })).addChannelOption(option => option.setName('channel').setDescription('Log channel').setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(command => command.setName('welcome').setDescription('Configure welcome messages').addBooleanOption(option => option.setName('enabled').setDescription('Enabled').setRequired(true)).addChannelOption(option => option.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText)).addStringOption(option => option.setName('message').setDescription('Variables: {user}, {username}, {server}, {count}').setMaxLength(2_000)))
    .addSubcommand(command => command.setName('goodbye').setDescription('Configure goodbye messages').addBooleanOption(option => option.setName('enabled').setDescription('Enabled').setRequired(true)).addChannelOption(option => option.setName('channel').setDescription('Goodbye channel').addChannelTypes(ChannelType.GuildText)).addStringOption(option => option.setName('message').setDescription('Variables: {user}, {username}, {server}, {count}').setMaxLength(2_000)))
    .addSubcommand(command => command.setName('suggestions').setDescription('Configure public suggestions').addBooleanOption(option => option.setName('enabled').setDescription('Enabled').setRequired(true)).addChannelOption(option => option.setName('channel').setDescription('Suggestions channel').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(command => command.setName('appeals').setDescription('Configure the public OAuth appeal form').addBooleanOption(option => option.setName('enabled').setDescription('Enabled').setRequired(true)).addChannelOption(option => option.setName('channel').setDescription('Staff appeals channel').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(command => command.setName('staff-role').setDescription('Add or remove a moderation staff role').addRoleOption(option => option.setName('role').setDescription('Staff role').setRequired(true)).addBooleanOption(option => option.setName('enabled').setDescription('Whether the role is authorised').setRequired(true)))
    .addSubcommand(command => command.setName('admin-role').setDescription('Add or remove a ModerationDesk admin role').addRoleOption(option => option.setName('role').setDescription('Admin role').setRequired(true)).addBooleanOption(option => option.setName('enabled').setDescription('Whether the role is authorised').setRequired(true)))
    .addSubcommand(command => command.setName('show').setDescription('Show current configuration'))
    .addSubcommand(command => command.setName('export').setDescription('Export this server’s ModerationDesk data'))
    .setDefaultMemberPermissions(null),

  new SlashCommandBuilder()
    .setName('appeal').setDescription('Review moderation appeals')
    .addSubcommand(command => command.setName('list').setDescription('List recent appeals').addStringOption(option => option.setName('status').setDescription('Status').addChoices({ name: 'Open', value: 'open' }, { name: 'Accepted', value: 'accepted' }, { name: 'Rejected', value: 'rejected' })))
    .addSubcommand(command => command.setName('view').setDescription('View an appeal').addStringOption(option => option.setName('id').setDescription('Appeal ID').setRequired(true)))
    .addSubcommand(command => command.setName('resolve').setDescription('Resolve an appeal').addStringOption(option => option.setName('id').setDescription('Appeal ID').setRequired(true)).addStringOption(option => option.setName('decision').setDescription('Decision').setRequired(true).addChoices({ name: 'Accept', value: 'accepted' }, { name: 'Reject', value: 'rejected' })).addStringOption(option => option.setName('response').setDescription('Staff response').setRequired(true).setMaxLength(2_000)))
    .setDefaultMemberPermissions(null),

  new SlashCommandBuilder()
    .setName('premium').setDescription('ModerationDesk plans and billing')
    .addSubcommand(command => command.setName('status').setDescription('Show the current plan'))
    .addSubcommand(command => command.setName('features').setDescription('Compare plan features'))
    .addSubcommand(command => command.setName('subscribe').setDescription('Open subscription options'))
];

export const commands = commandBuilders.map(command => command.toJSON());
