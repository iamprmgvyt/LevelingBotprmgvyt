/**
 * Logic for XP calculation and progress bars
 */
const calculateLevel = (xp) => Math.floor(0.1 * Math.sqrt(xp));
const calculateXp = (level) => Math.pow(level / 0.1, 2);

function getXpProgress(xp, level) {
    const currentLevelXp = calculateXp(level);
    const nextLevelXp = calculateXp(level + 1);
    const xpRequiredForNextLevel = nextLevelXp - currentLevelXp;
    const xpGainedInCurrentLevel = xp - currentLevelXp;
    
    let progress = Math.floor((xpGainedInCurrentLevel / xpRequiredForNextLevel) * 100);
    if (progress < 0) progress = 0;
    if (progress > 100) progress = 100;

    return {
        progress: progress,
        requiredXp: Math.floor(xpRequiredForNextLevel),
        currentLevelXp: Math.floor(xpGainedInCurrentLevel)
    };
}

// Ensure this EXACT export exists
module.exports = {
    calculateLevel,
    calculateXp,
    getXpProgress
};
