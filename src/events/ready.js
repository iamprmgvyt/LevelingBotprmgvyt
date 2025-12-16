module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`🤖 Logged in as ${client.user.tag}!`);
        
        // --- ADDED: Set Presence ---
        client.user.setPresence({
            activities: [{ 
                name: `${process.env.BOT_PREFIX || ','}help | Leveling up!`, 
                type: 3 // 3 corresponds to ActivityType.Watching
            }],
            status: 'online', // or 'dnd', 'idle'
        });
        // -------------------------
        
    },
};