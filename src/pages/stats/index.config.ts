export default definePageConfig({
  // 页面容器背景色：避免切页瞬间容器默认浅色导致闪白
  backgroundColorContent: '#101014FF',
  navigationBarTitleText: '日历',
  enablePullDownRefresh: false,
  // 饮食弹层打开时用 PageMeta 锁住页面滚动
  enablePageMeta: true,
  // 餐次页是全屏弹层：禁掉系统左滑返回，改由弹层自己识别右滑手势
  disableSwipeBack: true
});
