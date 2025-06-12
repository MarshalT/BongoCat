/**
 * Cat Gene Parser - JavaScript Version
 * Based on the TypeScript implementation
 */

/**
 * Parse gene into appearance and attributes
 * @param {number} gene - The cat gene value
 * @returns {object} - Parsed gene features
 */
export function parseGene(gene) {
  // Default to 0 if gene is undefined or null
  const geneValue = gene || 0;
  
  // 1. Appearance part - using bit operations
  const appearance = {
    // Base color (0-6: different color schemes)
    baseColor: geneValue % 7,

    // Fur length (0-3: short, medium, long, curly)
    furLength: (geneValue >> 4) & 0x3,

    // Ear shape (0-3: normal, folded down, folded up, round)
    earShape: (geneValue >> 6) & 0x3,

    // Eye color (0-7: different eye colors)
    eyeColor: (geneValue >> 8) & 0x7,

    // Pattern (0-15: various patterns like spots, stripes)
    pattern: (geneValue >> 11) & 0xF,
  };

  // 2. Attributes part - using different bit segments
  const attributes = {
    // Personality (0-7: playful, gentle, curious, independent, cautious, brave, mischievous, aloof)
    personality: (geneValue >> 15) & 0x7,

    // Rarity (0-15: common, uncommon, rare, super rare...)
    rarity: (geneValue >> 18) & 0xF,

    // Growth potential (50-150 value, affects XP gain rate)
    growthPotential: 50 + (((geneValue >> 22) & 0x3F) * 100 / 63),

    // Stamina recovery rate (0.5-1.5x)
    staminaRecovery: 0.5 + ((geneValue >> 28) & 0x7) / 10,

    // Luck (1-10: affects check event trigger probability)
    luck: 1 + ((geneValue >> 31) & 0x9),
  };

  // 3. Special abilities - using high bits
  const specialAbilities = {
    // Special abilities unlocked (each bit represents an ability)
    abilities: (geneValue >> 40) & 0xFF,

    // Hidden trait (very rare attribute combination)
    hiddenTrait: ((geneValue >> 48) & 0xFFFF) === 0x1234,
  };
  
  return {
    appearance,
    attributes,
    specialAbilities,
  };
}

/**
 * Get color name
 * @param {number} colorIndex - Color index
 * @returns {string} - Color name
 */
export function getColorName(colorIndex) {
  const colorNames = [
    'Orange',
    'Grey',
    'Brown',
    'White',
    'Yellow',
    'Black',
    'Blue-Grey',
  ];
  return colorNames[colorIndex] || 'Unknown';
}

/**
 * Get fur length name
 * @param {number} furLengthIndex - Fur length index
 * @returns {string} - Fur length name
 */
export function getFurLengthName(furLengthIndex) {
  const furLengthNames = ['Short', 'Medium', 'Long', 'Curly'];
  return furLengthNames[furLengthIndex] || 'Unknown';
}

/**
 * Get ear shape name
 * @param {number} earShapeIndex - Ear shape index
 * @returns {string} - Ear shape name
 */
export function getEarShapeName(earShapeIndex) {
  const earShapeNames = ['Normal', 'Folded Down', 'Folded Up', 'Round'];
  return earShapeNames[earShapeIndex] || 'Unknown';
}

/**
 * Get eye color name
 * @param {number} eyeColorIndex - Eye color index
 * @returns {string} - Eye color name
 */
export function getEyeColorName(eyeColorIndex) {
  const eyeColorNames = ['Green', 'Blue', 'Yellow', 'Brown', 'Amber', 'Odd-eyed', 'Grey', 'Purple'];
  return eyeColorNames[eyeColorIndex] || 'Unknown';
}

/**
 * Get pattern name
 * @param {number} patternIndex - Pattern index
 * @returns {string} - Pattern name
 */
export function getPatternName(patternIndex) {
  const patternNames = [
    'Solid',
    'Tabby',
    'Spotted',
    'Bi-color',
    'Tri-color',
    'Tortoiseshell',
    'Colorpoint',
    'Smoke',
    'Silver',
    'Clouded',
    'Marble',
    'Ringed',
    'Flat-patterned',
    'Striped',
    'Single-colored',
    'Special',
  ];
  return patternNames[patternIndex] || 'Unknown';
}

/**
 * Get personality name
 * @param {number} personalityIndex - Personality index
 * @returns {string} - Personality name
 */
