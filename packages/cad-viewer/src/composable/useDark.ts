import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcDbDatabase, AcDbSysVarManager } from '@mlightcad/data-model'
import {
  type AcDbColorTheme,
  AcDbSystemVariables
} from '@mlightcad/data-model/src/database/AcDbSystemVariables'
import { computed, ref } from 'vue'

import {
  getColorThemeFromDatabase,
  setColorThemeForDatabase
} from './useSystemVars'

const currentTheme = ref<AcDbColorTheme>('dark')
let isThemeSyncInitialized = false

function applyThemeToDom(theme: AcDbColorTheme) {
  if (typeof document === 'undefined') return

  const html = document.documentElement
  html.classList.toggle('dark', theme === 'dark')
}

function updateCurrentTheme(theme: AcDbColorTheme) {
  currentTheme.value = theme
  applyThemeToDom(theme)
}

function getExistingDocManager(): AcApDocManager | null {
  const singleton = AcApDocManager as unknown as {
    _instance?: AcApDocManager
  }
  return singleton._instance ?? null
}

function getCurrentDatabase(): AcDbDatabase | null {
  return getExistingDocManager()?.curDocument?.database ?? null
}

function syncThemeFromDatabase(database: AcDbDatabase | null) {
  if (!database) return
  updateCurrentTheme(getColorThemeFromDatabase(database))
}

export function ensureColorThemeSync() {
  if (isThemeSyncInitialized) return

  const docManager = getExistingDocManager()
  if (!docManager) return

  isThemeSyncInitialized = true
  syncThemeFromDatabase(getCurrentDatabase())

  AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
    if (
      args.name.toLowerCase() !== AcDbSystemVariables.COLORTHEME.toLowerCase()
    ) {
      return
    }
    updateCurrentTheme(getColorThemeFromDatabase(args.database))
  })

  docManager.events.documentActivated.addEventListener(args => {
    syncThemeFromDatabase(args.doc.database)
  })
}

export function setColorTheme(
  theme: AcDbColorTheme,
  database?: AcDbDatabase | null
) {
  updateCurrentTheme(theme)

  ensureColorThemeSync()

  const targetDatabase = database ?? getCurrentDatabase()
  if (!targetDatabase) return

  if (getColorThemeFromDatabase(targetDatabase) === theme) return
  setColorThemeForDatabase(targetDatabase, theme)
}

export const isDark = computed<boolean>({
  get: () => currentTheme.value === 'dark',
  set: value => {
    setColorTheme(value ? 'dark' : 'light')
  }
})

export const toggleDark = () => {
  setColorTheme(isDark.value ? 'light' : 'dark')
}

applyThemeToDom(currentTheme.value)
