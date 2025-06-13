/**
 * 稀有度统计工具
 * 提供各种稀有度分析和统计功能
 */

import { getRarityConfig } from './catGeneParser.js';

/**
 * 稀有度等级定义（与 catGeneParser.js 保持一致）
 */
export const RARITY_LEVELS = [
  'Common',        // 0 - 普通
  'Ordinary',      // 1 - 一般
  'Uncommon',      // 2 - 不常见
  'Interesting',   // 3 - 有趣
  'Unusual',       // 4 - 不寻常
  'Rare',          // 5 - 稀有
  'Scarce',        // 6 - 稀缺
  'Curious',       // 7 - 奇特
  'Very Rare',     // 8 - 非常稀有
  'Ultra Rare',    // 9 - 超级稀有
  'Legendary',     // 10 - 传奇
  'Mythical',      // 11 - 神话
  'Epic',          // 12 - 史诗
  'Unique',        // 13 - 独特
  'Limited',       // 14 - 限定
  'Exclusive',     // 15 - 专属
];

/**
 * 稀有度层级分组
 */
export const RARITY_TIERS = {
  COMMON: ['Common', 'Ordinary'],
  UNCOMMON: ['Uncommon', 'Interesting'],
  RARE: ['Unusual', 'Rare', 'Scarce'],
  EPIC: ['Curious', 'Very Rare', 'Ultra Rare'],
  LEGENDARY: ['Legendary', 'Mythical', 'Epic'],
  MYTHICAL: ['Unique', 'Limited', 'Exclusive']
};

/**
 * 统计猫咪稀有度分布
 * @param {Array} cats - 猫咪数组，每个猫咪对象应包含 details.rarity 属性
 * @returns {Object} - 统计结果
 */
export function calculateRarityDistribution(cats) {
  if (!Array.isArray(cats) || cats.length === 0) {
    return {
      total: 0,
      distribution: {},
      tierSummary: {},
      scarcityIndex: 0,
      economicImpact: 'unknown'
    };
  }

  // 统计各稀有度数量
  const rarityCount = {};
  
  cats.forEach(cat => {
    const rarity = cat.details?.rarity || 'Unknown';
    rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
  });

  // 计算详细分布
  const distribution = RARITY_LEVELS.map(level => {
    const count = rarityCount[level] || 0;
    const percentage = cats.length > 0 ? (count / cats.length * 100) : 0;
    const config = getRarityConfig(RARITY_LEVELS.indexOf(level));
    
    return {
      level,
      count,
      percentage: parseFloat(percentage.toFixed(2)),
      config
    };
  });

  // 计算层级汇总
  const tierSummary = {};
  Object.entries(RARITY_TIERS).forEach(([tier, levels]) => {
    const count = levels.reduce((sum, level) => sum + (rarityCount[level] || 0), 0);
    const percentage = cats.length > 0 ? (count / cats.length * 100) : 0;
    
    tierSummary[tier.toLowerCase()] = {
      count,
      percentage: parseFloat(percentage.toFixed(2))
    };
  });

  // 计算稀缺性指数（传奇+神话级别占比）
  const scarcityCount = tierSummary.legendary.count + tierSummary.mythical.count;
  const scarcityIndex = cats.length > 0 ? (scarcityCount / cats.length * 100) : 0;

  // 经济影响评估
  let economicImpact;
  if (scarcityIndex < 1) {
    economicImpact = 'extreme_scarcity'; // 极高稀缺性
  } else if (scarcityIndex < 3) {
    economicImpact = 'high_scarcity'; // 高稀缺性
  } else if (scarcityIndex < 5) {
    economicImpact = 'medium_scarcity'; // 中等稀缺性
  } else {
    economicImpact = 'low_scarcity'; // 低稀缺性
  }

  return {
    total: cats.length,
    distribution,
    tierSummary,
    scarcityIndex: parseFloat(scarcityIndex.toFixed(2)),
    economicImpact
  };
}

/**
 * 格式化输出稀有度统计报告
 * @param {Object} statistics - calculateRarityDistribution 的返回结果
 * @param {Object} options - 输出选项
 * @returns {string} - 格式化的报告文本
 */
