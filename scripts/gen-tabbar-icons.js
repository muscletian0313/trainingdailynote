/**
 * 生成底部 tabBar 图标（实心硬朗风）
 *
 * 用法：
 *   npm i --no-save sharp        （sharp 只用于这个脚本，不写进依赖）
 *   node scripts/gen-tabbar-icons.js
 * 产物：src/assets/tabbar/*.svg + *.png（81×81，灰 / 橙两态）
 *
 * 四个图标的「视觉分量」要接近：暗色底上大小差一倍会显得很乱，
 * 所以每个图标单独给了缩放，把墨量拉齐到同一档。
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT_DIR = path.resolve(__dirname, '../src/assets/tabbar');
const GREY = '#6f6f7d';
const ORANGE = '#ff6b2c';
/** tabBar 背景色：日历图标里「挖空」的窗口要跟底色一致 */
const TABBAR_BG = '#16161b';

/** 图标主体 + 单独的视觉缩放（围绕 24×24 中心） */
const ICONS = {
  workout: {
    scale: 1,
    body: `
      <rect x="3.4" y="6.2" width="4.4" height="11.6" rx="2.2" />
      <rect x="16.2" y="6.2" width="4.4" height="11.6" rx="2.2" />
      <rect x="7.8" y="10.2" width="8.4" height="3.6" rx="1.8" />
    `
  },
  exercise: {
    scale: 1,
    body: `
      <circle cx="12" cy="4.5" r="2.3" />
      <rect x="10.1" y="7.4" width="3.8" height="6.4" rx="1.9" />
      <rect x="6.4" y="7.8" width="2.2" height="5.6" rx="1.1" transform="rotate(-12 7.5 10.6)" />
      <rect x="15.4" y="7.8" width="2.2" height="5.6" rx="1.1" transform="rotate(12 16.5 10.6)" />
      <rect x="9.3" y="13.2" width="2.2" height="6" rx="1.1" transform="rotate(-5 10.4 16.2)" />
      <rect x="12.5" y="13.2" width="2.2" height="6" rx="1.1" transform="rotate(5 13.6 16.2)" />
    `
  },
  stats: {
    scale: 0.82,
    body: `
      <rect x="3.2" y="4.6" width="17.6" height="15.6" rx="3.2" />
      <rect x="6.4" y="9.8" width="11.2" height="7.2" rx="1.8" fill="${TABBAR_BG}" />
      <rect x="7.6" y="2.8" width="2.2" height="3.6" rx="1.1" />
      <rect x="14.2" y="2.8" width="2.2" height="3.6" rx="1.1" />
    `
  },
  mine: {
    scale: 0.95,
    body: `
      <circle cx="12" cy="7.6" r="3.8" />
      <path d="M12 12.8c-3.9 0-7 2.7-7 6.2v1.2h14v-1.2c0-3.5-3.1-6.2-7-6.2z" />
    `
  }
};

function svgOf(name, color) {
  const icon = ICONS[name];
  const transform =
    icon.scale === 1 ? '' : ` transform="translate(12 12) scale(${icon.scale}) translate(-12 -12)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><g${transform}>${icon.body}</g></svg>\n`;
}

(async () => {
  for (const name of Object.keys(ICONS)) {
    for (const [suffix, color] of [
      ['', GREY],
      ['-selected', ORANGE]
    ]) {
      const svg = svgOf(name, color);
      const base = path.join(OUT_DIR, `${name}${suffix}`);
      fs.writeFileSync(`${base}.svg`, svg);
      // 渲染成 81×81：微信建议的 tabBar 图标尺寸
      await sharp(Buffer.from(svg.replace('<svg ', '<svg width="81" height="81" ')))
        .png()
        .toFile(`${base}.png`);
    }
  }
  console.log('tabbar icons done');
})();
