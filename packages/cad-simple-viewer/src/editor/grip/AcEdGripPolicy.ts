import { AcEdOpenMode } from '../view/AcEdOpenMode'

/**
 * Returns whether grips should be suppressed for the given selection count,
 * matching AutoCAD GRIPOBJLIMIT behavior.
 *
 * When `gripObjLimit` is `0`, grips are always shown. Otherwise grips are
 * suppressed when `selectionCount` exceeds the limit.
 */
function shouldSuppressGripsForSelectionCount(
  selectionCount: number,
  gripObjLimit: number
): boolean {
  if (gripObjLimit <= 0) {
    return false
  }
  return selectionCount > gripObjLimit
}

/**
 * Returns whether grip handles should be shown for the given view state.
 */
export function acedShouldShowGrips(
  openMode: AcEdOpenMode,
  editorActive: boolean,
  mtextEditorActive: boolean,
  selectionCount: number,
  gripObjLimit: number
): boolean {
  if (openMode !== AcEdOpenMode.Write) {
    return false
  }
  if (editorActive) {
    return false
  }
  if (mtextEditorActive) {
    return false
  }
  return !shouldSuppressGripsForSelectionCount(selectionCount, gripObjLimit)
}
