import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import Database from '../../models/database.js';

const db = new Database();

export default {
    data: new SlashCommandBuilder()
        .setName("autorole")
        .setDescription("Manage automatic role assignment for new members")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("set")
                .setDescription("Set a role to be automatically assigned to new members")
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setDescription("The role to assign automatically")
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Remove a role from automatic assignment"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("View all autoroles set for this server"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("clear")
                .setDescription("Clear all autoroles for this server"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    category: "moderation",

    async execute(interaction, config, client) {
        try {
            const subcommand = interaction.options.getSubcommand();

            // Check if user has admin permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                throw new Error("You need Administrator permission to use this command.");
            }

            // Check if bot has permissions
            const botMember = await interaction.guild.members.fetchMe();
            if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                throw new Error("I need the Manage Roles permission to use this command.");
            }

            switch (subcommand) {
                case "set":
                    await handleSetAutorole(interaction);
                    break;
                case "remove":
                    await handleRemoveAutorole(interaction);
                    break;
                case "list":
                    await handleListAutoroles(interaction);
                    break;
                case "clear":
                    await handleClearAutoroles(interaction);
                    break;
            }
        } catch (error) {
            logger.error('Autorole command error:', error);
            await handleInteractionError(interaction, error, { subtype: 'autorole_failed' });
        }
    },
};

async function handleSetAutorole(interaction) {
    const role = interaction.options.getRole("role");
    const guildId = interaction.guildId;

    // Check if role is manageable
    const botMember = await interaction.guild.members.fetchMe();
    if (!botMember.roles.highest.comparePositionTo(role) > 0) {
        throw new Error("I cannot assign a role that is higher than or equal to my highest role.");
    }

    // Check if role is @everyone
    if (role.id === interaction.guildId) {
        throw new Error("You cannot set @everyone as an autorole.");
    }

    // Save to database (adjust based on your database structure)
    try {
        const query = `
            INSERT INTO autoroles (guild_id, role_id) 
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE role_id = ?
        `;
        await db.execute(query, [guildId, role.id, role.id]);

        await InteractionHelper.universalReply(interaction, {
            embeds: [
                successEmbed(
                    "✅ Autorole Set",
                    `Members joining the server will now automatically receive the ${role} role.`,
                ),
            ],
        });

        logger.info('Autorole set', { guildId, roleId: role.id });
    } catch (error) {
        logger.error('Failed to save autorole to database:', error);
        throw new Error("Failed to save autorole settings.");
    }
}

async function handleRemoveAutorole(interaction) {
    const guildId = interaction.guildId;

    try {
        const query = `DELETE FROM autoroles WHERE guild_id = ?`;
        const result = await db.execute(query, [guildId]);

        if (result.affectedRows === 0) {
            throw new Error("No autoroles are set for this server.");
        }

        await InteractionHelper.universalReply(interaction, {
            embeds: [
                successEmbed(
                    "✅ Autorole Removed",
                    "No roles will be automatically assigned to new members.",
                ),
            ],
        });

        logger.info('Autorole removed', { guildId });
    } catch (error) {
        if (error.message.includes("No autoroles")) {
            await InteractionHelper.universalReply(interaction, {
                embeds: [warningEmbed("⚠️ No Autoroles", "There are no autoroles set for this server.")],
            });
        } else {
            logger.error('Failed to remove autorole:', error);
            throw error;
        }
    }
}

async function handleListAutoroles(interaction) {
    const guildId = interaction.guildId;

    try {
        const query = `SELECT role_id FROM autoroles WHERE guild_id = ?`;
        const result = await db.execute(query, [guildId]);

        if (result.length === 0) {
            await InteractionHelper.universalReply(interaction, {
                embeds: [
                    infoEmbed(
                        "📋 Autoroles",
                        "No autoroles are currently set for this server.\n\nUse `/autorole set` to add one.",
                    ),
                ],
            });
            return;
        }

        let roleList = "";
        for (const row of result) {
            const role = interaction.guild.roles.cache.get(row.role_id);
            if (role) {
                roleList += `• ${role}\n`;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📋 Autoroles")
            .setDescription(roleList || "No valid roles found.")
            .setFooter({ text: `Total: ${result.length}` });

        await InteractionHelper.universalReply(interaction, { embeds: [embed] });

        logger.info('Autoroles listed', { guildId, count: result.length });
    } catch (error) {
        logger.error('Failed to fetch autoroles:', error);
        throw new Error("Failed to fetch autorole settings.");
    }
}

async function handleClearAutoroles(interaction) {
    const guildId = interaction.guildId;

    // Confirm action with button
    const confirmButton = new ButtonBuilder()
        .setCustomId("autorole_confirm_clear")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId("autorole_cancel_clear")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const confirmEmbed = warningEmbed(
        "⚠️ Clear All Autoroles",
        "Are you sure you want to remove all autoroles? This action cannot be undone.",
    );

    const message = await InteractionHelper.universalReply(interaction, {
        embeds: [confirmEmbed],
        components: [row],
        fetchReply: true,
    });

    // Handle button clicks
    const collector = message.createMessageComponentCollector({
        time: 60000,
        filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.customId === "autorole_confirm_clear") {
            try {
                const query = `DELETE FROM autoroles WHERE guild_id = ?`;
                await db.execute(query, [guildId]);

                await buttonInteraction.update({
                    embeds: [
                        successEmbed(
                            "✅ Cleared",
                            "All autoroles have been removed from this server.",
                        ),
                    ],
                    components: [],
                });

                logger.info('All autoroles cleared', { guildId });
            } catch (error) {
                logger.error('Failed to clear autoroles:', error);
                await buttonInteraction.update({
                    embeds: [errorEmbed("Error", "Failed to clear autoroles.")],
                    components: [],
                });
            }
        } else {
            await buttonInteraction.update({
                embeds: [infoEmbed("Cancelled", "Autorole clear operation was cancelled.")],
                components: [],
            });
        }
        collector.stop();
    });

    collector.on("end", async () => {
        if (!collector.endReason || collector.endReason === "time") {
            try {
                await message.edit({ components: [] });
            } catch (error) {
                logger.debug('Could not edit message after timeout:', error);
            }
        }
    });
}
