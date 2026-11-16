export default definePageConfig({
  // 自定义导航栏：页面内自己画返回键和标题
  navigationStyle: 'custom',
  // 页面容器背景色：避免切页瞬间容器默认浅色导致闪白
  backgroundColorContent: '#101014FF',
  enablePullDownRefresh: false
});
