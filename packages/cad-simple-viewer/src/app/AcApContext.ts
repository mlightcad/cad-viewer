import { AcDbLayout } from '@mlightcad/data-model'

import { AcEdBaseView } from '../editor/view/AcEdBaseView'
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

    // Add entity to scene
    doc.database.events.entityAppended.addEventListener(args => {
      this.view.addEntity(args.entity)
    })

    // Update entity
    doc.database.events.entityModified.addEventListener(args => {
      this.view.updateEntity(args.entity)
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
    doc.database.events.headerSysVarChanged.addEventListener(args => {
      if (args.name == 'pdmode') {
        ;(this._view as AcTrView2d).rerenderPoints(args.database.pdmode)
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
}
