import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderationService.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
export default {
    data: new SlashCommandBuilder()
        .setName("exterminate")
        .setDescription("Exterminate a user from the server")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("The user to exterminate")
                .setRequired(true),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Reason for the extermination"),
        )
.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: "moderation",

    async execute(interaction, config, client) {
        try {
            const user = interaction.options.getUser("target");
            const reason = interaction.options.getString("reason") || "No reason provided";

            if (user.id === interaction.user.id) {
                throw new Error("You cannot exterminate yourself.");
            }
            if (user.id === client.user.id) {
                throw new Error("You cannot exterminate the bot.");
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
                        `💀 **Exterminated** ${user.tag}`,
                        `**Reason:** ${reason}\n**Case ID:** #${result.caseId}`,
                    ),
                ],
            });

            // Send extermination message with gif
            await interaction.channel.send({
                content: `🎯 User @${user.username} has been exterminated by Sahur Exterminator.\nhttps://cdn.discordapp.com/attachments/1510663545887658186/1510696613633458206/petpet.gif?ex=6a1dc15c&is=6a1c6fdc&hm=f52f6b12e4858f0ad16d2cbd63191f64e7bc5cea596e775e22f6d6a1dd53f6ec`,
            });
        } catch (error) {
            logger.error('Exterminate command error:', error);
            await handleInteractionError(interaction, error, { subtype: 'exterminate_failed' });
        }
    },
};
