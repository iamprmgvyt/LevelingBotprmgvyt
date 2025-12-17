/**
 * Core Leveling Formulas (Fixed for MessageCreate compatibility)
 */

// Formula for required XP to reach the next level
const requiredXpToLevel = (level) => {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
};

// Total cumulative XP required to reach a specific level
const totalXpRequiredForLevel = (level) => {
    let totalXp = 0;
    for (let i = 0; i < level; i++) {
        totalXp += requiredXpToLevel(i);
    }
    return totalXp;
};

/**
 * RENAMED TO calculateLevel to match your event handler
 * This finds the current level based on total accumulated XP
 */
const calculateLevel = (xp) => {
    let level = 0;
    while (xp >= totalXpRequiredForLevel(level + 1)) {
        level++;
    }
    return level;
};

// Details for the ,rank command progress bar
const getXpProgress = (currentXp, currentLevel) => {
    const xpForThisLevel = totalXpRequiredForLevel(currentLevel);
    const xpForNextLevel = totalXpRequiredForLevel(currentLevel + 1);
    
    const currentLevelXp = currentXp - xpForThisLevel;
    const requiredXp = xpForNextLevel - xpForThisLevel;
    
    return {
        currentLevelXp, 
        requiredXp,     
        progress: requiredXp === 0 ? 100 : Math.floor((currentLevelXp / requiredXp) * 100)
    };
};

// Random XP gain per message
const getRandomXp = () => {
    return Math.floor(Math.random() * (25 - 15 + 1)) + 15;
};

// EXPORTS - Names here MUST match the destructuring in messageCreate.js
module.exports = { 
    calculateLevel, // This was getLevelFromXp
    requiredXpToLevel, 
    totalXpRequiredForLevel, 
    getXpProgress,
    getRandomXp
};
