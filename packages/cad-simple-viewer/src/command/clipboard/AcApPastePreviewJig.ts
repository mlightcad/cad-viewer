import {
  AcDbEntity,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import type { AcApClipboardContent } from '../../app/AcApClipboard'
import { AcEdPreviewJig } from '../../editor/input/AcEdPreviewJig'
import { AcEdBaseView } from '../../editor/view/AcEdBaseView'

/**
 * Preview for PASTECLIP / PASTEBLOCK: shows the clipboard objects following
 * the cursor, with the clipboard base point at the cursor.
 *
 * The preview entities are clones of the clipboard database's model space and
 * stay bound to that database, so block references, text styles and layers
 * resolve against the clipboard content even before it is inserted.
 */
export class AcApPastePreviewJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _view: AcEdBaseView
  private readonly _basePoint: AcGePoint3d
  private readonly _entities: AcDbEntity[]
  private _published = false
  private _matrix?: AcGeMatrix3d

  /**
   * @param view - View that renders the transient preview.
   * @param content - Clipboard content to preview.
   */
  constructor(view: AcEdBaseView, content: AcApClipboardContent) {
    super(view)
    this._view = view
    this._basePoint = new AcGePoint3d(content.basePoint)
    this._entities = Array.from(
      content.database.tables.blockTable.modelSpace.newIterator()
    ).map(entity => {
      const clone = entity.clone()
      clone.database = content.database
      return clone
    })
  }

  /** Preview entities, for tests and callers that need their ids. */
  get previewEntities(): readonly AcDbEntity[] {
    return this._entities
  }

  /**
   * Moves the preview so the clipboard base point sits at `point`.
   *
   * @param point - Current cursor position.
   */
  update(point: AcGePoint3dLike) {
    this._matrix = new AcGeMatrix3d().makeTranslation(
      point.x - this._basePoint.x,
      point.y - this._basePoint.y,
      (point.z ?? 0) - this._basePoint.z
    )
  }

  /** Publishes the preview once, then only updates its transform. */
  override render() {
    if (this._entities.length === 0) return
    if (!this._published) {
      this._view.addTransientEntity(this._entities)
      this._published = true
    }
    if (this._matrix) {
      const matrix = this._matrix
      this._view.updateTransientPreviewTransforms(
        this._entities.map(entity => ({ objectId: entity.objectId, matrix }))
      )
    }
  }

  /** Removes the preview from the view. */
  override end() {
    if (!this._published) return
    this._entities.forEach(entity =>
      this._view.removeTransientEntity(entity.objectId)
    )
    this._published = false
  }
}