export function formatRarityReport(statistics, options = {}) {
  const {
    showHeader = true,
    showDetailed = true,
    showTierSummary = true,
    showEconomicAnalysis = true,
    useEmojis = true
  } = options;

  let report = '';

  // 标题
  if (showHeader) {
    const emoji = useEmojis ? '📊 ' : '';
    report += `${emoji}猫咪稀有度统计报告\n`;
    report += '='.repeat(50) + '\n';
    report += `总数: ${statistics.total} 只猫咪\n\n`;
  }

  // 详细分布
  if (showDetailed && statistics.distribution.length > 0) {
    const emoji = useEmojis ? '📈 ' : '';
    report += `${emoji}详细稀有度分布:\n`;
    report += '-'.repeat(50) + '\n';
    
    statistics.distribution.forEach(item => {
      const levelName = item.level.padEnd(15);
      const count = item.count.toString().padStart(3);
      const percentage = item.percentage.toFixed(1).padStart(5);
      report += `${levelName}: ${count} 只 (${percentage}%)\n`;
    });
    report += '\n';
  }

  // 层级汇总
  if (showTierSummary) {
    const emoji = useEmojis ? '🏆 ' : '';
    report += `${emoji}按稀有度层级汇总:\n`;
    report += '-'.repeat(30) + '\n';
    
    const tierNames = {
      common: '普通级别 (Common)',
      uncommon: '不常见级别 (Uncommon)',
      rare: '稀有级别 (Rare)',
      epic: '史诗级别 (Epic)',
      legendary: '传奇级别 (Legendary)',
      mythical: '神话级别 (Mythical)'
    };

    Object.entries(statistics.tierSummary).forEach(([tier, data]) => {
      const tierName = tierNames[tier] || tier;
      report += `${tierName.padEnd(25)}: ${data.count} 只 (${data.percentage.toFixed(1)}%)\n`;
    });
    report += '\n';
  }

  // 经济分析
  if (showEconomicAnalysis) {
    const emoji = useEmojis ? '💎 ' : '';
    report += `${emoji}稀缺性指数: ${statistics.scarcityIndex}% (传奇+神话级别占比)\n`;
    
    const economicMessages = {
      extreme_scarcity: '📈 经济影响: 极高稀缺性，适合高价值NFT市场',
      high_scarcity: '📈 经济影响: 高稀缺性，平衡的收集体验',
      medium_scarcity: '📈 经济影响: 中等稀缺性，适合大众市场',
      low_scarcity: '📈 经济影响: 低稀缺性，可能影响稀有猫咪价值'
    };

    const message = economicMessages[statistics.economicImpact] || '📈 经济影响: 未知';
    if (useEmojis) {
      report += message + '\n';
    } else {
      report += message.replace(/📈 /, '') + '\n';
    }
  }

  return report;
}

/**
 * 输出稀有度统计到控制台
 * @param {Array} cats - 猫咪数组
 * @param {Object} options - 输出选项
 */
export function printRarityStatistics(cats, options = {}) {
  const statistics = calculateRarityDistribution(cats);
  const report = formatRarityReport(statistics, options);
  console.log(report);
  return statistics;
}

/**
 * 比较两个稀有度分布
 * @param {Object} stats1 - 第一个统计结果
 * @param {Object} stats2 - 第二个统计结果
 * @param {string} label1 - 第一个分布的标签
 * @param {string} label2 - 第二个分布的标签
 * @returns {string} - 比较报告
 */
export function compareRarityDistributions(stats1, stats2, label1 = '分布1', label2 = '分布2') {
  let report = `\n🔍 稀有度分布对比: ${label1} vs ${label2}\n`;
  report += '='.repeat(60) + '\n';
  
  report += `总数: ${label1} ${stats1.total} 只 | ${label2} ${stats2.total} 只\n\n`;
  
  // 层级对比
  report += '层级对比:\n';
  report += '-'.repeat(40) + '\n';
  
  Object.keys(stats1.tierSummary).forEach(tier => {
    const tier1 = stats1.tierSummary[tier];
    const tier2 = stats2.tierSummary[tier];
    const diff = tier2.percentage - tier1.percentage;
    const diffStr = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
    
    report += `${tier.padEnd(10)}: ${tier1.percentage.toFixed(1)}% → ${tier2.percentage.toFixed(1)}% (${diffStr})\n`;
  });
  
  // 稀缺性指数对比
  const scarcityDiff = stats2.scarcityIndex - stats1.scarcityIndex;
  const scarcityDiffStr = scarcityDiff > 0 ? `+${scarcityDiff.toFixed(2)}%` : `${scarcityDiff.toFixed(2)}%`;
  
  report += `\n稀缺性指数: ${stats1.scarcityIndex}% → ${stats2.scarcityIndex}% (${scarcityDiffStr})\n`;
  
  return report;
}

/**
 * 生成稀有度分布的 CSV 数据
 * @param {Object} statistics - 统计结果
 * @returns {string} - CSV 格式的数据
 */
export function generateRarityCSV(statistics) {
  let csv = 'Rarity Level,Count,Percentage,Tier\n';
  
  statistics.distribution.forEach(item => {
    // 确定层级
    let tier = 'Unknown';
    Object.entries(RARITY_TIERS).forEach(([tierName, levels]) => {
      if (levels.includes(item.level)) {
        tier = tierName;
      }
    });
    
    csv += `"${item.level}",${item.count},${item.percentage},${tier}\n`;
  });
  
  return csv;
}

/**
 * 获取稀有度分布的 JSON 数据
 * @param {Object} statistics - 统计结果
 * @returns {Object} - 结构化的 JSON 数据
 */
export function getRarityJSON(statistics) {
  return {
    metadata: {
      total: statistics.total,
      scarcityIndex: statistics.scarcityIndex,
      economicImpact: statistics.economicImpact,
      generatedAt: new Date().toISOString()
    },
    distribution: statistics.distribution,
    tierSummary: statistics.tierSummary
  };
}
