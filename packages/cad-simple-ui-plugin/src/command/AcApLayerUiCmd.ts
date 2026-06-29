import {
  AcApContext,
  AcEdCommand,
  eventBus
} from '@mlightcad/cad-simple-viewer'

import type { AcExDockPanel } from '../ui/AcExDockPanel'

/** Shared interface for layer UI controllers. */
export interface AcExLayerUiController {
  /** Toggles layer UI from the `layer` CAD command. */
  toggleFromCommand(): void
  /** Hides or closes layer UI (used by `close-layer-manager` event). */
  hide(): void
  /** Updates labels after a locale change. */
  refreshLocale(): void
}

/**
 * Layer UI controller that opens the layers tab in a dock panel.
 */
export class AcExLayerDockController implements AcExLayerUiController {
  private readonly handleCloseLayerManager = () => {
    this.hide()
  }

  /**
   * @param dockPanel - Dock panel hosting the layers tab.
   * @param layersTabId - Tab id registered for the layer list.
   */
  constructor(
    private readonly dockPanel: AcExDockPanel,
    private readonly layersTabId = 'layers'
  ) {
    eventBus.on('close-layer-manager', this.handleCloseLayerManager)
  }

  /** Opens the dock panel and activates the layers tab. */
  toggleFromCommand() {
    if (!this.dockPanel.hasTab(this.layersTabId)) {
      return
    }
    this.dockPanel.open(this.layersTabId)
  }

  /** Closes the dock panel. */
  hide() {
    this.dockPanel.close()
  }

  /** Refreshes dock panel locale (including tab labels). */
  refreshLocale() {
    this.dockPanel.refreshLocale()
  }

  /** Removes event listeners. */
  destroy() {
    eventBus.off('close-layer-manager', this.handleCloseLayerManager)
  }
}

/** Actions invoked by the `layer` command to prepare and open layer UI in the dock. */
export interface AcExLayerCommandActions {
  /** Ensures the dock panel and layers tab exist before toggling. */
  prepare(): void
  /** Activates the layers tab in the dock panel. */
  toggle(): void
}

/** Mutable holder so the `layer` command stays registered while the UI mode switches. */
export class AcExLayerUiControllerHolder implements AcExLayerUiController {
  /** Active layer UI controller delegate. */
  current?: AcExLayerUiController

  toggleFromCommand() {
    this.current?.toggleFromCommand()
  }

  hide() {
    this.current?.hide()
  }

  refreshLocale() {
    this.current?.refreshLocale()
  }
}

/**
 * Command that opens the layer manager in the dock panel when it is closed.
 */
export class AcApLayerUiCmd extends AcEdCommand {
  /**
   * @param actions - Prepare and toggle callbacks wired by the plugin.
   */
  constructor(private readonly actions: AcExLayerCommandActions) {
    super()
  }

  /**
   * Ensures the dock panel is ready, then opens or focuses the layers tab.
   *
   * @param _context - Application context (unused).
   */
  async execute(_context: AcApContext) {
    this.actions.prepare()
    this.actions.toggle()
  }
}
