export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/plans/index',
    'pages/exercises/index',
    'pages/stats/index',
    'pages/mine/index',
    'pages/session/index',
    'pages/plan-edit/index',
    'pages/plan-detail/index',
    'pages/record-detail/index',
    'pages/exercise-detail/index',
    'pages/onboarding/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    backgroundColor: '#101014',
    backgroundColorTop: '#101014',
    backgroundColorBottom: '#101014',
    navigationBarBackgroundColor: '#101014',
    navigationBarTitleText: '练记',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#6f6f7d',
    selectedColor: '#ff6b2c',
    backgroundColor: '#16161b',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '训练',
        iconPath: 'assets/tabbar/workout.png',
        selectedIconPath: 'assets/tabbar/workout-selected.png'
      },
      {
        pagePath: 'pages/plans/index',
        text: '计划',
        iconPath: 'assets/tabbar/plan.png',
        selectedIconPath: 'assets/tabbar/plan-selected.png'
      },
      {
        pagePath: 'pages/exercises/index',
        text: '动作',
        iconPath: 'assets/tabbar/exercise.png',
        selectedIconPath: 'assets/tabbar/exercise-selected.png'
      },
      {
        pagePath: 'pages/stats/index',
        text: '数据',
        iconPath: 'assets/tabbar/stats.png',
        selectedIconPath: 'assets/tabbar/stats-selected.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-selected.png'
      }
    ]
  }
})
