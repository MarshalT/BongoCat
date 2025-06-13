/**
 * 稀有度概率控制演示脚本
 * 展示不同分布策略的效果
 */

import { 
  calculateRarityWithStrategy, 
  RARITY_STRATEGIES, 
  getRarityDistributionInfo,
  getAvailableStrategies,
  calculateRarityStatistics,
  validateCustomProbabilities
} from '../src/utils/rarityController.js';

import { getRarityConfig } from '../src/utils/catGeneParser.js';

// 生成随机基因值
function generateRandomGene() {
  return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}

// 生成指定数量的猫咪并统计稀有度分布
function simulateRarityDistribution(count, strategy, customProbabilities = null) {
  console.log(`\n🎲 模拟 ${count} 只猫咪的稀有度分布 - 策略: ${strategy}`);
  
  const rarities = [];
  
  for (let i = 0; i < count; i++) {
    const gene = generateRandomGene();
    const rarity = calculateRarityWithStrategy(gene, strategy, customProbabilities);
    rarities.push(rarity);
  }
  
  return calculateRarityStatistics(rarities);
}

// 显示稀有度分布结果
function displayRarityResults(statistics, strategy) {
  const strategyInfo = getRarityDistributionInfo(strategy);
  
  console.log(`\n📊 ${strategyInfo.name} - ${strategyInfo.description}`);
  console.log(`总计: ${statistics.total} 只猫咪\n`);
  
  console.log('详细分布:');
  console.log('稀有度等级'.padEnd(15) + '数量'.padEnd(8) + '实际%'.padEnd(10) + '期望%'.padEnd(10) + '颜色');
  console.log('-'.repeat(60));
  
  statistics.distribution.forEach((item, index) => {
    const config = getRarityConfig(index);
    const expectedPercent = strategyInfo.probabilities[index].toFixed(2);
    
    console.log(
      config.name.padEnd(15) + 
      item.count.toString().padEnd(8) + 
      `${item.percentage}%`.padEnd(10) + 
      `${expectedPercent}%`.padEnd(10) + 
      config.color
    );
  });
  
  console.log('\n按稀有度层级汇总:');
  console.log(`普通 (Common): ${statistics.summary.common} 只`);
  console.log(`不常见 (Uncommon): ${statistics.summary.uncommon} 只`);
  console.log(`稀有 (Rare): ${statistics.summary.rare} 只`);
  console.log(`史诗 (Epic): ${statistics.summary.epic} 只`);
  console.log(`传奇 (Legendary): ${statistics.summary.legendary} 只`);
  console.log(`神话 (Mythical): ${statistics.summary.mythical} 只`);
}

// 比较不同策略的效果
function compareStrategies(count = 10000) {
  console.log('🔍 稀有度分布策略对比分析');
  console.log('='.repeat(80));
  
  const strategies = [
    RARITY_STRATEGIES.UNIFORM,
    RARITY_STRATEGIES.REALISTIC,
    RARITY_STRATEGIES.GENEROUS,
    RARITY_STRATEGIES.STRICT,
    RARITY_STRATEGIES.EVENT
  ];
  
  const results = {};
  
  strategies.forEach(strategy => {
    const statistics = simulateRarityDistribution(count, strategy);
    displayRarityResults(statistics, strategy);
    results[strategy] = statistics;
  });
  
  return results;
}

