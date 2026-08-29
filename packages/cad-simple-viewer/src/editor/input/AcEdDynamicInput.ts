import {
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'

import { acedIsMobileOrPadUi } from '../global/AcEdUiLayout'

/**
 * Returns whether cursor dynamic input should be active.
 *
 * Phone and pad UIs always return `false`: floating input next to the cursor is
 * not usable on touch devices, regardless of **DYNMODE**. This includes
 * landscape / wide tablets, not only the phone breakpoint.
 *
 * @param database - Drawing whose **DYNMODE** value is read. Defaults to the
 *   current working database.
 * @returns `true` when **DYNMODE** is non-zero and the UI is not phone or pad.
 */
export function acedIsDynamicInputEnabled(database?: AcDbDatabase): boolean {
  if (acedIsMobileOrPadUi()) return false
  const db = database ?? acdbHostApplicationServices().workingDatabase
  const mode = Number(
    AcDbSysVarManager.instance().getVar(AcDbSystemVariables.DYNMODE, db)
  )
  return mode !== 0
}
