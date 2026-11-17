/**
 * 图片资源地址。
 *
 * - 器械图、食物分类图标体积小，随包内置
 * - 食物实拍图、缩略图、动作示范图放云开发「静态网站托管」：
 *   静态托管默认公开可读，不像云存储那样需要付费改权限，也不占包体积
 */
export const STATIC_BASE = 'https://rixunji-fight-d8gfo915aee0b48d1-1531127310.tcloudbaseapp.com';

export function cloudFile(name: string): string {
  return `/assets/${name}`;
}
