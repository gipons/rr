import { logger } from './logger.js';

const ALLOWED_ROLE_IDS = [
    '1518678657982267472',
    '1518678662566903899'
];

/**
 * Check if a user has one of the allowed roles
 * @param {Member} member - Discord member object
 * @returns {boolean} - True if user has an allowed role
 */
export function hasAllowedRole(member) {
    if (!member || !member.roles) {
        return false;
    }

    return member.roles.cache.some(role => ALLOWED_ROLE_IDS.includes(role.id));
}

/**
 * Check if user is bot owner (can bypass restrictions)
 * @param {User} user - Discord user object
 * @param {Client} client - Discord client
 * @returns {boolean} - True if user is bot owner
 */
export function isBotOwner(user, client) {
    return user.id === client.config?.bot?.ownerId;
}

/**
 * Validate command access based on roles
 * Returns error embed if access denied, null if access granted
 * @param {Interaction} interaction - Discord interaction
 * @param {Client} client - Discord client
 * @returns {Object|null} - Error embed or null
 */
export function validateCommandAccess(interaction, client) {
    // Allow in DMs (if applicable)
    if (!interaction.guild) {
        return null;
    }

    // Check if bot owner (can always use commands)
    if (isBotOwner(interaction.user, client)) {
        return null;
    }

    // Check if user has allowed role
    if (hasAllowedRole(interaction.member)) {
        return null;
    }

    // Access denied
    logger.debug(`Access denied for user ${interaction.user.id} attempting command ${interaction.commandName}`);
    
    return {
        title: '❌ Access Denied',
        description: `You don't have permission to use this command.\n\nRequired roles:\n${ALLOWED_ROLE_IDS.map((id, i) => `• <@&${id}>`).join('\n')}`,
        color: 0xFF0000
    };
}

/**
 * Get list of allowed roles (for help/info commands)
 * @returns {Array<string>} - Array of role IDs
 */
export function getAllowedRoles() {
    return ALLOWED_ROLE_IDS;
}
