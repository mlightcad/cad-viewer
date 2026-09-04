import DefaultTheme from 'vitepress/theme'
import './custom.css'
import TouchPointAnimation from './components/TouchPointAnimation.vue'
import MagnifierAnimation from './components/MagnifierAnimation.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('TouchPointAnimation', TouchPointAnimation)
    app.component('MagnifierAnimation', MagnifierAnimation)
  },
}
