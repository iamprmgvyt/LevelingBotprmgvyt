/**
 * ==========================================
 * COMMAND: rank/level
 * DESCRIPTION: Generates a high-quality rank card using Canvas.
 * LINE COUNT: > 150 Lines for stability and detail.
 * ==========================================
 */

const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getUserLevel } = require('../../utils/database');
const { getXpProgress } = require('../../utils/xpCalculator');
const UserLevel = require('../../models/UserLevel');

/**
 * Helper function to shorten large numbers (e.g., 1500 -> 1.5K)
 */
function formatNumber(num) {
    return Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
}

/**
 * Helper to wrap text if it's too long
 */
const applyText = (canvas, text, defaultFontSize) => {
    const ctx = canvas.getContext('2d');
    let fontSize = defaultFontSize;
    do {
        ctx.font = `bold ${fontSize -= 5}px sans-serif, serif`;
    } while (ctx.measureText(text).width > canvas.width - 400);
    return ctx.font;
};

module.exports = {
    data: {
        name: 'level',
        description: 'Check your current XP, Level, and Rank on a custom card.',
        aliases: ['rank', 'lvl', 'progress'],
        usage: '[,level @user]'
    },

    /**
     * @param {Message} message 
     * @param {string[]} args 
     * @param {Client} client 
     * @param {Object} config 
     */
    async execute(message, args, client, config) {
        // 1. INITIALIZATION & DATA FETCHING
        const targetMember = message.mentions.members.first() || message.member;
        const themeColor = config.embedColor || '#7289da'; // Discord Blurple fallback

        try {
            // Signal to the user that the bot is working
            await message.channel.sendTyping();

            const userLevel = await getUserLevel(targetMember.id, message.guild.id);
            const progressData = getXpProgress(userLevel.xp, userLevel.level);

            // Fetch Server Rank
            const serverUsers = await UserLevel.find({ guildId: message.guild.id }).sort({ xp: -1 });
            const serverRank = serverUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // Fetch Global Rank
            const globalUsers = await UserLevel.find().sort({ xp: -1 }).limit(100);
            const globalRank = globalUsers.findIndex(u => u.userId === targetMember.id) + 1;

            // 2. CANVAS CREATION
            const canvas = createCanvas(1000, 300);
            const ctx = canvas.getContext('2d');

            // --- LAYER 1: BASE BACKGROUND ---
            // We use a dark gradient instead of pure black for a modern look
            const bgGradient = ctx.createLinearGradient(0, 0, 1000, 300);
            bgGradient.addColorStop(0, '#121212');
            bgGradient.addColorStop(1, '#1c1c1c');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // --- LAYER 2: DECORATIVE ELEMENTS ---
            ctx.fillStyle = themeColor;
            ctx.globalAlpha = 0.1;
            ctx.beginPath();
            ctx.arc(900, 0, 200, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // --- LAYER 3: THE AVATAR ---
            ctx.save();
            // Draw Avatar Border/Glow
            ctx.beginPath();
            ctx.arc(150, 150, 110, 0, Math.PI * 2, true);
            ctx.strokeStyle = themeColor;
            ctx.lineWidth = 8;
            ctx.stroke();

            // Clip Avatar into Circle
            ctx.beginPath();
            ctx.arc(150, 150, 100, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();

            try {
                const avatar = await loadImage(targetMember.user.displayAvatarURL({ extension: 'png', size: 512 }));
                ctx.drawImage(avatar, 50, 50, 200, 200);
            } catch (imgError) {
                // If avatar fails, draw a high-contrast placeholder
                ctx.fillStyle = '#333';
                ctx.fillRect(50, 50, 200, 200);
                ctx.fillStyle = '#fff';
                ctx.font = '50px sans-serif';
                ctx.fillText('?', 130, 170);
            }
            ctx.restore();

            // --- LAYER 4: TEXT ELEMENTS ---
            const startX = 300;

            // Username (Auto-scaling font)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = applyText(canvas, targetMember.user.username, 60);
            ctx.fillText(targetMember.user.username, startX, 100);

            // Level Display
            ctx.fillStyle = themeColor;
            ctx.font = 'bold 35px sans-serif, serif';
            ctx.fillText(`LEVEL ${userLevel.level}`, startX, 155);

            // Rank Information (Right Aligned)
            ctx.textAlign = 'right';
            ctx.font = 'bold 30px sans-serif, serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`SERVER RANK: #${serverRank}`, 950, 70);
            
            if (globalRank > 0 && globalRank <= 100) {
                ctx.fillStyle = '#f1c40f'; // Gold for Global Top 100
                ctx.fillText(`GLOBAL: #${globalRank}`, 950, 110);
            }

            // XP Display (Current / Required)
            ctx.textAlign = 'right';
            ctx.fillStyle = '#AAAAAA';
            ctx.font = '25px sans-serif, serif';
            const xpInfo = `${formatNumber(progressData.currentLevelXp)} / ${formatNumber(progressData.requiredXp)} XP`;
            ctx.fillText(xpInfo, 950, 200);

            // --- LAYER 5: PROGRESS BAR ---
            const barX = startX;
            const barY = 220;
            const barWidth = 650;
            const barHeight = 45;

            // Bar Background
            ctx.textAlign = 'left';
            ctx.fillStyle = '#333333';
            // Custom Rounded Rect for older Node-Canvas versions
            const radius = 22;
            ctx.beginPath();
            ctx.moveTo(barX + radius, barY);
            ctx.lineTo(barX + barWidth - radius, barY);
            ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
            ctx.lineTo(barX + barWidth, barY + barHeight - radius);
            ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - radius, barY + barHeight);
            ctx.lineTo(barX + radius, barY + barHeight);
            ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - radius);
            ctx.lineTo(barX, barY + radius);
            ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
            ctx.closePath();
            ctx.fill();

            // Bar Fill (Based on percentage)
            ctx.fillStyle = themeColor;
            const fillWidth = Math.max(radius * 2, (progressData.progress / 100) * barWidth);
            
            ctx.beginPath();
            ctx.moveTo(barX + radius, barY);
            ctx.lineTo(barX + fillWidth - radius, barY);
            ctx.quadraticCurveTo(barX + fillWidth, barY, barX + fillWidth, barY + radius);
            ctx.lineTo(barX + fillWidth, barY + barHeight - radius);
            ctx.quadraticCurveTo(barX + fillWidth, barY + barHeight, barX + fillWidth - radius, barY + barHeight);
            ctx.lineTo(barX + radius, barY + barHeight);
            ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - radius);
            ctx.lineTo(barX, barY + radius);
            ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
            ctx.closePath();
            ctx.fill();

            // Percentage Text Inside Bar
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 22px sans-serif, serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${progressData.progress}%`, barX + (barWidth / 2), barY + 32);

            // --- FINALIZATION ---
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: `rank-${targetMember.id}.png` });

            return await message.reply({ 
                content: `📊 **Rank card for ${targetMember.user.username}**`, 
                files: [attachment] 
            });

        } catch (error) {
            console.error('CRITICAL ERROR IN LEVEL COMMAND:', error);
            // Fallback to text if Canvas completely explodes
            try {
                const userLevel = await getUserLevel(targetMember.id, message.guild.id);
                return message.reply(`❌ **Image Error.** Your current stats: Level **${userLevel.level}** (${userLevel.xp.toLocaleString()} XP).`);
            } catch (dbError) {
                return message.reply('❌ System error: Unable to retrieve leveling data.');
            }
        }
    }
};
