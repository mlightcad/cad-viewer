import 'element-plus/dist/index.css'

import { i18n } from '@mlightcad/cad-editor/locale'
import { acedApplyUiTheme } from '@mlightcad/cad-simple-viewer/file-open-panel'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

import App from './App.vue'

/** Match MlCadViewer default so the landing page uses the same chrome tokens. */
const applyLandingTheme = () => {
  // Isolated hex tokens: Element Plus light CSS is already loaded and would
  // otherwise make non-isolated `--el-*` fallbacks resolve to light colours.
  acedApplyUiTheme('dark', document.documentElement, { isolated: true })
  document.documentElement.classList.add('dark', 'ml-theme-dark')
  document.documentElement.classList.remove('ml-theme-light')
}

const initApp = () => {
  applyLandingTheme()
  const app = createApp(App)
  // Required when Vite aliases `@mlightcad/ui-components` to source: those SFCs
  // use `<el-*>` tags without local imports (their own build auto-imports them).
  app.use(ElementPlus)
  app.use(i18n)
  app.mount('#app')
  // Hide the loading spinner
  const loader = document.getElementById('loader')
  if (loader) {
    loader.style.display = 'none'
  }
}

initApp()