// 演示自定义概率分布
function demonstrateCustomDistribution() {
  console.log('\n🎨 自定义稀有度分布演示');
  console.log('='.repeat(50));
  
  // 自定义概率：更多传奇和神话级别的猫咪
  const customProbabilities = [
    20.0,  // Common
    15.0,  // Ordinary
    12.0,  // Uncommon
    10.0,  // Interesting
    8.0,   // Unusual
    7.0,   // Rare
    6.0,   // Scarce
    5.0,   // Curious
    4.0,   // Very Rare
    3.0,   // Ultra Rare
    3.0,   // Legendary
    2.5,   // Mythical
    2.0,   // Epic
    1.5,   // Unique
    0.5,   // Limited
    0.5    // Exclusive
  ];
  
  // 验证自定义概率
  const validation = validateCustomProbabilities(customProbabilities);
  console.log('自定义概率验证:', validation);
  
  if (validation.valid) {
    const statistics = simulateRarityDistribution(10000, RARITY_STRATEGIES.CUSTOM, customProbabilities);
    
    console.log('\n自定义分布结果:');
    console.log('稀有度等级'.padEnd(15) + '数量'.padEnd(8) + '实际%'.padEnd(10) + '期望%');
    console.log('-'.repeat(50));
    
    statistics.distribution.forEach((item, index) => {
      const config = getRarityConfig(index);
      const expectedPercent = customProbabilities[index].toFixed(2);
      
      console.log(
        config.name.padEnd(15) + 
        item.count.toString().padEnd(8) + 
        `${item.percentage}%`.padEnd(10) + 
        `${expectedPercent}%`
      );
    });
  }
}

// 分析稀有度对游戏经济的影响
function analyzeGameEconomyImpact(results) {
  console.log('\n💰 稀有度分布对游戏经济的影响分析');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([strategy, statistics]) => {
    const strategyInfo = getRarityDistributionInfo(strategy);
    const mythicalCount = statistics.summary.mythical;
    const legendaryCount = statistics.summary.legendary;
    const rareCount = statistics.summary.rare + statistics.summary.epic;
    
    console.log(`\n策略: ${strategyInfo.name}`);
    console.log(`- 神话级猫咪: ${mythicalCount} 只 (${(mythicalCount/statistics.total*100).toFixed(2)}%)`);
    console.log(`- 传奇级猫咪: ${legendaryCount} 只 (${(legendaryCount/statistics.total*100).toFixed(2)}%)`);
    console.log(`- 稀有级猫咪: ${rareCount} 只 (${(rareCount/statistics.total*100).toFixed(2)}%)`);
    
    // 计算稀缺性指数（神话和传奇级别的稀缺程度）
    const scarcityIndex = (mythicalCount + legendaryCount) / statistics.total * 100;
    console.log(`- 稀缺性指数: ${scarcityIndex.toFixed(3)}%`);
    
    // 经济建议
    if (scarcityIndex < 1) {
      console.log(`- 经济影响: 极高稀缺性，适合高价值NFT市场`);
    } else if (scarcityIndex < 3) {
      console.log(`- 经济影响: 高稀缺性，平衡的收集体验`);
    } else if (scarcityIndex < 5) {
      console.log(`- 经济影响: 中等稀缺性，适合大众市场`);
    } else {
      console.log(`- 经济影响: 低稀缺性，可能影响稀有猫咪价值`);
    }
  });
}

// 主函数
async function main() {
  console.log('🐱 猫咪稀有度概率控制演示 🐱');
  console.log('本演示将展示不同稀有度分布策略的效果\n');
  
  // 显示可用策略
  console.log('📋 可用的稀有度分布策略:');
  const availableStrategies = getAvailableStrategies();
  availableStrategies.forEach((strategy, index) => {
    console.log(`${index + 1}. ${strategy.name} - ${strategy.description}`);
  });
  
  // 比较不同策略
  const results = compareStrategies(10000);
  
  // 演示自定义分布
  demonstrateCustomDistribution();
  
  // 分析经济影响
  analyzeGameEconomyImpact(results);
  
  console.log('\n✅ 演示完成！');
  console.log('\n💡 使用建议:');
  console.log('- REALISTIC: 推荐用于正式游戏环境');
  console.log('- GENEROUS: 适合新手友好的活动期间');
  console.log('- STRICT: 适合高端收藏市场');
  console.log('- EVENT: 适合特殊活动和节日');
  console.log('- CUSTOM: 根据具体需求自定义');
}

// 执行演示
main().catch(error => {
  console.error('演示过程中出错:', error);
  process.exit(1);
});
