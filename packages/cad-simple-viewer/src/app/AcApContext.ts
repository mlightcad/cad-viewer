import {
  AcDbLayout,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

import { AcEdBaseView, AcEdLayerStateManager, type AcEdLayerStateSnapshot } from '../editor/view'
import { AcTrView2d } from '../view'
import { AcApDocument } from './AcApDocument'

/**
 * Application context that binds a CAD document with its associated view.
 *
 * This class establishes the connection between a CAD document (containing the drawing database)
 * and its visual representation (the view). It handles event forwarding between the document
 * and view to keep them synchronized.
 *
 * The context manages:
 * - Entity lifecycle events (add, modify, remove)
 * - Layer visibility changes
 * - System variable changes (like point display mode)
 * - Entity selection and highlighting
 *
 * @example
 * ```typescript
 * const document = new AcApDocument();
 * const view = new AcTrView2d();
 * const context = new AcApContext(view, document);
 *
 * // The context will automatically sync changes between document and view
 * // For example, when entities are added to the document, they appear in the view
 * ```
 */
export class AcApContext {
  /** The view component that renders the CAD drawing */
  private _view: AcEdBaseView
  /** The document containing the CAD database */
  private _doc: AcApDocument
  /** Manager for handling layer state changes */
  private _layerStateManager: AcEdLayerStateManager
  /** Layer state snapshot captured at the start of a command, used to detect changes */
  private _layerStateBeforeCommand: AcEdLayerStateSnapshot | null = null

  /**
   * Creates a new application context that binds a document with its view.
   *
   * The constructor sets up event listeners to synchronize the document and view:
   * - Entity additions/modifications are reflected in the view
   * - Layer visibility changes update the view
   * - System variable changes (like point display mode) update rendering
   * - Entity selections show/hide grip points
   *
   * @param view - The view used to display the drawing
   * @param doc - The document containing the drawing database
   */
  constructor(view: AcEdBaseView, doc: AcApDocument) {
    this._view = view
    this._doc = doc
    this._layerStateManager = new AcEdLayerStateManager()

    // Add entity to scene
    doc.database.events.entityAppended.addEventListener(args => {
      this.view.addEntity(args.entity)
    })

    // Update entity
    doc.database.events.entityModified.addEventListener(args => {
      this.view.updateEntity(args.entity)
    })

    // Erase entity
    doc.database.events.entityErased.addEventListener(args => {
      this.view.removeEntity(args.entity)
    })

    // Set layer visibility
    doc.database.events.layerAppended.addEventListener(args => {
      this._view.addLayer(args.layer)
    })

    // Update layer information such as visibility
    doc.database.events.layerModified.addEventListener(args => {
      this._view.updateLayer(args.layer, args.changes)
    })

    // Set point display mode
    AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
      if (args.name == AcDbSystemVariables.PDMODE.toLowerCase()) {
        ;(this._view as AcTrView2d).rerenderPoints(args.database.pdmode)
      } else if (args.name == AcDbSystemVariables.LWDISPLAY.toLowerCase()) {
        const view = this._view as AcTrView2d
        const showLineWeight = !!args.database.lwdisplay
        if (view.renderer.showLineWeight !== showLineWeight) {
          view.renderer.showLineWeight = showLineWeight
          // Existing line objects may need different geometry/material classes.
          // Regenerate to rebuild scene content using the new display mode.
          view.clear()
          args.database.regen()
        }
      }
    })

    doc.database.events.dictObjetSet.addEventListener(args => {
      if (args.object instanceof AcDbLayout) {
        this._view.addLayout(args.object as AcDbLayout)
      }
    })

    // Show their grip points when entities are selected
    view.selectionSet.events.selectionAdded.addEventListener(args => {
      view.highlight(args.ids)
    })

    // Hide their grip points when entities are deselected
    view.selectionSet.events.selectionRemoved.addEventListener(args => {
      view.unhighlight(args.ids)
    })

    // Set up automatic layer state tracking:
    // 1. On commandWillStart: capture the current layer state
    // 2. On commandEnded: compare and update if there were changes
    view.editor.events.commandWillStart.addEventListener(() => {
      try {
        this._layerStateBeforeCommand = {
          clayer: this.doc.database.clayer,
          states: [...this.doc.database.tables.layerTable.newIterator()].map(
            layer => ({
              name: layer.name,
              isOn: !layer.isOff,
              isFrozen: layer.isFrozen,
              isLocked: ((layer.standardFlags ?? 0) & 0x04) !== 0
            })
          )
        }
      } catch {
        // Silently ignore if context is not available during early initialization
        this._layerStateBeforeCommand = null
      }
    })
    view.editor.events.commandEnded.addEventListener(() => {
      try {
        if (!this._layerStateBeforeCommand) {
          return
        }

        const layerStateAfterCommand: AcEdLayerStateSnapshot = {
          clayer: this.doc.database.clayer,
          states: [...this.doc.database.tables.layerTable.newIterator()].map(
            layer => ({
              name: layer.name,
              isOn: !layer.isOff,
              isFrozen: layer.isFrozen,
              isLocked: ((layer.standardFlags ?? 0) & 0x04) !== 0
            })
          )
        }

        // Check if layer state changed
        if (
          AcEdLayerStateManager.hasLayerStateChanged(
            this._layerStateBeforeCommand,
            layerStateAfterCommand
          )
        ) {
          // Layer state changed, update the manager with the previous state
          this._layerStateManager.importSnapshot(this._layerStateBeforeCommand)
        }

        this._layerStateBeforeCommand = null
      } catch {
        // Silently ignore errors during cleanup
        this._layerStateBeforeCommand = null
      }
    })
  }

  /**
   * Gets the view component that renders the CAD drawing.
   *
   * @returns The associated view instance
   */
  get view() {
    return this._view
  }

  /**
   * Gets the document containing the CAD database.
   *
   * @returns The associated document instance
   */
  get doc(): AcApDocument {
    return this._doc
  }

  /**
   * Restores the previous layer state captured before a command, if available.
   *
   * This is used by the `LAYERP` command to revert layer changes.
   * @returns Returns true if the previous layer state was successfully restored, false if no snapshot is available.
   */
  restorePreviousLayerState() {
    return this._layerStateManager.restorePreviousState(this.doc.database)
  }
}
