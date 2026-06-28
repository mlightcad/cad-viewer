import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

import type { AcApAnnotationServices } from '../AcApAnnotationServices'
import type { AcExAnnotationI18n } from '../i18n'
import { AcExAnnotationPanel } from './AcExAnnotationPanel'
import { AcExAnnotationPropertyBar } from './AcExAnnotationPropertyBar'
import { AcExAnnotationToolbar } from './AcExAnnotationToolbar'

export class AcExAnnotationShell {
  private toolbar: AcExAnnotationToolbar
  private propertyBar: AcExAnnotationPropertyBar
  private panel: AcExAnnotationPanel

  constructor(
    host: HTMLElement,
    i18n: AcExAnnotationI18n,
    services: AcApAnnotationServices
  ) {
    this.toolbar = new AcExAnnotationToolbar(host, i18n, cmd => {
      AcApDocManager.instance.sendStringToExecute(cmd)
    })
    this.propertyBar = new AcExAnnotationPropertyBar(host, i18n, services)
    this.panel = new AcExAnnotationPanel(host, i18n, services)
    this.panel.setVisible(services.panelVisible)
  }

  refresh() {
    this.toolbar.refresh()
    this.propertyBar.refresh()
    this.panel.refresh()
  }

  setPanelVisible(visible: boolean) {
    this.panel.setVisible(visible)
  }

  destroy() {
    this.toolbar.destroy()
    this.propertyBar.destroy()
    this.panel.destroy()
  }
}