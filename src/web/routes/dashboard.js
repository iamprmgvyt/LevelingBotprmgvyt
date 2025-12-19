router.post('/server/:guildId/save', async (req, res) => {
    const { guildId } = req.params;
    const { prefix, levelingEnabled, xpRate, embedColor } = req.body;

    try {
        // Use findOneAndUpdate to OVERWRITE the existing prefix
        await GuildConfig.findOneAndUpdate(
            { guildId: guildId },
            { 
                prefix: prefix, 
                levelingEnabled: levelingEnabled === 'on',
                xpRate: parseFloat(xpRate),
                embedColor: embedColor
            },
            { upsert: true, new: true }
        );

        res.redirect(`/dashboard/server/${guildId}?success=true`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error saving to Database');
    }
});
