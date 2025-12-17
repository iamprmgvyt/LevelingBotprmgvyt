const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'help',
        description: 'List all commands or info about a specific command',
        aliases: ['h']
    },
    async execute(message, args, client, config) {
        // Fallback: If config is missing or doesn't have an embedColor, use Indigo
        const embedColor = (config && config.embedColor) ? config.embedColor : '#6366f1';

        const embed = new EmbedBuilder()
            .setTitle('📚 Bot Commands')
            .setColor(embedColor) // FIXED: Never undefined now
            .setDescription(`My current prefix for this server is: \`${config.prefix || '!'}\``)
            .setTimestamp();

        // Organize commands by category (assuming your folders are categorized)
        const categories = {};
        client.commands.forEach(cmd => {
            const cat = cmd.category || 'General';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(`\`${cmd.data.name}\``);
        });

        for (const [category, commands] of Object.entries(categories)) {
            embed.addFields({ name: category, value: commands.join(', '), inline: false });
        }

        return message.reply({ embeds: [embed] });
    }
};
