const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

module.exports = {
    data: {
        name: 'removereward',
        description: 'Removes a level role reward, or lists all current rewards.',
        usage: '[,removereward <level | all>]',
        adminOnly: true
    },
    /**
     * Executes the removereward command.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        // Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ **Permission Denied.** You must be an **Administrator** to use this command.');
        }

        const config = await getGuildConfig(message.guild.id);
        const rewards = config.roleRewards;
        const rewardArgument = args[0] ? args[0].toLowerCase() : null;

        if (rewards.length === 0) {
            return message.reply(`ℹ️ There are no level role rewards configured for this server. Use \`${config.prefix}addreward <level> <@role>\` to set one up.`);
        }

        // --- Option 1: List Rewards ---
        if (!rewardArgument) {
            const rewardList = rewards
                .sort((a, b) => a.level - b.level)
                .map(r => {
                    const role = message.guild.roles.cache.get(r.roleId);
                    const roleName = role ? role.name : `[Unknown Role ID: ${r.roleId}]`;
                    return `**Level ${r.level}**: ${roleName}`;
                })
                .join('\n');

            const listEmbed = new EmbedBuilder()
                .setColor(config.embedColor)
                .setTitle('🎁 Current Level Role Rewards')
                .setDescription(rewardList)
                .setFooter({ text: `To remove a reward, use ${config.prefix}removereward <level>` });

            return message.reply({ embeds: [listEmbed] });
        }
        
        // --- Option 2: Remove ALL Rewards ---
        if (rewardArgument === 'all') {
            const confirmationMessage = await message.reply(`⚠️ **CONFIRMATION REQUIRED:** Are you sure you want to remove **ALL ${rewards.length}** level role rewards? Reply with \`confirm\` within 15 seconds.`);
            
            const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
            
            try {
                await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
                await confirmationMessage.delete();
                
                config.roleRewards = [];
                await config.save();

                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('🔥 All Rewards Removed')
                        .setDescription(`All **${rewards.length}** level role rewards have been cleared from the configuration.`)
                    ]
                });
            } catch (error) {
                if (error.size === 0) await confirmationMessage.edit({ content: `✅ **Removal Cancelled.**` });
                return;
            }
        }

        // --- Option 3: Remove Specific Reward by Level ---
        const level = parseInt(rewardArgument);

        if (isNaN(level) || level <= 0) {
            return message.reply(`❌ Invalid argument. Please specify a valid level number or \`all\`.`);
        }
        
        const rewardIndex = rewards.findIndex(r => r.level === level);

        if (rewardIndex === -1) {
            return message.reply(`❌ No role reward found for **Level ${level}**.`);
        }

        try {
            const removedReward = config.roleRewards.splice(rewardIndex, 1)[0];
            const removedRole = message.guild.roles.cache.get(removedReward.roleId);

            await config.save();

            const roleName = removedRole ? removedRole.name : `[Role ID: ${removedReward.roleId}]`;

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#f1c40f')
                    .setTitle('🗑️ Role Reward Removed')
                    .setDescription(`The reward for **Level ${level}** (Role: **${roleName}**) has been removed.`)
                ]
            });

        } catch (error) {
            console.error(`Error removing role reward for guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to remove the role reward from the database.');
        }
    },
};