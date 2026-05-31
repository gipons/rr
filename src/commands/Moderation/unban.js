import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderationService.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName("unexterminate")
        .setDescription("Restore a user that was exterminated from the server")
        .addUserOption(option =>
            option
                .setName("target")
                .setDescription("The user to restore (can be ID or mention)")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Reason for the restoration")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Unexterminate interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'unexterminate'
            });
            return;
        }

        try {
                const targetUser = interaction.options.getUser("target");
                const reason = interaction.options.getString("reason") || "No reason provided";

                
                const result = await ModerationService.unbanUser({
                    guild: interaction.guild,
                    user: targetUser,
                    moderator: interaction.member,
                    reason
                });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            "✅ User Restored",
                            `Successfully restored **${targetUser.tag}** from extermination.\n\n**Reason:** ${reason}\n**Case ID:** #${result.caseId}`
                        )
                    ]
                });
        } catch (error) {
            logger.error('Unexterminate command error:', error);
            await handleInteractionError(interaction, error, { subtype: 'unexterminate_failed' });
        }
    }
};

