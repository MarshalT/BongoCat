/**
 * 猫咪生成脚本 (ES模块版本)
 * 用于生成猫咪图片并保存
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// 导入基因解析函数
import { parseGene, getCatGeneDetails, getCatAppearanceStyle, getColorName } from '../src/utils/catGeneParser.js';
// 导入稀有度统计工具
import { printRarityStatistics, generateRarityCSV, getRarityJSON } from '../src/utils/rarityStatistics.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 为BigInt添加toJSON方法，解决序列化问题
if (typeof BigInt !== 'undefined') {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}

// 模拟EOS链上的函数
function tapos_block_num() {
  return Math.floor(Math.random() * 1000000) + 1;
}

function tapos_block_prefix() {
  return Math.floor(Math.random() * 0xFFFFFFFF);
}

function current_time_point() {
  return {
    sec_since_epoch: () => Math.floor(Date.now() / 1000)
  };
}

function get_self() {
  return {
    value: BigInt("5721397509932417024")
  };
}

function sha256(data, length) {
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = Math.floor(Math.random() * 256);
  }
  return {
    data: () => result
  };
}

// 生成随机种子
function random_seed() {
  let seed = BigInt(tapos_block_num() + tapos_block_prefix());
  seed = seed ^ BigInt(current_time_point().sec_since_epoch());
  seed = seed ^ get_self().value;
  
  const seedBuffer = new ArrayBuffer(8);
  new DataView(seedBuffer).setBigUint64(0, seed, true);
  const hash = sha256(seedBuffer, 8);
  
  let result = 0n;
  const hashData = hash.data();
  for (let i = 0; i < 8; i++) {
    result = result << 8n;
    result = result | BigInt(hashData[i]);
  }
  
  return result;
}

// 生成猫咪基因
function generate_genes() {
  const seed = random_seed();
  return seed;
}

// 生成指定数量的猫咪基因
function generate_multiple_genes(count) {
  const genes = [];
  
  for (let i = 0; i < count; i++) {
    let gene = Number(generate_genes() % 2n**53n);
    
    while (genes.includes(gene)) {
      gene = Number(generate_genes() % 2n**53n);
    }
    
    genes.push(gene);
  }
  
  return genes;
}

// 创建猫咪SVG字符串
function createCatSvg(gene, id) {
  // 获取猫咪外观 - 使用导入的函数
  const catAppearance = getCatAppearanceStyle(gene);

  console.log('catAppearance', JSON.stringify(catAppearance, null, 2));
  const uniqueId = `cat-${id}`;
  
  // 构建SVG
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="180" height="140" viewBox="0 0 180 140" xmlns="http://www.w3.org/2000/svg">
  <!-- 渲染猫咪 ${gene} -->
  
  <!-- Gradient definitions -->
  <defs>
    <linearGradient
      id="cat-body-gradient-${uniqueId}"
      x1="0%"
      y1="0%"
      x2="100%"
      y2="100%"
    >
      <stop
        offset="0%"
        style="stop-color:${catAppearance.colors.body1};stop-opacity:1"
      />
      <stop
        offset="100%"
        style="stop-color:${catAppearance.colors.body2};stop-opacity:1"
      />
    </linearGradient>

    <linearGradient
      id="cat-head-gradient-${uniqueId}"
      x1="0%"
      y1="0%"
      x2="100%"
      y2="100%"
    >
      <stop
        offset="0%"
        style="stop-color:${catAppearance.colors.body1};stop-opacity:1"
      />
      <stop
        offset="100%"
        style="stop-color:${catAppearance.colors.body2};stop-opacity:1"
      />
    </linearGradient>

    ${catAppearance.pattern.hasPattern ? `
    <pattern
      id="cat-pattern-${uniqueId}"
      width="20"
      height="20"
      patternUnits="userSpaceOnUse"
    >
      <rect
        width="20"
        height="20"
        fill="none"
      />
      ${catAppearance.pattern.type === 1 ? `
      <!-- Tiger stripes -->
      <path
        d="M0,0 L20,20"
        stroke="rgba(0,0,0,0.2)"
        stroke-width="4"
      />
      <path
        d="M20,0 L0,20"
        stroke="rgba(0,0,0,0.2)"
        stroke-width="4"
      />` : ''}
      ${catAppearance.pattern.type === 2 ? `
      <!-- Spots -->
      <circle
        cx="5"
        cy="5"
        r="3"
        fill="rgba(0,0,0,0.2)"
      />
      <circle
        cx="15"
        cy="15"
        r="3"
        fill="rgba(0,0,0,0.2)"
      />` : ''}
      ${catAppearance.pattern.type === 3 ? `
      <!-- Bi-color -->
      <rect
        x="0"
        y="0"
        width="10"
        height="20"
        fill="rgba(0,0,0,0.15)"
      />` : ''}
    </pattern>` : ''}
  </defs>

  <!-- Cat body -->
  <ellipse
    class="cat-body"
    cx="90"
    cy="95"
    rx="55"
    ry="40"
    fill="${catAppearance.pattern.hasPattern ? `url(#cat-pattern-${uniqueId})` : `url(#cat-body-gradient-${uniqueId})`}"
    stroke="${catAppearance.colors.stroke}"
    stroke-width="${catAppearance.fur.strokeWidth}"
  />

  <!-- Cat head -->
  <circle
    class="cat-head"
    cx="90"
    cy="60"
    r="38"
    fill="${catAppearance.pattern.hasPattern ? `url(#cat-pattern-${uniqueId})` : `url(#cat-head-gradient-${uniqueId})`}"
    stroke="${catAppearance.colors.stroke}"
    stroke-width="${catAppearance.fur.strokeWidth}"
  />

  <!-- Tail -->
  <path
    class="cat-tail"
    d="M30,90 Q35,60 45,80 Q55,95 40,105"
    fill="${catAppearance.pattern.hasPattern ? `url(#cat-pattern-${uniqueId})` : `url(#cat-body-gradient-${uniqueId})`}"
    stroke="${catAppearance.colors.stroke}"
    stroke-width="${catAppearance.fur.strokeWidth}"
    stroke-linecap="round"
  />

  <!-- Ears -->
  <path
    class="cat-body"
    d="${catAppearance.ears.left}"
    fill="${catAppearance.pattern.hasPattern ? `url(#cat-pattern-${uniqueId})` : `url(#cat-body-gradient-${uniqueId})`}"
    stroke="${catAppearance.colors.stroke}"
    stroke-width="${catAppearance.fur.strokeWidth}"
  />
  <path
    class="cat-body"
    d="${catAppearance.ears.right}"
    fill="${catAppearance.pattern.hasPattern ? `url(#cat-pattern-${uniqueId})` : `url(#cat-body-gradient-${uniqueId})`}"
    stroke="${catAppearance.colors.stroke}"
    stroke-width="${catAppearance.fur.strokeWidth}"
  />

  <!-- Inner ears -->
  <path
    class="cat-body"
    d="${catAppearance.ears.leftInner}"
    fill="${catAppearance.colors.ear}"
  />
  <path
    class="cat-body"
    d="${catAppearance.ears.rightInner}"
    fill="${catAppearance.colors.ear}"
  />

  <!-- Cheeks -->
  <ellipse
    class="cat-body"
    cx="65"
    cy="70"
    rx="12"
    ry="10"
    fill="${catAppearance.colors.ear}"
    opacity="0.6"
  />
  <ellipse
    class="cat-body"
    cx="115"
    cy="70"
    rx="12"
    ry="10"
    fill="${catAppearance.colors.ear}"
    opacity="0.6"
  />

  <!-- Eyes -->
  <g class="cat-eyes">
    <ellipse
      cx="75"
      cy="55"
      rx="9"
      ry="11"
      fill="white"
      stroke="#333"
      stroke-width="1.5"
    />
    <ellipse
      cx="105"
      cy="55"
      rx="9"
      ry="11"
      fill="white"
      stroke="#333"
      stroke-width="1.5"
    />

    <!-- Eye highlights -->
    <circle
      cx="73"
      cy="51"
      r="3"
      fill="white"
    />
    <circle
      cx="103"
      cy="51"
      r="3"
      fill="white"
    />

    <!-- Pupils -->
    <ellipse
      cx="75"
      cy="55"
      rx="4"
      ry="8"
      fill="${catAppearance.eyes.leftColor}"
    />
    <ellipse
      cx="105"
      cy="55"
      rx="4"
      ry="8"
      fill="${catAppearance.eyes.rightColor}"
    />
  </g>

  <!-- Nose -->
  <path
    class="cat-body"
    d="M87,65 Q90,67 93,65 L93,68 Q90,70 87,68 Z"
    fill="#ff9999"
    stroke="#d67979"
    stroke-width="0.5"
  />

  <!-- Mouth -->
  <path
    class="cat-body"
    d="M85,72 Q90,77 95,72"
    fill="none"
    stroke="#333"
    stroke-width="1.5"
  />
  <path
    class="cat-body"
    d="M90,68 L90,72"
    fill="none"
    stroke="#333"
    stroke-width="1"
  />

  <!-- Gene Info -->

</svg>`;
}
//  <text x="10" y="130" font-family="Arial" font-size="8" fill="#666">Gene: ${gene}</text>
// 保存SVG到文件
function saveSvgToFile(svgContent, fileName, outputDir) {
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 构建文件路径
  const filePath = path.join(outputDir, `${fileName}.svg`);
  
  // 写入文件
  fs.writeFileSync(filePath, svgContent, 'utf8');
  
  return filePath;
}

// 主函数
async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  const countArg = args.find(arg => /^\d+$/.test(arg));
  const count = countArg ? parseInt(countArg, 10) : 10;
  
  // 设置输出目录
  const OUTPUT_DIR = path.join(process.cwd(), 'generated_cats');
  
  console.log(`🐱 猫咪生成器 🐱`);
  console.log(`将生成 ${count} 只随机猫咪并保存为 SVG 文件`);
  
  // 生成多个猫咪基因
  const genes = generate_multiple_genes(count);
  
  // 用于存储所有猫咪信息
  const catsInfo = [];
  
  // 处理每个基因
  for (let i = 0; i < genes.length; i++) {
    const gene = genes[i];
    console.log(`处理基因 #${i+1}: ${gene}`);
    
    try {
      // 获取基因详情 - 使用导入的函数
      const details = getCatGeneDetails(gene);
      
      // 创建SVG内容
      const svgContent = createCatSvg(gene, `gene-${i+1}`);
      
      // 保存到文件
      const fileName = `cat-gene-${i+1}-${gene}`;
      const filePath = saveSvgToFile(svgContent, fileName, OUTPUT_DIR);
      
      // 存储猫咪信息
      catsInfo.push({ gene, details, filePath });
      
      console.log(`成功保存猫咪 #${i+1} 到 ${filePath}`);
    } catch (error) {
      console.error(`处理基因 ${gene} 时出错:`, error);
    }
  }
  
  // 打印摘要
  console.log('\n===== 猫咪生成摘要 =====');
  catsInfo.forEach((cat, index) => {
    console.log(`\n🐱 猫咪 #${index+1}:`);
    console.log(`基因值: ${cat.gene}`);
    console.log(`颜色: ${cat.details.baseColor}`);
    console.log(`毛发: ${cat.details.furLength}`);
    console.log(`耳朵: ${cat.details.earShape}`);
    console.log(`眼睛: ${cat.details.eyeColor}`);
    console.log(`花纹: ${cat.details.pattern}`);
    console.log(`稀有度: ${cat.details.rarity}`);
    console.log(`文件路径: ${cat.filePath}`);
  });
  // 使用新的统计工具生成详细的稀有度报告
  const statistics = printRarityStatistics(catsInfo, {
    showHeader: true,
    showDetailed: true,
    showTierSummary: true,
    showEconomicAnalysis: true,
    useEmojis: true
  });

  // 生成 CSV 和 JSON 数据文件（可选）
  try {
    const csvData = generateRarityCSV(statistics);
    const jsonData = getRarityJSON(statistics);

    // 保存统计数据到文件
    const statsDir = path.join(OUTPUT_DIR, 'statistics');
    if (!fs.existsSync(statsDir)) {
      fs.mkdirSync(statsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = path.join(statsDir, `rarity-distribution-${timestamp}.csv`);
    const jsonPath = path.join(statsDir, `rarity-distribution-${timestamp}.json`);

    fs.writeFileSync(csvPath, csvData, 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');

    console.log(`\n� 统计数据已保存:`);
    console.log(`CSV: ${csvPath}`);
    console.log(`JSON: ${jsonPath}`);
  } catch (error) {
    console.warn('保存统计数据时出错:', error.message);
  }

  console.log(`\n成功生成 ${catsInfo.length} 只猫咪，保存在 ${OUTPUT_DIR} 目录`);
}

// 执行主函数
main().catch(error => {
  console.error('生成过程中出错:', error);
  process.exit(1);
}); 