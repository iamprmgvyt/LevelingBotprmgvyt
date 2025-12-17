const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { xpRequiredForLevel } = require('../../utils/xpCalculator');

module.exports = {
    data: { name: 'rank', description: 'View your current rank card.' },
    async execute(message) {
        const userLevel = await getUserLevel(message.author.id, message.guild.id);
        const nextLevelXp = xpRequiredForLevel(userLevel.level + 1);

        const canvas = createCanvas(700, 250);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#23272a';
        ctx.fillRect(0, 0, 700, 250);

        // Progress Bar Background
        ctx.fillStyle = '#484b4e';
        ctx.fillRect(200, 180, 450, 30);

        // Progress Bar Fill
        const progress = (userLevel.xp / nextLevelXp) * 450;
        ctx.fillStyle = '#0099ff';
        ctx.fillRect(200, 180, progress, 30);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px sans-serif';
        ctx.fillText(message.author.username, 200, 70);
        ctx.fillText(`Level: ${userLevel.level}`, 200, 120);
        ctx.font = '20px sans-serif';
        ctx.fillText(`${userLevel.xp} / ${nextLevelXp} XP`, 200, 170);

        // Avatar
        const avatar = await loadImage(message.author.displayAvatarURL({ extension: 'png' }));
        ctx.drawImage(avatar, 25, 25, 150, 150);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
        message.reply({ files: [attachment] });
    }
};
