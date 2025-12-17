const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');

module.exports = {
    data: {
        name: 'level',
        description: 'Check your current level with a visual Rank Card.',
        aliases: ['rank', 'lvl']
    },
    async execute(message, args, client, config) {
        const targetMember = message.mentions.members.first() || message.member;
        const userLevel = await getUserLevel(targetMember.id, message.guild.id);
        const progressData = getXpProgress(userLevel.xp, userLevel.level);

        // Canvas Setup
        const canvas = createCanvas(800, 200);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#2c2f33';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Progress Bar Background
        ctx.fillStyle = '#484b4e';
        ctx.fillRect(220, 130, 500, 30);

        // Progress Bar Fill
        ctx.fillStyle = config.embedColor || '#6366f1';
        const fillWidth = (progressData.progress / 100) * 500;
        ctx.fillRect(220, 130, fillWidth, 30);

        // Text: Username & Level
        ctx.font = 'bold 35px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(targetMember.user.username, 220, 70);

        ctx.font = '25px sans-serif';
        ctx.fillText(`Level: ${userLevel.level}`, 220, 110);
        ctx.fillText(`${progressData.progress}%`, 660, 110);

        // Avatar
        const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png' }));
        ctx.drawImage(avatar, 30, 30, 140, 140);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
        return message.reply({ files: [attachment] });
    }
};
