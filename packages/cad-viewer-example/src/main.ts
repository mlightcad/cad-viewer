import 'element-plus/dist/index.css'
import 'element-plus/dist/index.css'

import { i18n } from '@mlightcad/cad-viewer'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

import App from './App.vue'

const initApp = () => {
  const app = createApp(App)
  app.use(i18n)
  app.use(ElementPlus)
  app.mount('#app')

  // Hide the loading spinner
  const loader = document.getElementById('loader')
  if (loader) {
    loader.style.display = 'none'
  }
}

initApp()
