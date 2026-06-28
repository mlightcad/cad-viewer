import {
  AcApDocManager,
  type AcEdUiTheme,
  applyUiTheme,
  isLightColorTheme
} from '@mlightcad/cad-simple-viewer'
import {
  AcDbDatabase,
  AcDbSystemVariables,
  type AcDbSysVarEventArgs,
  AcDbSysVarManager
} from '@mlightcad/data-model'

export function readUiThemeFromHost(
  host: HTMLElement
): AcEdUiTheme | undefined {
  const attr = host.getAttribute('data-ml-ui-theme')
  if (attr === 'light' || attr === 'dark') return attr
  return undefined
}

export function readUiThemeFromDatabase(database: AcDbDatabase): AcEdUiTheme {
  const value = AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.COLORTHEME,
    database
  )
  return isLightColorTheme(value) ? 'light' : 'dark'
}

export class AcExUiThemeSync {
  private handleSysVarChanged = (args: AcDbSysVarEventArgs) => {
    const database = AcApDocManager.instance.curDocument?.database
    if (!database || args.database !== database) return
    if (
      args.name.toLowerCase() !== AcDbSystemVariables.COLORTHEME.toLowerCase()
    ) {
      return
    }
    this.applyTheme(isLightColorTheme(args.newVal) ? 'light' : 'dark')
  }

  private handleDocumentActivated = (args: {
    doc: { database: AcDbDatabase }
  }) => {
    this.applyTheme(readUiThemeFromDatabase(args.doc.database))
  }

  constructor(
    private readonly host: HTMLElement,
    private readonly onThemeChanged?: () => void
  ) {}

  start() {
    this.syncFromCurrentSource()
    AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(
      this.handleSysVarChanged
    )
    AcApDocManager.instance.events.documentActivated.addEventListener(
      this.handleDocumentActivated
    )
  }

  stop() {
    AcDbSysVarManager.instance().events.sysVarChanged.removeEventListener(
      this.handleSysVarChanged
    )
    AcApDocManager.instance.events.documentActivated.removeEventListener(
      this.handleDocumentActivated
    )
  }

  getTheme(): AcEdUiTheme {
    return readUiThemeFromHost(this.host) ?? 'dark'
  }

  setTheme(theme: AcEdUiTheme) {
    const database = AcApDocManager.instance.curDocument?.database
    if (database) {
      AcDbSysVarManager.instance().setVar(
        AcDbSystemVariables.COLORTHEME,
        theme === 'light' ? 1 : 0,
        database
      )
      return
    }
    this.applyTheme(theme)
  }

  private syncFromCurrentSource() {
    const database = AcApDocManager.instance.curDocument?.database
    if (database) {
      this.applyTheme(readUiThemeFromDatabase(database))
      return
    }
    const fromHost = readUiThemeFromHost(this.host)
    if (fromHost) return
  }

  private applyTheme(theme: AcEdUiTheme) {
    applyUiTheme(theme, this.host)
    this.onThemeChanged?.()
  }
}