export function getPersonalityName(personalityIndex) {
  const personalityNames = ['Playful', 'Gentle', 'Curious', 'Independent', 'Cautious', 'Brave', 'Mischievous', 'Aloof'];
  return `${personalityNames[personalityIndex] || 'Unknown'} Type`;
}

/**
 * Get rarity name
 * @param {number} rarityIndex - Rarity index
 * @returns {string} - Rarity name
 */
export function getRarityName(rarityIndex) {
  const rarityNames = [
    'Common',
    'Ordinary',
    'Uncommon',
    'Interesting',
    'Unusual',
    'Rare',
    'Scarce',
    'Curious',
    'Very Rare',
    'Ultra Rare',
    'Legendary',
    'Mythical',
    'Epic',
    'Unique',
    'Limited',
    'Exclusive',
  ];
  return rarityNames[rarityIndex] || 'Unknown';
}

/**
 * Get growth potential description
 * @param {number} value - Growth potential value
 * @returns {string} - Growth potential description
 */
export function getGrowthPotentialDesc(value) {
  let level = '';
  if (value < 70) level = 'Low';
  else if (value < 100) level = 'Medium';
  else if (value < 120) level = 'High';
  else level = 'Very High';

  return `${Math.round(value)}% (${level})`;
}

/**
 * Get special abilities list
 * @param {number} abilities - Abilities bitmap
 * @returns {string[]} - Special abilities names array
 */
export function getSpecialAbilities(abilities) {
  const allAbilities = [
    'Extra XP Gain',
    'Quick Recovery',
    'Lucky Paws',
    'Double Rewards',
    'Rare Item Detection',
    'Reduced Consumption',
    'Combo Skills',
    'Hidden Treasure',
  ];

  const result = [];
  for (let i = 0; i < 8; i++) {
    if ((abilities & (1 << i)) !== 0) {
      result.push(allAbilities[i]);
    }
  }

  return result;
}

/**
 * Get cat gene details
 * @param {number} gene - Gene value
 * @returns {object} - Cat gene details
 */
export function getCatGeneDetails(gene) {
  const parsedGene = parseGene(gene);
  
  return {
    // Appearance
    baseColor: getColorName(parsedGene.appearance.baseColor),
    furLength: getFurLengthName(parsedGene.appearance.furLength),
    earShape: getEarShapeName(parsedGene.appearance.earShape),
    eyeColor: getEyeColorName(parsedGene.appearance.eyeColor),
    pattern: getPatternName(parsedGene.appearance.pattern),

    // Personality and abilities
    personality: getPersonalityName(parsedGene.attributes.personality),
    rarity: getRarityName(parsedGene.attributes.rarity),
    growthPotential: getGrowthPotentialDesc(parsedGene.attributes.growthPotential),
    staminaRecovery: `${parsedGene.attributes.staminaRecovery.toFixed(1)}x`,
    luck: parsedGene.attributes.luck.toFixed(0),

    // Special abilities
    specialAbilities: getSpecialAbilities(parsedGene.specialAbilities.abilities),
    hiddenTrait: parsedGene.specialAbilities.hiddenTrait,

    // Raw parsed gene
    rawGene: parsedGene,
  };
}

/**
 * Get cat appearance style based on genes
 * @param {number} gene - Gene value
 * @returns {object} - Cat appearance styles
 */
