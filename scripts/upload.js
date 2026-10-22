/**
 * 上传体验版 + 生成预览二维码（一条命令搞定）
 *
 * 用法（在项目根目录执行）：
 *   node scripts/upload.js                 // 用 package.json 里的版本号
 *   node scripts/upload.js 1.0.108         // 指定版本号
 *   node scripts/upload.js 1.0.108 "本次改动说明"
 *
 * 产物：
 *   - 微信后台多一个开发版本（体验版可扫）
 *   - 项目根目录生成 preview-qrcode.png（真机预览二维码）
 */
const fs = require('fs');
const path = require('path');
const ci = require('miniprogram-ci');

const ROOT = path.resolve(__dirname, '..');
const APPID = 'wx039c3f34891faf11';
const PROJECT_PATH = path.join(ROOT, 'dist');
const PRIVATE_KEY = path.join(ROOT, '.auth', `private.${APPID}.key`);
const QR_PATH = path.join(ROOT, 'preview-qrcode.png');

/** package.json 可能被编辑器写成带 BOM，这里先清掉再解析 */
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8').replace(/^\uFEFF/, ''));
const version = process.argv[2] || pkg.version;
const desc = process.argv[3] || `练记 ${version}`;

(async () => {
  try {
    const project = new ci.Project({
      appid: APPID,
      type: 'miniProgram',
      projectPath: PROJECT_PATH,
      privateKeyPath: PRIVATE_KEY,
      ignores: ['node_modules/**/*']
    });

    await ci.upload({
      project,
      version,
      desc,
      setting: { es6: true, minify: true },
      onProgressUpdate: () => {}
    });
    console.log('UPLOAD DONE', version);

    await ci.preview({
      project,
      desc: `preview ${version}`,
      qrcodeFormat: 'image',
      qrcodeOutputDest: QR_PATH,
      setting: { es6: true, minify: true },
      onProgressUpdate: () => {}
    });
    console.log('QR DONE', QR_PATH);
  } catch (err) {
    console.log('ERROR', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
})();
