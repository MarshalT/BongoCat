/**
 * 稀有度概率控制器
 * 提供多种稀有度分布策略
 */

/**
 * 稀有度分布策略枚举
 */
export const RARITY_STRATEGIES = {
  UNIFORM: 'uniform',           // 均匀分布（原始方式）
  REALISTIC: 'realistic',       // 真实游戏分布
  GENEROUS: 'generous',         // 慷慨分布（更多稀有）
  STRICT: 'strict',            // 严格分布（更少稀有）
  EVENT: 'event',              // 活动分布（特殊事件）
  CUSTOM: 'custom'             // 自定义分布
};

/**
 * 预定义的稀有度分布配置
 */
const RARITY_DISTRIBUTIONS = {
  [RARITY_STRATEGIES.UNIFORM]: {
    name: '均匀分布',
    description: '每个稀有度等级概率相等',
    probabilities: Array(16).fill(6.25) // 每个等级6.25%
  },
  
  [RARITY_STRATEGIES.REALISTIC]: {
    name: '真实游戏分布',
    description: '模拟真实收集游戏的稀有度分布',
    probabilities: [30.0, 20.0, 15.0, 10.0, 7.0, 5.0, 4.0, 3.0, 2.5, 1.5, 1.0, 0.5, 0.3, 0.1, 0.05, 0.05]
  },
  
  [RARITY_STRATEGIES.GENEROUS]: {
    name: '慷慨分布',
    description: '提高稀有猫咪的出现概率',
    probabilities: [25.0, 18.0, 15.0, 12.0, 10.0, 8.0, 5.0, 3.0, 2.0, 1.5, 0.3, 0.1, 0.05, 0.03, 0.01, 0.01]
  },
  
  [RARITY_STRATEGIES.STRICT]: {
    name: '严格分布',
    description: '降低稀有猫咪的出现概率',
    probabilities: [40.0, 25.0, 15.0, 8.0, 5.0, 3.0, 2.0, 1.0, 0.5, 0.3, 0.15, 0.03, 0.01, 0.005, 0.003, 0.002]
  },
  
  [RARITY_STRATEGIES.EVENT]: {
    name: '活动分布',
    description: '特殊活动期间的稀有度分布',
    probabilities: [20.0, 15.0, 15.0, 15.0, 10.0, 8.0, 6.0, 4.0, 3.0, 2.0, 1.5, 0.3, 0.15, 0.03, 0.01, 0.01]
  }
};

/**
 * 根据基因值和策略计算稀有度
 * @param {BigInt} geneBigInt - 基因值
 * @param {string} strategy - 分布策略
 * @param {number[]} customProbabilities - 自定义概率数组（仅当strategy为CUSTOM时使用）
 * @returns {number} - 稀有度索引 (0-15)
 */
export function calculateRarityWithStrategy(geneBigInt, strategy = RARITY_STRATEGIES.REALISTIC, customProbabilities = null) {
  let probabilities;
  
  if (strategy === RARITY_STRATEGIES.CUSTOM && customProbabilities) {
    probabilities = customProbabilities;
  } else if (RARITY_DISTRIBUTIONS[strategy]) {
    probabilities = RARITY_DISTRIBUTIONS[strategy].probabilities;
  } else {
    // 默认使用真实分布
    probabilities = RARITY_DISTRIBUTIONS[RARITY_STRATEGIES.REALISTIC].probabilities;
  }
  
  // 确保概率数组长度为16
  if (probabilities.length !== 16) {
    console.warn('概率数组长度不正确，使用默认分布');
    probabilities = RARITY_DISTRIBUTIONS[RARITY_STRATEGIES.REALISTIC].probabilities;
  }
  
  // 从基因中提取随机值
  const randomValue = extractRandomValueFromGene(geneBigInt);
  
  // 将概率转换为累积概率
  const cumulativeProbabilities = [];
  let sum = 0;
  for (let i = 0; i < probabilities.length; i++) {
    sum += probabilities[i];
    cumulativeProbabilities.push(sum);
  }
  
  // 根据随机值确定稀有度
  const randomPercent = (randomValue % 10000) / 100; // 0-99.99
  
  for (let i = 0; i < cumulativeProbabilities.length; i++) {
    if (randomPercent < cumulativeProbabilities[i]) {
      return i;
    }
  }
  
  return 15; // 默认返回最高稀有度
}

/**
 * 从基因中提取随机值
 * @param {BigInt} geneBigInt - 基因值
 * @returns {number} - 随机值
 */
function extractRandomValueFromGene(geneBigInt) {
  // 使用多个位段来增加随机性
  const bits1 = Number((geneBigInt >> 18n) & 0xFFn);
  const bits2 = Number((geneBigInt >> 26n) & 0xFFn);
  const bits3 = Number((geneBigInt >> 34n) & 0xFFn);
  const bits4 = Number((geneBigInt >> 42n) & 0xFFn);
  
  // 组合多个位段
  return (bits1 + bits2 * 256 + bits3 * 65536 + bits4 * 16777216) % 1000000;
}

/**
 * 获取稀有度分布信息
 * @param {string} strategy - 分布策略
 * @returns {object} - 分布信息
 */
export function getRarityDistributionInfo(strategy) {
  return RARITY_DISTRIBUTIONS[strategy] || RARITY_DISTRIBUTIONS[RARITY_STRATEGIES.REALISTIC];
}

/**
 * 获取所有可用的分布策略
 * @returns {object[]} - 策略列表
 */
export function getAvailableStrategies() {
  return Object.keys(RARITY_DISTRIBUTIONS).map(key => ({
    key,
    ...RARITY_DISTRIBUTIONS[key]
  }));
}

/**
 * 计算稀有度分布统计
 * @param {number[]} rarities - 稀有度数组
 * @returns {object} - 统计信息
 */
export function calculateRarityStatistics(rarities) {
  const counts = Array(16).fill(0);
  const total = rarities.length;
  
  rarities.forEach(rarity => {
    if (rarity >= 0 && rarity < 16) {
      counts[rarity]++;
    }
  });
  
  const statistics = counts.map((count, index) => ({
    rarity: index,
    count,
    percentage: total > 0 ? (count / total * 100).toFixed(2) : '0.00'
  }));
  
  return {
    total,
    distribution: statistics,
    summary: {
      common: counts.slice(0, 2).reduce((a, b) => a + b, 0),
      uncommon: counts.slice(2, 4).reduce((a, b) => a + b, 0),
      rare: counts.slice(4, 7).reduce((a, b) => a + b, 0),
      epic: counts.slice(7, 10).reduce((a, b) => a + b, 0),
      legendary: counts.slice(10, 13).reduce((a, b) => a + b, 0),
      mythical: counts.slice(13, 16).reduce((a, b) => a + b, 0)
    }
  };
}

/**
 * 验证自定义概率数组
 * @param {number[]} probabilities - 概率数组
 * @returns {object} - 验证结果
 */
export function validateCustomProbabilities(probabilities) {
  const errors = [];
  
  if (!Array.isArray(probabilities)) {
    errors.push('概率必须是数组');
    return { valid: false, errors };
  }
  
  if (probabilities.length !== 16) {
    errors.push('概率数组长度必须为16');
  }
  
  const sum = probabilities.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 0.01) {
    errors.push(`概率总和必须为100，当前为${sum.toFixed(2)}`);
  }
  
  probabilities.forEach((prob, index) => {
    if (typeof prob !== 'number' || prob < 0) {
      errors.push(`索引${index}的概率必须为非负数`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    sum
  };
}