export function getCatAppearanceStyle(gene) {
  // 确保 gene 是数字类型
  const geneValue = Number(gene || 0);
  const parsedGene = parseGene(geneValue);
  
  // Base color
  const baseColorIndex = parsedGene.appearance.baseColor;
  const colorSchemes = [
    { // Orange
      body1: '#ffb84d',
      body2: '#e67700',
      ear: '#ffb380',
      stroke: '#e09112',
    },
    { // Grey
      body1: '#b3b3cc',
      body2: '#666699',
      ear: '#d1d1e0',
      stroke: '#666699',
    },
    { // Brown
      body1: '#bf8040',
      body2: '#734d26',
      ear: '#d2a679',
      stroke: '#734d26',
    },
    { // White
      body1: '#ffffff',
      body2: '#e6e6e6',
      ear: '#f2f2f2',
      stroke: '#cccccc',
    },
    { // Yellow
      body1: '#ffff99',
      body2: '#e6e600',
      ear: '#ffffb3',
      stroke: '#e6e600',
    },
    { // Black
      body1: '#666666',
      body2: '#1a1a1a',
      ear: '#808080',
      stroke: '#333333',
    },
    { // Blue-Grey
      body1: '#99ccff',
      body2: '#3399ff',
      ear: '#cce6ff',
      stroke: '#3399ff',
    },
  ];
  // 使用模运算确保索引在有效范围内
  const safeBaseColorIndex = baseColorIndex % colorSchemes.length;
  const colorScheme = colorSchemes[safeBaseColorIndex];

  // Ear shape
  const earShapeIndex = parsedGene.appearance.earShape;
  const earShapes = [
    { // Normal
      left: 'M65,35 L60,10 Q75,15 85,30',
      right: 'M115,35 L120,10 Q105,15 95,30',
      leftInner: 'M67,30 L65,15 Q75,20 80,28',
      rightInner: 'M113,30 L115,15 Q105,20 100,28',
    },
    { // Folded Down
      left: 'M65,35 L60,20 Q65,10 75,15 Q80,25 85,30',
      right: 'M115,35 L120,20 Q115,10 105,15 Q100,25 95,30',
      leftInner: 'M67,30 L65,20 Q70,15 75,18 Q78,25 80,28',
      rightInner: 'M113,30 L115,20 Q110,15 105,18 Q102,25 100,28',
    },
    { // Folded Up
      left: 'M65,35 L55,15 Q65,5 75,10 Q80,20 85,30',
      right: 'M115,35 L125,15 Q115,5 105,10 Q100,20 95,30',
      leftInner: 'M67,30 L60,18 Q65,10 72,13 Q76,20 80,28',
      rightInner: 'M113,30 L120,18 Q115,10 108,13 Q104,20 100,28',
    },
    { // Round
      left: 'M65,35 Q55,20 60,10 Q70,5 80,15 Q85,25 85,30',
      right: 'M115,35 Q125,20 120,10 Q110,5 100,15 Q95,25 95,30',
      leftInner: 'M67,30 Q60,20 62,15 Q70,10 75,18 Q78,25 80,28',
      rightInner: 'M113,30 Q120,20 118,15 Q110,10 105,18 Q102,25 100,28',
    },
  ];
  // 使用模运算确保索引在有效范围内
  const safeEarShapeIndex = earShapeIndex % earShapes.length;
  const earShape = earShapes[safeEarShapeIndex];

  // Eye color
  const eyeColorIndex = parsedGene.appearance.eyeColor;
  const eyeColors = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FFEB3B', // Yellow
    '#795548', // Brown
    '#FF9800', // Amber
    '#9C27B0', // Purple (for odd-eyed left eye)
    '#607D8B', // Grey
    '#673AB7', // Purple
  ];
  
  // 使用模运算确保索引在有效范围内
  const safeEyeColorIndex = eyeColorIndex % eyeColors.length;
  
  // Special handling for odd-eyed cats
  const leftEyeColor = safeEyeColorIndex === 5 ? eyeColors[5] : eyeColors[safeEyeColorIndex];
  const rightEyeColor = safeEyeColorIndex === 5 ? eyeColors[0] : eyeColors[safeEyeColorIndex];

  // Fur length
  const furLengthIndex = parsedGene.appearance.furLength;
  const furTypes = ['short', 'medium', 'long', 'curly'];
  // 使用模运算确保索引在有效范围内
  const safeFurLengthIndex = furLengthIndex % furTypes.length;
  const furType = furTypes[safeFurLengthIndex];

  // Pattern
  const patternIndex = parsedGene.appearance.pattern;
  const hasPattern = patternIndex > 0;

  return {
    colors: colorScheme,
    ears: earShape,
    eyes: {
      leftColor: leftEyeColor,
      rightColor: rightEyeColor,
    },
    fur: {
      type: furType,
      strokeWidth: safeFurLengthIndex === 0
        ? 1.5
        : safeFurLengthIndex === 1
          ? 2
          : safeFurLengthIndex === 2 ? 2.5 : 3,
    },
    pattern: {
      type: patternIndex,
      hasPattern,
    },
  };
}

/**
 * Get cat color CSS class
 * @param {number} gene - Gene value
 * @returns {string} - CSS class name
 */
export function getCatColorClass(gene) {
  const parsedGene = parseGene(gene);
  const baseColorIndex = parsedGene.appearance.baseColor;
  const colors = [
    'bg-orange-500',
    'bg-blue-400',
    'bg-yellow-500',
    'bg-purple-400',
    'bg-green-500',
    'bg-red-400',
    'bg-indigo-500',
  ];
  return colors[baseColorIndex] || colors[0];
} 