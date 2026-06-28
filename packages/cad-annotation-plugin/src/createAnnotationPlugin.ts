import {
  AcApContext,
  AcApDocManager,
  AcApI18n,
  type AcApPlugin,
  AcEdCommandStack
} from '@mlightcad/cad-simple-viewer'

import packageJson from '../package.json'
import {
  getAnnotationServices,
  resetAnnotationServices
} from './AcApAnnotationServices'
import {
  AcApAnArrowCmd,
  AcApAnAudioCmd,
  AcApAnCloudCmd,
  AcApAnEllipseCmd,
  AcApAnImageCmd,
  AcApAnLeaderCmd,
  AcApAnLineCmd,
  AcApAnnBookmarkCmd,
  AcApAnnExportCmd,
  AcApAnnImportCmd,
  AcApAnnPanelCmd,
  AcApAnnVisCmd,
  AcApAnRectCmd,
  AcApAnSketchCmd,
  AcApAnTextCmd,
  AcApAnVideoCmd} from './command'
import { AcExAnnotationI18n, registerAnnotationI18n } from './i18n'
import { AcExUiThemeSync } from './theme'
import { AcExAnnotationShell } from './ui/AcExAnnotationShell'
import { removeAnnotationStylesIfUnused } from './ui/styles'

export const ANNOTATION_PLUGIN_NAME = 'AnnotationPlugin'

export interface AcExAnnotationPluginOptions {
  host?: HTMLElement
}

export class AcApAnnotationPlugin implements AcApPlugin {
  name = ANNOTATION_PLUGIN_NAME
  version = packageJson.version
  description = 'JSON-based drawing annotations with toolbar and panel UI'

  private themeSync?: AcExUiThemeSync
  private i18n?: AcExAnnotationI18n
  private registeredCommands: Array<{ group: string; name: string }> = []

  private handleLocaleChanged = () => {
    getAnnotationServices().shell?.refresh()
  }

  private handleDocumentActivated = () => {
    const doc = AcApDocManager.instance.curDocument
    const view = AcApDocManager.instance.curView
    if (!doc || !view) return
    const services = getAnnotationServices()
    services.bindDocument({ doc, view } as unknown as AcApContext)
  }

  private handleDocumentToBeOpened = () => {
    getAnnotationServices().renderer.clear()
  }

  constructor(private readonly options: AcExAnnotationPluginOptions = {}) {}

  onLoad(_context: AcApContext, commandManager: AcEdCommandStack): void {
    registerAnnotationI18n()
    const services = getAnnotationServices()

    const host =
      this.options.host ??
      AcApDocManager.instance.curView?.container ??
      document.body

    this.themeSync = new AcExUiThemeSync(host, () => services.shell?.refresh())
    this.themeSync.start()

    this.i18n = new AcExAnnotationI18n()
    AcApI18n.events.localeChanged.addEventListener(this.handleLocaleChanged)

    services.shell = new AcExAnnotationShell(host, this.i18n, services)

    const group = AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME
    const register = (
      name: string,
      cmd: InstanceType<
        | typeof AcApAnTextCmd
        | typeof AcApAnnVisCmd
      >
    ) => {
      commandManager.addCommand(group, name, name, cmd)
      this.registeredCommands.push({ group, name })
    }

    register('anntext', new AcApAnTextCmd())
    register('anleader', new AcApAnLeaderCmd())
    register('anarrow', new AcApAnArrowCmd())
    register('anline', new AcApAnLineCmd())
    register('anrect', new AcApAnRectCmd())
    register('anellipse', new AcApAnEllipseCmd())
    register('ancloud', new AcApAnCloudCmd())
    register('ansketch', new AcApAnSketchCmd())
    register('animage', new AcApAnImageCmd())
    register('anvideo', new AcApAnVideoCmd())
    register('anaudio', new AcApAnAudioCmd())
    register('annvis', new AcApAnnVisCmd())
    register('annexport', new AcApAnnExportCmd())
    register('annimport', new AcApAnnImportCmd())
    register('annpanel', new AcApAnnPanelCmd())
    register('annbookmark', new AcApAnnBookmarkCmd())

    AcApDocManager.instance.events.documentActivated.addEventListener(
      this.handleDocumentActivated
    )
    AcApDocManager.instance.events.documentToBeOpened.addEventListener(
      this.handleDocumentToBeOpened
    )

    if (AcApDocManager.instance.curDocument && AcApDocManager.instance.curView) {
      this.handleDocumentActivated()
    }
  }

  onUnload(_context: AcApContext, commandManager: AcEdCommandStack): void {
    AcApI18n.events.localeChanged.removeEventListener(this.handleLocaleChanged)
    AcApDocManager.instance.events.documentActivated.removeEventListener(
      this.handleDocumentActivated
    )
    AcApDocManager.instance.events.documentToBeOpened.removeEventListener(
      this.handleDocumentToBeOpened
    )

    for (const cmd of this.registeredCommands) {
      commandManager.removeCmd(cmd.group, cmd.name)
    }
    this.registeredCommands = []

    resetAnnotationServices()
    this.themeSync?.stop()
    this.themeSync = undefined
    this.i18n = undefined
    removeAnnotationStylesIfUnused()
  }
}

export function createAnnotationPlugin(
  options: AcExAnnotationPluginOptions = {}
): AcApAnnotationPlugin {
  return new AcApAnnotationPlugin(options)
}