import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../utils/errorHandler.js';

export const data = new SlashCommandBuilder()
  .setName('spamping')
  .setDescription('Admin only: Spam ping a message to the channel')
  .addStringOption(option =>
    option
      .setName('message')
      .setDescription('The message to spam ping')
      .setRequired(true)
      .setMaxLength(100)
  )
  .addIntegerOption(option =>
    option
      .setName('count')
      .setDescription('How many times to spam (1-50)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(50)
  )
  .addIntegerOption(option =>
    option
      .setName('delay')
      .setDescription('Delay in milliseconds between pings (100-5000)')
      .setRequired(false)
      .setMinValue(100)
      .setMaxValue(5000)
  );

export async function execute(interaction) {
  try {
    // Check if user is admin
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('❌ Permission Denied')
        .setDescription('You need **Administrator** permissions to use this command.');
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const message = interaction.options.getString('message');
    const count = interaction.options.getInteger('count') || 3;
    const delay = interaction.options.getInteger('delay') || 500;

    // Defer the reply since this will take time
    await interaction.deferReply({ ephemeral: true });

    const confirmEmbed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('🔔 Spam Ping Started')
      .setDescription(`Spamming **${count}** pings with **${delay}ms** delay...`)
      .addFields(
        { name: 'Message', value: message, inline: false },
        { name: 'Count', value: count.toString(), inline: true },
        { name: 'Delay', value: `${delay}ms`, inline: true }
      )
      .setTimestamp();

    // Send confirmation message
    await interaction.editReply({ embeds: [confirmEmbed] });

    // Execute spam ping
    const channel = interaction.channel;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < count; i++) {
      try {
        await channel.send(message);
        successCount++;
        
        // Add delay between messages (except on last iteration)
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        logger.error(`Failed to send spam ping message ${i + 1}:`, error);
        failureCount++;
      }
    }

    // Send completion report
    const resultEmbed = new EmbedBuilder()
      .setColor(failureCount === 0 ? '#2ecc71' : '#f39c12')
      .setTitle('✅ Spam Ping Complete')
      .setDescription(`Successfully sent spam pings to <#${channel.id}>`)
      .addFields(
        { name: 'Successful', value: `${successCount}/${count}`, inline: true },
        { name: 'Failed', value: failureCount.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.followUp({ embeds: [resultEmbed], ephemeral: true });

    logger.info(`Spam ping executed by ${interaction.user.username}: ${successCount} messages sent in ${channel.name}`);

  } catch (error) {
    logger.error('Error executing spam-ping command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('❌ Error')
      .setDescription('Failed to execute spam ping command.');

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}
