const { EmbedBuilder } = require('discord.js');
const { getUserLevel } = require('../../utils/database');

module.exports = {
    data: {
        name: 'daily',
        description: 'Claim your daily XP bonus!',
    },
    async execute(message, args) {
        const userLevel = await getUserLevel(message.author.id, message.guild.id);
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours
        const now = new Date();

        if (userLevel.lastDaily && (now - userLevel.lastDaily < cooldown)) {
            const remaining = cooldown - (now - userLevel.lastDaily);
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            return message.reply(`⏳ You've already claimed your daily! Come back in **${hours}h**.`);
        }

        const dailyXp = Math.floor(Math.random() * 201) + 100; // 100-300 XP
        userLevel.xp += dailyXp;
        userLevel.lastDaily = now;
        await userLevel.save();

        const embed = new EmbedBuilder()
            .setTitle('🎁 Daily Bonus')
            .setDescription(`You claimed your daily rewards and received **${dailyXp} XP**!`)
            .setColor('#f1c40f');

        message.reply({ embeds: [embed] });
    }
};
