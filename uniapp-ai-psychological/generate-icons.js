const sharp = require('sharp');
const path = require('path');

const ICON_SIZE = 81;
const OUTPUT_DIR = path.join(__dirname, 'src', 'static', 'icons');

// 颜色配置
const COLORS = {
  normal: '#909399',
  active: '#4A90D9'
};

// 图标SVG模板
const iconSVGs = {
  // 首页 - 房子图标
  home: (color) => `
    <svg width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  // AI陪伴 - 对话气泡图标
  chat: (color) => `
    <svg width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  // 日记 - 笔记本图标
  diary: (color) => `
    <svg width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7 7H7.01M7 12H7.01M7 17H7.01M12 7H17M12 12H17M12 17H17" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  // 知识库 - 书本图标
  book: (color) => `
    <svg width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6.5 2H20V22H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 6H16M12 10H16M12 14H16" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  // 我的 - 人物图标
  mine: (color) => `
    <svg width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 21C20 17.134 16.4183 14 12 14C7.58172 14 4 17.134 4 21" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `
};

async function generateIcon(name, svgContent, filename) {
  try {
    const outputPath = path.join(OUTPUT_DIR, filename);
    await sharp(Buffer.from(svgContent))
      .resize(ICON_SIZE, ICON_SIZE)
      .png()
      .toFile(outputPath);
    console.log(`✓ 已生成: ${filename}`);
  } catch (error) {
    console.error(`✗ 生成失败 ${filename}:`, error.message);
  }
}

async function main() {
  console.log('开始生成 TabBar 图标...\n');
  console.log(`图标尺寸: ${ICON_SIZE}x${ICON_SIZE}px`);
  console.log(`输出目录: ${OUTPUT_DIR}\n`);

  const icons = ['home', 'chat', 'diary', 'book', 'mine'];

  for (const iconName of icons) {
    const svgGenerator = iconSVGs[iconName];
    if (!svgGenerator) {
      console.warn(`⚠ 未找到图标: ${iconName}`);
      continue;
    }

    // 生成普通状态
    await generateIcon(iconName, svgGenerator(COLORS.normal), `${iconName}.png`);
    // 生成激活状态
    await generateIcon(iconName, svgGenerator(COLORS.active), `${iconName}-active.png`);
  }

  console.log('\n✅ 所有图标生成完成！');
}

main().catch(console.error);
