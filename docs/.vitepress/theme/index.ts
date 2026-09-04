import DefaultTheme from 'vitepress/theme'
import './custom.css'
import TouchPointAnimation from './components/TouchPointAnimation.vue'
import MagnifierAnimation from './components/MagnifierAnimation.vue'
import WriteModeLayout from './components/WriteModeLayout.vue'
import ReviewModeLayout from './components/ReviewModeLayout.vue'
import MobileBottomTabBar from './components/MobileBottomTabBar.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('TouchPointAnimation', TouchPointAnimation)
    app.component('MagnifierAnimation', MagnifierAnimation)
    app.component('WriteModeLayout', WriteModeLayout)
    app.component('ReviewModeLayout', ReviewModeLayout)
    app.component('MobileBottomTabBar', MobileBottomTabBar)
  },
}
