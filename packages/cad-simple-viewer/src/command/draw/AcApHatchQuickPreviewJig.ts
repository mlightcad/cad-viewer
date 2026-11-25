import {
  AcDbDatabase,
  AcDbHatch,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcGeLoop2d,
  type AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcEdPreviewJig } from '../../editor/input/AcEdPreviewJig.js'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView.js'

/**
 * Options for {@link AcApHatchQuickPreviewJig}.
 */
export interface AcApHatchQuickPreviewJigOptions {
  /** Drawing database used to read HPQUICKPREVIEW / HPQUICKPREVTIMEOUT. */
  database: AcDbDatabase
  /**
   * Resolves closed loops for the current cursor position (outer + islands).
   * Returns an empty array when the point is outside every hatchable region.
   */
  resolveLoops: (point: AcGePoint3dLike) => ReadonlyArray<AcGeLoop2d>
  /**
   * Builds an uncommitted hatch for the given loops (no model-space append).
   */
  createHatch: (loops: ReadonlyArray<AcGeLoop2d>) => AcDbHatch | undefined
}

/**
 * Transient hatch preview while hovering enclosed areas during pick-points.
 *
 * Mirrors AutoCAD HPQUICKPREVIEW: as the cursor moves over a closed region,
 * a temporary hatch is shown with the current pattern settings. Generation
 * that exceeds HPQUICKPREVTIMEOUT seconds is cancelled (preview cleared) while
 * the HATCH command stays active.
 *
 * The pick-points prompt must run with {@link AcEdPromptPointOptions.disableOSnap}
 * so CEN/END snaps cannot pull the hover sample onto a nearby circle center.
 *
 * @see https://help.autodesk.com/cloudhelp/2027/ENU/AutoCAD-Core/files/GUID-55E323D8-5BC3-407E-A57C-B18273325604.htm
 */
export class AcApHatchQuickPreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcEdBaseView
  private readonly _options: AcApHatchQuickPreviewJigOptions
  private _preview: AcDbHatch | undefined
  private _renderedId: string | undefined
  /** Last successfully previewed loop set (object identity). */
  private _lastLoops: ReadonlyArray<AcGeLoop2d> = []

  constructor(view: AcEdBaseView, options: AcApHatchQuickPreviewJigOptions) {
    super(view)
    this._view = view
    this._options = options
  }

  /**
   * Rebuilds the transient hatch for the cursor position when quick preview
   * is enabled and a containing boundary is found.
   *
   * @param point Current cursor WCS point from the point prompt.
   */
  update(point: AcGePoint3dLike) {
    if (!this.isQuickPreviewEnabled()) {
      this.clearRendered()
      this._lastLoops = []
      return
    }

    const timeoutMs = this.getTimeoutSeconds() * 1000
    const startedAt = performance.now()

    let loops: ReadonlyArray<AcGeLoop2d>
    try {
      loops = this._options.resolveLoops(point)
    } catch {
      this.clearRendered()
      this._lastLoops = []
      return
    }
    if (performance.now() - startedAt > timeoutMs) {
      this.clearRendered()
      this._lastLoops = []
      return
    }

    if (!loops.length) {
      this.clearRendered()
      this._lastLoops = []
      return
    }

    if (this._preview && this.sameLoops(loops, this._lastLoops)) {
      return
    }

    let hatch: AcDbHatch | undefined
    try {
      hatch = this._options.createHatch(loops)
    } catch {
      hatch = undefined
    }
    if (performance.now() - startedAt > timeoutMs || !hatch) {
      this.clearRendered()
      this._lastLoops = []
      return
    }

    this.clearRendered()
    this._preview = hatch
    this._lastLoops = loops
  }

  /**
   * Publishes the current preview hatch as a transient entity.
   * Skips re-publish while the same hatch is already on the view.
   */
  override render() {
    if (!this._preview) return
    if (this._renderedId === this._preview.objectId) return
    this._view.addTransientEntity(this._preview)
    this._renderedId = this._preview.objectId
  }

  /**
   * Removes the transient preview when the point prompt ends.
   */
  override end() {
    this.clearRendered()
    this._lastLoops = []
  }

  private sameLoops(
    a: ReadonlyArray<AcGeLoop2d>,
    b: ReadonlyArray<AcGeLoop2d>
  ) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  private clearRendered() {
    if (this._renderedId) {
      this._view.removeTransientEntity(this._renderedId)
    }
    this._renderedId = undefined
    this._preview = undefined
  }

  private isQuickPreviewEnabled() {
    try {
      const value = AcDbSysVarManager.instance().getVar(
        AcDbSystemVariables.HPQUICKPREVIEW,
        this._options.database
      )
      return Number(value) !== 0
    } catch {
      return true
    }
  }

  private getTimeoutSeconds() {
    try {
      const value = Number(
        AcDbSysVarManager.instance().getVar(
          AcDbSystemVariables.HPQUICKPREVTIMEOUT,
          this._options.database
        )
      )
      if (!Number.isFinite(value)) return 2
      return Math.max(1, Math.min(300, value))
    } catch {
      return 2
    }
  }
}
