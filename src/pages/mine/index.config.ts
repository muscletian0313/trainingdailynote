export default definePageConfig({
  // 页面容器背景色：避免切页瞬间容器默认浅色导致闪白
  backgroundColorContent: '#101014FF',
  navigationBarTitleText: '我的',
  // page-meta 会覆盖全局导航栏配色，这里显式声明一次
  navigationBarBackgroundColor: '#101014',
  navigationBarTextStyle: 'white',
  enablePullDownRefresh: false,
  // 浮层打开时用 PageMeta 锁住页面滚动
  enablePageMeta: true
});
