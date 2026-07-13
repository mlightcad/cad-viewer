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

/**
 * Reads the UI theme from a host element's `data-ml-ui-theme` attribute.
 *
 * @param host - Viewer host element.
 * @returns `'light'`, `'dark'`, or `undefined` when unset or invalid.
 */
export function readUiThemeFromHost(
  host: HTMLElement
): AcEdUiTheme | undefined {
  const attr = host.getAttribute('data-ml-ui-theme')
  if (attr === 'light' || attr === 'dark') return attr
  return undefined
}

/**
 * Reads the UI theme from the drawing `COLORTHEME` system variable.
 *
 * @param database - Drawing database.
 */
export function readUiThemeFromDatabase(database: AcDbDatabase): AcEdUiTheme {
  const value = AcDbSysVarManager.instance().getVar(
    AcDbSystemVariables.COLORTHEME,
    database
  )
  return isLightColorTheme(value) ? 'light' : 'dark'
}

/**
 * Keeps `data-ml-ui-theme` on the host in sync with `COLORTHEME` and document activation.
 */
export class AcExUiThemeSync {
  /** Applies theme when `COLORTHEME` changes on the active database. */
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

  /** Applies theme from a newly activated document's database. */
  private handleDocumentActivated = (args: {
    doc: { database: AcDbDatabase }
  }) => {
    this.applyTheme(readUiThemeFromDatabase(args.doc.database))
  }

  /**
   * @param host - Element receiving `applyUiTheme` and `data-ml-ui-theme`.
   * @param onThemeChanged - Optional callback after each theme application (e.g. toolbar refresh).
   */
  constructor(
    private readonly host: HTMLElement,
    private readonly onThemeChanged?: () => void
  ) {}

  /** Subscribes to sysvar and document events and performs an initial sync. */
  start() {
    this.syncFromCurrentSource()

    AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(
      this.handleSysVarChanged
    )
    AcApDocManager.instance.events.documentActivated.addEventListener(
      this.handleDocumentActivated
    )
  }

  /** Unsubscribes from sysvar and document events. */
  stop() {
    AcDbSysVarManager.instance().events.sysVarChanged.removeEventListener(
      this.handleSysVarChanged
    )
    AcApDocManager.instance.events.documentActivated.removeEventListener(
      this.handleDocumentActivated
    )
  }

  /**
   * Returns the theme currently applied on the host.
   *
   * Defaults to `'dark'` when the attribute is missing.
   */
  getTheme(): AcEdUiTheme {
    return readUiThemeFromHost(this.host) ?? 'dark'
  }

  /**
   * Sets the UI theme via `COLORTHEME` when a document is open, otherwise on the host.
   *
   * @param theme - Target light or dark theme.
   */
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

  /**
   * Applies theme from the active document or existing host attribute on startup.
   */
  private syncFromCurrentSource() {
    const database = AcApDocManager.instance.curDocument?.database
    if (database) {
      this.applyTheme(readUiThemeFromDatabase(database))
      return
    }

    const fromHost = readUiThemeFromHost(this.host)
    if (fromHost) return
  }

  /**
   * Calls {@link applyUiTheme} and notifies {@link onThemeChanged}.
   *
   * @param theme - Theme to apply.
   */
  private applyTheme(theme: AcEdUiTheme) {
    applyUiTheme(theme, this.host)
    this.onThemeChanged?.()
  }
}
