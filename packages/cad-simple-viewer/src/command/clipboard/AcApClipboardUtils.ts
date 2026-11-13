import {
  AcDbEntity,
  AcDbObjectId,
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import type { AcApClipboardContent } from '../../app/AcApClipboard'
import { AcEdPromptPointOptions, AcEdPromptStatus } from '../../editor'
import { AcApI18n } from '../../i18n'
import { resolveSelectedEntities } from '../../service'
import { AcApPastePreviewJig } from './AcApPastePreviewJig'

/**
 * Returns the lower-left corner of the entities' combined extents, which is
 * the base point AutoCAD's COPYCLIP stores with the clipboard data.
 *
 * @param entities - Copied entities.
 * @returns The lower-left corner, or the origin when no extents are known.
 */
export function acapClipboardBasePoint(entities: AcDbEntity[]): AcGePoint3d {
  const box = new AcGeBox3d()
  for (const entity of entities) {
    const extents = entity.geometricExtents
    if (extents && !extents.isEmpty()) box.union(extents)
  }
  return box.isEmpty() ? new AcGePoint3d() : new AcGePoint3d(box.min)
}

/**
 * Copies the current selection (or a prompted one) to the clipboard.
 *
 * @param context - Command context.
 * @param promptKey - `command.ACAD.<key>.prompt` used when nothing is preselected.
 * @param basePoint - Base point; defaults to {@link acapClipboardBasePoint}.
 * @returns Ids of the copied entities, or `undefined` when nothing was selected.
 */
export async function acapCopySelectionToClipboard(
  context: AcApContext,
  promptKey: string,
  basePoint?: AcGePoint3dLike
): Promise<AcDbObjectId[] | undefined> {
  const resolved = await resolveSelectedEntities(context, { promptKey })
  context.view.selectionSet.clear()
  if (!resolved) return undefined

  AcApDocManager.instance.clipboard.set(
    context.doc.database,
    resolved.ids,
    basePoint ?? acapClipboardBasePoint(resolved.entities)
  )
  return resolved.ids
}

/**
 * Reads the clipboard and reports an empty clipboard to the user.
 *
 * @param showMessage - Message sink of the calling command.
 * @returns The content to paste, or `undefined` when there is none.
 */
export async function acapReadClipboard(
  showMessage: (message: string) => void
): Promise<AcApClipboardContent | undefined> {
  const content = await AcApDocManager.instance.clipboard.get()
  const isEmpty =
    !content ||
    content.database.tables.blockTable.modelSpace.newIterator().count === 0
  if (isEmpty) {
    showMessage(AcApI18n.t('jig.pasteclip.empty'))
    return undefined
  }
  return content
}

/**
 * Prompts for the point where the clipboard base point is placed, showing
 * the clipboard objects at the cursor.
 *
 * @param context - Command context.
 * @param content - Clipboard content to preview.
 * @param promptKey - `jig.*` key of the prompt message.
 * @returns The picked point, or `undefined` when the user cancels.
 */
export async function acapPromptPastePoint(
  context: AcApContext,
  content: AcApClipboardContent,
  promptKey: string
): Promise<AcGePoint3d | undefined> {
  const prompt = new AcEdPromptPointOptions(AcApI18n.t(promptKey))
  prompt.jig = new AcApPastePreviewJig(context.view, content)
  const result = await AcApDocManager.instance.editor.getPoint(prompt)
  if (result.status !== AcEdPromptStatus.OK || !result.value) return undefined
  return new AcGePoint3d(result.value)
}

/**
 * Translation that moves the clipboard base point onto `point`.
 *
 * @param content - Clipboard content.
 * @param point - Destination of the base point.
 */
export function acapPasteTransform(
  content: AcApClipboardContent,
  point: AcGePoint3dLike
): AcGeMatrix3d {
  const base = content.basePoint
  return new AcGeMatrix3d().makeTranslation(
    point.x - base.x,
    point.y - base.y,
    (point.z ?? 0) - base.z
  )
}
