const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/database');

module.exports = {
    data: {
        name: 'addreward',
        description: 'Adds a role reward granted automatically upon reaching a specific level.',
        usage: '[,addreward <level> <@role>]',
        adminOnly: true
    },
    /**
     * Executes the addreward command.
     * @param {Message} message - The Discord message object.
     * @param {string[]} args - Command arguments.
     * @param {Client} client - The Discord client.
     */
    async execute(message, args, client) {
        // Permission check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ **Permission Denied.** You must be an **Administrator** to use this command.');
        }

        const levelArgument = args[0];
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

        if (!levelArgument || !role) {
            return message.reply(`Usage: \`${this.data.usage}\`. Ensure you mention the level *and* the role.`);
        }

        const level = parseInt(levelArgument);

        if (isNaN(level) || level <= 0) {
            return message.reply('❌ Please provide a valid, positive level number for the reward.');
        }

        // Security/Permission check for the role
        if (role.managed || role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply(`❌ I cannot assign the role ${role.toString()} because it is managed or higher than my highest role. Please ensure my role is above the reward role.`);
        }

        try {
            const config = await getGuildConfig(message.guild.id);
            const rewardIndex = config.roleRewards.findIndex(r => r.level === level);

            if (rewardIndex > -1) {
                // If a reward already exists for this level, update it
                const oldRole = message.guild.roles.cache.get(config.roleRewards[rewardIndex].roleId);
                config.roleRewards[rewardIndex].roleId = role.id;
                
                await config.save();
                
                return message.reply({ 
                    embeds: [new EmbedBuilder()
                        .setColor('#f39c12')
                        .setTitle('⚠️ Role Reward Updated')
                        .setDescription(`The reward for **Level ${level}** has been updated from ${oldRole.toString()} to ${role.toString()}.`)
                        .setFooter({ text: 'Existing role holders will be automatically updated on next level change.' })
                    ]
                });
            } else {
                // Add the new reward
                config.roleRewards.push({ level: level, roleId: role.id });
                // Sort the rewards array by level ascending (optional, but clean)
                config.roleRewards.sort((a, b) => a.level - b.level);
                
                await config.save();
                
                return message.reply({ 
                    embeds: [new EmbedBuilder()
                        .setColor(config.embedColor)
                        .setTitle('✅ Role Reward Added')
                        .setDescription(`The role ${role.toString()} will now be granted automatically when a user reaches **Level ${level}**.`)
                        .setFooter({ text: `Ensure this role is below the bot's role in the hierarchy!` })
                    ]
                });
            }

        } catch (error) {
            console.error(`Error adding role reward for guild ${message.guild.id}:`, error);
            message.reply('❌ An error occurred while trying to save the role reward to the database.');
        }
    },
};