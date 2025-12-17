const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel, getXpProgress } = require('../../utils/database');
const UserLevel = require('../../models/UserLevel');

module.exports = {
    data: {
        name: 'level',
        aliases: ['rank', 'lvl'],
        description: 'Shows your rank card.'
    },
    async execute(message, args, client, config) {
        const targetMember = message.mentions.members.first() || message.member;

        try {
            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            const progressData = getXpProgress(userLevel.xp, userLevel.level);
            const allUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const rank = allUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // 1. Setup Canvas
            const canvas = createCanvas(900, 270);
            const ctx = canvas.getContext('2d');

            // 2. FORCE BACKGROUND (Fixes the black/blank issue)
            ctx.fillStyle = '#111214'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const themeColor = config?.embedColor || '#6366f1';

            // 3. DRAW TEXT (Standard 'serif' is safest on Render/Linux)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 40px serif';
            ctx.fillText(targetMember.user.username.toUpperCase(), 280, 80);

            ctx.font = '30px serif';
            ctx.fillText(`LEVEL ${userLevel.level}  |  RANK #${rank}`, 280, 130);

            // 4. PROGRESS BAR
            ctx.fillStyle = '#2C2F33'; // Background of bar
            ctx.fillRect(280, 175, 580, 40);

            ctx.fillStyle = themeColor; // XP Fill
            const fillWidth = (progressData.progress / 100) * 580;
            ctx.fillRect(280, 175, Math.max(fillWidth, 10), 40);

            ctx.fillStyle = '#AAAAAA';
            ctx.font = '20px serif';
            ctx.fillText(`${userLevel.xp.toLocaleString()} XP`, 280, 245);

            // 5. AVATAR
            try {
                const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png', size: 256 }));
                ctx.drawImage(avatar, 40, 40, 190, 190);
                
                // Border around avatar
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 6;
                ctx.strokeRect(40, 40, 190, 190);
            } catch (e) {
                ctx.fillStyle = themeColor;
                ctx.fillRect(40, 40, 190, 190);
            }

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
            return message.reply({ files: [attachment] });

        } catch (error) {
            console.error('Canvas Error:', error);
            message.reply("❌ There was an error rendering the rank card.");
        }
    }
};
