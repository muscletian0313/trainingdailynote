import Taro from '@tarojs/taro';

/**
 * Taro 的交互/导航 API 在「用户取消」时（点击遮罩、点取消、返回失败等）会以
 * { errMsg: 'xxx:fail ...' } 这种**普通对象**拒绝返回的 Promise；即便传入了 fail 回调，
 * Promise 依然会 reject。若不做处理就会产生 unhandledrejection，
 * 预览环境会直接弹出「应用程序异常 / Error: [object Object]」。
 *
 * 这里统一包一层：捕获拒绝并降级为 warn 日志，避免无意义的异常弹窗。
 * 注意：getStorageSync 等同步 API 不涉及 Promise，无需包装。
 *
 * ⚠️ 平台限制（踩过的坑）：showModal 的 confirmText / cancelText 最多 4 个字符，
 * 超出会被直接拒绝并静默失败，务必保证文案不超过 4 个字。
 */

type ToastOption = Parameters<typeof Taro.showToast>[0];
type ModalOption = Parameters<typeof Taro.showModal>[0];
type ActionSheetOption = Parameters<typeof Taro.showActionSheet>[0];
type NavigateToOption = Parameters<typeof Taro.navigateTo>[0];
type RedirectToOption = Parameters<typeof Taro.redirectTo>[0];
type SwitchTabOption = Parameters<typeof Taro.switchTab>[0];
type NavigateBackOption = Parameters<typeof Taro.navigateBack>[0];
type NavigationBarTitleOption = Parameters<typeof Taro.setNavigationBarTitle>[0];

function ignoreRejection(reason: unknown): void {
  console.warn('[Taro] 交互已取消或调用失败（已忽略）:', reason);
}

export function showToast(options: ToastOption): void {
  Taro.showToast(options).catch(ignoreRejection);
}

export function showModal(options: ModalOption): void {
  Taro.showModal(options).catch(ignoreRejection);
}

export function showActionSheet(options: ActionSheetOption): void {
  Taro.showActionSheet(options).catch(ignoreRejection);
}

export function navigateTo(options: NavigateToOption): void {
  Taro.navigateTo(options).catch(ignoreRejection);
}

export function redirectTo(options: RedirectToOption): void {
  Taro.redirectTo(options).catch(ignoreRejection);
}

export function switchTab(options: SwitchTabOption): void {
  Taro.switchTab(options).catch(ignoreRejection);
}

export function navigateBack(options?: NavigateBackOption): void {
  Taro.navigateBack(options).catch(ignoreRejection);
}

export function setNavigationBarTitle(options: NavigationBarTitleOption): void {
  Taro.setNavigationBarTitle(options).catch(ignoreRejection);
}
