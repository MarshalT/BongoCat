/**
 * 猫咪生成脚本
 * 用于生成猫咪图片并保存
 */

import path from 'path';
import fs from 'fs';

// 声明全局类型以避免TypeScript错误
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// 为BigInt添加toJSON方法，解决序列化问题
if (typeof BigInt !== 'undefined') {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}

// 模拟EOS链上的函数
function tapos_block_num(): number {
  return Math.floor(Math.random() * 1000000) + 1;
}

function tapos_block_prefix(): number {
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

function sha256(data: any, length: number): { data: () => Uint8Array } {
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = Math.floor(Math.random() * 256);
  }
  return {
    data: () => result
  };
}

// 生成随机种子
function random_seed(): bigint {
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
function generate_genes(): bigint {
  const seed = random_seed();
  return seed;
}

// 生成指定数量的猫咪基因
function generate_multiple_genes(count: number): number[] {
  const genes: number[] = [];
  
  for (let i = 0; i < count; i++) {
    let gene = Number(generate_genes() % 2n**53n);
    
    while (genes.includes(gene)) {
      gene = Number(generate_genes() % 2n**53n);
    }
    
    genes.push(gene);
  }
  
  return genes;
}

// 基因解析结果接口
interface GeneParseResult {
  appearance: {
    baseColor: number
    furLength: number
    earShape: number
    eyeColor: number
    pattern: number
  }
  attributes: {
    personality: number
    rarity: number
    growthPotential: number
    staminaRecovery: number
    luck: number
  }
  specialAbilities: {
    abilities: number
    hiddenTrait: boolean
  }
}

// 猫咪外观样式接口
interface CatAppearance {
  colors: {
    body1: string
    body2: string
    ear: string
    stroke: string
  }
  ears: {
    left: string
    right: string
    leftInner: string
    rightInner: string
  }
  eyes: {
    leftColor: string
    rightColor: string
  }
  fur: {
    type: string
    strokeWidth: number
  }
  pattern: {
    type: number
    hasPattern: boolean
  }
}

// 基因解析函数
function parseGene(gene: number): GeneParseResult {
  const appearance = {
    baseColor: gene % 7,
    furLength: (gene >> 4) & 0x3,
    earShape: (gene >> 6) & 0x3,
    eyeColor: (gene >> 8) & 0x7,
    pattern: (gene >> 11) & 0xF,
  };

  const attributes = {
    personality: (gene >> 15) & 0x7,
    rarity: (gene >> 18) & 0xF,
    growthPotential: 50 + ((gene >> 22) & 0x3F) * 100 / 63,
    staminaRecovery: 0.5 + ((gene >> 28) & 0x7) / 10,
    luck: 1 + ((gene >> 31) & 0x9),
  };

  const specialAbilities = {
    abilities: (gene >> 40) & 0xFF,
    hiddenTrait: ((gene >> 48) & 0xFFFF) === 0x1234,
  };

  return {
    appearance,
    attributes,
    specialAbilities,
  };
}

// 获取猫咪外观样式
function getCatAppearanceStyle(gene: number): CatAppearance {
  const parsedGene = parseGene(gene);

  // 基础颜色
  const baseColorIndex = parsedGene.appearance.baseColor;
  const colorSchemes = [
    { // 橙色系
      body1: '#ffb84d',
      body2: '#e67700',
      ear: '#ffb380',
      stroke: '#e09112',
    },
    { // 灰色系
      body1: '#b3b3cc',
      body2: '#666699',
      ear: '#d1d1e0',
      stroke: '#666699',
    },
    { // 棕色系
      body1: '#bf8040',
      body2: '#734d26',
      ear: '#d2a679',
      stroke: '#734d26',
    },
    { // 白色系
      body1: '#ffffff',
      body2: '#e6e6e6',
      ear: '#f2f2f2',
      stroke: '#cccccc',
    },
    { // 黄色系
      body1: '#ffff99',
      body2: '#e6e600',
      ear: '#ffffb3',
      stroke: '#e6e600',
    },
    { // 黑色系
      body1: '#666666',
      body2: '#1a1a1a',
      ear: '#808080',
      stroke: '#333333',
    },
    { // 蓝灰系
      body1: '#99ccff',
      body2: '#3399ff',
      ear: '#cce6ff',
      stroke: '#3399ff',
    },
  ];
  const colorScheme = colorSchemes[baseColorIndex];

  // 耳朵形状
  const earShapeIndex = parsedGene.appearance.earShape;
  const earShapes = [
    { // 正常
      left: 'M65,35 L60,10 Q75,15 85,30',
      right: 'M115,35 L120,10 Q105,15 95,30',
      leftInner: 'M67,30 L65,15 Q75,20 80,28',
      rightInner: 'M113,30 L115,15 Q105,20 100,28',
    },
    { // 下折
      left: 'M65,35 L60,20 Q65,10 75,15 Q80,25 85,30',
      right: 'M115,35 L120,20 Q115,10 105,15 Q100,25 95,30',
      leftInner: 'M67,30 L65,20 Q70,15 75,18 Q78,25 80,28',
      rightInner: 'M113,30 L115,20 Q110,15 105,18 Q102,25 100,28',
    },
    { // 上折
      left: 'M65,35 L55,15 Q65,5 75,10 Q80,20 85,30',
      right: 'M115,35 L125,15 Q115,5 105,10 Q100,20 95,30',
      leftInner: 'M67,30 L60,18 Q65,10 72,13 Q76,20 80,28',
      rightInner: 'M113,30 L120,18 Q115,10 108,13 Q104,20 100,28',
    },
    { // 圆形
      left: 'M65,35 Q55,20 60,10 Q70,5 80,15 Q85,25 85,30',
      right: 'M115,35 Q125,20 120,10 Q110,5 100,15 Q95,25 95,30',
      leftInner: 'M67,30 Q60,20 62,15 Q70,10 75,18 Q78,25 80,28',
      rightInner: 'M113,30 Q120,20 118,15 Q110,10 105,18 Q102,25 100,28',
    },
  ];
  const earShape = earShapes[earShapeIndex];

  // 眼睛颜色
  const eyeColorIndex = parsedGene.appearance.eyeColor;
  const eyeColors = [
    '#4CAF50', // 绿色
    '#2196F3', // 蓝色
    '#FFEB3B', // 黄色
    '#795548', // 棕色
    '#FF9800', // 琥珀色
    '#9C27B0', // 紫色 (异色瞳时左眼)
    '#607D8B', // 灰色
    '#673AB7', // 紫色
  ];
  // 异色瞳特殊处理
  const leftEyeColor = eyeColorIndex === 5 ? eyeColors[5] : eyeColors[eyeColorIndex];
  const rightEyeColor = eyeColorIndex === 5 ? eyeColors[0] : eyeColors[eyeColorIndex];

  // 毛发长度
  const furLengthIndex = parsedGene.appearance.furLength;
  // 0-短毛，1-中毛，2-长毛，3-卷毛
  const furLength = ['short', 'medium', 'long', 'curly'][furLengthIndex];

  // 花纹
  const patternIndex = parsedGene.appearance.pattern;
  // 花纹样式，0表示无花纹
  const hasPattern = patternIndex > 0;

  return {
    colors: colorScheme,
    ears: earShape,
    eyes: {
      leftColor: leftEyeColor,
      rightColor: rightEyeColor,
    },
    fur: {
      type: furLength,
      strokeWidth: furLengthIndex === 0
        ? 1.5
        : furLengthIndex === 1
          ? 2
          : furLengthIndex === 2 ? 2.5 : 3,
    },
    pattern: {
      type: patternIndex,
      hasPattern,
    },
  };
}

// 创建猫咪SVG字符串
function createCatSvg(gene: number, id: string): string {
  // 获取猫咪外观
  const catAppearance = getCatAppearanceStyle(gene);
  const uniqueId = `cat-${id}`;
  
  // 构建SVG字符串（略，因为过长，实际实现中完整保留）
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
  <text x="10" y="130" font-family="Arial" font-size="8" fill="#666">Gene: ${gene}</text>
</svg>`;
}

// 保存SVG到文件
function saveSvgToFile(svgContent: string, fileName: string, outputDir: string): string {
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

// 获取猫咪详情
function getCatDetails(gene: number): any {
  const parsedGene = parseGene(gene);
  const colorNames = ['橙色系', '灰色系', '棕色系', '白色系', '黄色系', '黑色系', '蓝灰系'];
  const furLengthNames = ['短毛', '中等长度', '长毛', '卷毛'];
  const earShapeNames = ['正常', '下折', '上折', '圆形'];
  const eyeColorNames = ['绿色', '蓝色', '黄色', '棕色', '琥珀色', '异色', '灰色', '紫色'];
  const patternNames = ['无花纹', '虎斑', '斑点', '双色', '三色', '玳瑁', '重点色', '烟色', '银色', '云纹', '大理石纹', '环纹', '扁平面纹', '条形', '单色', '特殊图案'];
  const personalityNames = ['活泼', '温顺', '好奇', '独立', '谨慎', '勇敢', '调皮', '高冷'];
  const rarityNames = ['普通', '常见', '少见', '有趣', '不寻常', '稀有', '罕见', '珍奇', '非常稀有', '超稀有', '传奇', '神话', '史诗', '独特', '限量', '绝版'];

  return {
    baseColor: colorNames[parsedGene.appearance.baseColor],
    furLength: furLengthNames[parsedGene.appearance.furLength],
    earShape: earShapeNames[parsedGene.appearance.earShape],
    eyeColor: eyeColorNames[parsedGene.appearance.eyeColor],
    pattern: patternNames[parsedGene.appearance.pattern],
    personality: `${personalityNames[parsedGene.attributes.personality]}型`,
    rarity: rarityNames[parsedGene.attributes.rarity],
    growthPotential: `${Math.round(parsedGene.attributes.growthPotential)}%`,
    staminaRecovery: `${parsedGene.attributes.staminaRecovery.toFixed(1)}x`,
    luck: parsedGene.attributes.luck.toFixed(0),
    rawGene: parsedGene,
  };
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
  const catsInfo: { gene: number; details: any; filePath: string }[] = [];
  
  // 处理每个基因
  for (let i = 0; i < genes.length; i++) {
    const gene = genes[i];
    console.log(`处理基因 #${i+1}: ${gene}`);
    
    try {
      // 获取基因详情
      const details = getCatDetails(gene);
      
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
  
  console.log(`\n成功生成 ${catsInfo.length} 只猫咪，保存在 ${OUTPUT_DIR} 目录`);
}

// 执行主函数
main().catch(error => {
  console.error('生成过程中出错:', error);
  process.exit(1);
}); 