const fs = require('fs');
const path = require('path');

// 检查是否安装了 sharp
try {
  const sharp = require('sharp');
  
  const inputFile = path.join(__dirname, '../public/icon.png');
  const outputDir = path.join(__dirname, '../public');
  
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];
  
  async function generateIcons() {
    for (const { name, size } of sizes) {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, name));
      console.log(`✓ 生成 ${name}`);
    }
    console.log('✅ 所有图标生成完成！');
  }
  
  generateIcons().catch(err => {
    console.error('❌ 生成图标失败:', err.message);
    console.log('💡 请运行: npm install sharp --save-dev');
  });
  
} catch (err) {
  console.log('⚠️  未安装 sharp 包');
  console.log('💡 可选：运行 npm install sharp --save-dev 来生成不同尺寸的图标');
  console.log('✓  当前使用原始图片作为所有尺寸的图标');
}
