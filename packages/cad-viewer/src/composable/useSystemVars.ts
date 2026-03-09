import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  type AcDbColorTheme,
  AcDbDatabase,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'
import { reactive } from 'vue'

export const COLOR_THEME_SYSVAR_NAME = AcDbSystemVariables.COLORTHEME

export interface SystemVariables {
  pdmode?: number
  pdsize?: number
  colortheme?: AcDbColorTheme
}

function getDatabaseSysVarValue(database: AcDbDatabase, name: string): unknown {
  const manager = AcDbSysVarManager.instance()
  const value = manager.getVar(name, database)
  if (value !== undefined) return value

  const bag = database as unknown as Record<string, unknown>
  const lowerName = name.toLowerCase()
  return bag[lowerName] ?? bag[name]
}

export function normalizeColorTheme(value: unknown): AcDbColorTheme {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'dark' || normalized === '0' || normalized === 'false')
      return 'dark'
    if (normalized === 'light' || normalized === '1' || normalized === 'true')
      return 'light'
  }

  if (typeof value === 'number') {
    return value === 0 ? 'dark' : 'light'
  }

  if (typeof value === 'boolean') {
    return value ? 'light' : 'dark'
  }

  return 'dark'
}

export function getColorThemeFromDatabase(
  database: AcDbDatabase
): AcDbColorTheme {
  return normalizeColorTheme(
    getDatabaseSysVarValue(database, COLOR_THEME_SYSVAR_NAME)
  )
}

export function setColorThemeForDatabase(
  database: AcDbDatabase,
  theme: AcDbColorTheme
) {
  AcDbSysVarManager.instance().setVar(
    COLOR_THEME_SYSVAR_NAME,
    theme === 'dark' ? 0 : 1,
    database
  )
}

export function useSystemVars(editor: AcApDocManager) {
  const reactiveSystemVars = reactive<SystemVariables>({})
  const doc = editor.curDocument

  const reset = (doc: AcDbDatabase) => {
    reactiveSystemVars.pdmode = doc.pdmode
    reactiveSystemVars.pdsize = doc.pdsize
    reactiveSystemVars.colortheme = getColorThemeFromDatabase(doc)
  }
  reset(doc.database)

  AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
    const name = args.name.toLowerCase()
    if (name === COLOR_THEME_SYSVAR_NAME.toLowerCase()) {
      reactiveSystemVars.colortheme = normalizeColorTheme(args.newVal)
      return
    }

    // @ts-expect-error no good way to fix type errors here
    reactiveSystemVars[name] = args.database[name]
  })

  editor.events.documentActivated.addEventListener(args => {
    reset(args.doc.database)
  })

  return reactiveSystemVars
}
