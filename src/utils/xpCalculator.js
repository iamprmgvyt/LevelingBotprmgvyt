/**
 * Core Leveling Formulas
 */

// Formula for required XP to reach the next level (from current level to next level)
// This formula ensures the XP requirement increases quadratically as the level rises.
// XP_needed = 5 * (level)^2 + 50 * level + 100
const requiredXpToLevel = (level) => {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
};

// Formula to calculate the total cumulative XP required to reach a specific level (from level 0)
const totalXpRequiredForLevel = (level) => {
    let totalXp = 0;
    for (let i = 0; i < level; i++) {
        totalXp += requiredXpToLevel(i);
    }
    return totalXp;
};

// Reverse calculation: find the current level based on total accumulated XP
const getLevelFromXp = (xp) => {
    let level = 0;
    while (xp >= totalXpRequiredForLevel(level + 1)) {
        level++;
    }
    return level;
};

// Calculate the XP progress details within the current level for the ,rank command
const getXpProgress = (currentXp, currentLevel) => {
    const xpForThisLevel = totalXpRequiredForLevel(currentLevel);
    const xpForNextLevel = totalXpRequiredForLevel(currentLevel + 1);
    
    // XP earned *since* the last level up
    const currentLevelXp = currentXp - xpForThisLevel;
    
    // Total XP required to complete the current level
    const requiredXp = xpForNextLevel - xpForThisLevel;
    
    return {
        currentLevelXp, // XP earned in this level
        requiredXp,     // Total XP needed for this level
        progress: requiredXp === 0 ? 100 : Math.floor((currentLevelXp / requiredXp) * 100) // Percentage
    };
};

// Random XP gain per message (base: 15-25 XP)
const getRandomXp = () => {
    return Math.floor(Math.random() * (25 - 15 + 1)) + 15;
};

module.exports = { 
    requiredXpToLevel, 
    totalXpRequiredForLevel, 
    getLevelFromXp,
    getXpProgress,
    getRandomXp
};