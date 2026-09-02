import {
  AcCmEventManager,
  AcDbEntity,
  AcDbLayout,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

import {
  restoreMeasurementsAfterRegen,
  snapshotMeasurementsForRegen
} from '../command/measure/AcApMeasurementStore'
import { AcEdBaseView } from '../editor/view/AcEdBaseView'
import { AcTrView2d } from '../view'
import { AcApDocument } from './AcApDocument'
import {
  type AcDbEntityModifiedEventArgs,
  canApplyVisibilityOnlySceneUpdate
} from './AcApEntityUpdate'

function asEntityList(entity: AcDbEntity | AcDbEntity[]): AcDbEntity[] {
  return Array.isArray(entity) ? entity : [entity]
}

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
 * Call {@link dispose} when the document is closed. Use {@link suspend} /
 * {@link resume} when parking an inactive document so its database events do
 * not mutate the shared view while another document is on screen.
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
  /** When false, database and selection listeners no-op (inactive MDI session). */
  private _active = true
  /** Unbind functions registered in the constructor. */
  private readonly _disposers: Array<() => void> = []

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

    const bind = <T>(
      manager: AcCmEventManager<T>,
      listener: (args: T) => void
    ) => {
      manager.addEventListener(listener)
      this._disposers.push(() => manager.removeEventListener(listener))
    }

    // Add entity to scene
    bind(doc.database.events.entityAppended, args => {
      if (!this._active) return
      const pending = asEntityList(args.entity).filter(
        entity => !this.view.hasEntity(entity.objectId)
      )
      if (pending.length === 0) {
        return
      }
      this.view.addEntity(pending.length === 1 ? pending[0] : pending)
    })

    // Update entity
    bind(doc.database.events.entityModified, args => {
      if (!this._active) return
      const eventArgs = args as AcDbEntityModifiedEventArgs
      const currentView = this.view
      if (
        currentView instanceof AcTrView2d &&
        canApplyVisibilityOnlySceneUpdate(
          eventArgs,
          objectId => currentView.hasEntity(objectId),
          objectId => currentView.getEntityVisible(objectId)
        ) &&
        currentView.updateEntityVisibility(eventArgs.entity)
      ) {
        return
      }
      this.view.updateEntity(eventArgs.entity)
    })

    // Erase entity
    bind(doc.database.events.entityErased, args => {
      if (!this._active) return
      const pending = asEntityList(args.entity).filter(entity =>
        this.view.hasEntity(entity.objectId)
      )
      if (pending.length === 0) {
        return
      }
      this.view.removeEntity(pending.length === 1 ? pending[0] : pending)
    })

    // Set layer visibility
    bind(doc.database.events.layerAppended, args => {
      if (!this._active) return
      this._view.addLayer(args.layer)
    })

    // Update layer information such as visibility
    bind(doc.database.events.layerModified, args => {
      if (!this._active) return
      this._view.updateLayer(args.layer, args.changes)
    })

    // Set point display mode. Sysvars are global; ignore other documents.
    bind(AcDbSysVarManager.instance().events.sysVarChanged, args => {
      if (!this._active || args.database !== this._doc.database) {
        return
      }
      if (args.name == AcDbSystemVariables.PDMODE.toLowerCase()) {
        ;(this._view as AcTrView2d).rerenderPoints(args.database.pdmode)
      } else if (args.name == AcDbSystemVariables.LWDISPLAY.toLowerCase()) {
        const currentView = this._view as AcTrView2d
        const showLineWeight = !!args.database.lwdisplay
        if (currentView.renderer.showLineWeight !== showLineWeight) {
          currentView.renderer.showLineWeight = showLineWeight
          // Existing line objects may need different geometry/material classes.
          // Regenerate to rebuild scene content using the new display mode.
          snapshotMeasurementsForRegen(currentView)
          currentView.clear()
          args.database.regen()
          restoreMeasurementsAfterRegen(currentView, args.database)
        }
      }
    })

    bind(doc.database.events.dictObjetSet, args => {
      if (!this._active) return
      if (args.object instanceof AcDbLayout) {
        this._view.addLayout(args.object as AcDbLayout)
      }
    })

    // Show their grip points when entities are selected
    bind(view.selectionSet.events.selectionAdded, args => {
      if (!this._active) return
      view.highlight(args.ids)
    })

    // Hide their grip points when entities are deselected
    bind(view.selectionSet.events.selectionRemoved, args => {
      if (!this._active) return
      view.unhighlight(args.ids)
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
   * Whether this context currently forwards database events to the shared view.
   */
  get isActive() {
    return this._active
  }

  /**
   * Stops forwarding database events to the view (document is no longer on screen).
   */
  suspend() {
    this._active = false
  }

  /**
   * Resumes forwarding database events after {@link suspend}.
   */
  resume() {
    this._active = true
  }

  /**
   * Removes all event listeners. Call when the document session is discarded.
   */
  dispose() {
    this._active = false
    for (const dispose of this._disposers) {
      dispose()
    }
    this._disposers.length = 0
  }
}
