/**
 * 图片资源地址。
 *
 * 说明：原本计划把器械图、食物图放微信云开发的云存储，
 * 但云存储的「所有用户可读」属于付费能力（需 199 元/月套餐），
 * 免费体验期无法开启，普通用户会读不到图，因此改回打包内置：
 * - 器械图随主包（首页计划卡要用）
 * - 食物图随饮食分包（只有饮食页展示，不占主包）
 */
export function cloudFile(name: string): string {
  if (name.startsWith('foods-photo/')) {
    return `/subpackages/diet/assets/${name}`;
  }
  return `/assets/${name}`;
}
