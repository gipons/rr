import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderationService.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
export default {
    data: new SlashCommandBuilder()
        .setName("disintegrate")
        .setDescription("Disintegrate a user from the server")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("The user to disintegrate")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Reason for the disintegration"),
        )
.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        try {
            const user = interaction.options.getUser("target");
            const reason = interaction.options.getString("reason") || "No reason provided";

            if (user.id === interaction.user.id) {
                throw new Error("You cannot disintegrate yourself.");
            }
            if (user.id === client.user.id) {
                throw new Error("You cannot disintegrate the bot.");
            }

            
            const result = await ModerationService.banUser({
                guild: interaction.guild,
                user,
                moderator: interaction.member,
                reason
            });

            await InteractionHelper.universalReply(interaction, {
                embeds: [
                    successEmbed(
                        `💥 **Disintegrated** ${user.tag}`,
                        `**Reason:** ${reason}\n**Case ID:** #${result.caseId}`,
                    ),
                ],
            });

            // Send disintegration message with funny webhook message
            await interaction.channel.send({
                content: ` **nigga got disintegrated** \n${user.username} got disintegrated!\n\nhttps://cdn.discordapp.com/attachments/1273780603707199618/1274439574940291124/lowquality1723920463125.gif?ex=6a3ad4d8&is=6a398358&hm=b5ae9dcb1765af0a9a3b2e1985704e2c315805c700011b3e04293842a54910de&`,
            });
        } catch (error) {
            logger.error('Disintegrate command error:', error);
            await handleInteractionError(interaction, error, { subtype: 'disintegrate_failed' });
        }
    },
};
