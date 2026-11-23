import {
  AcDbBlockTableRecord,
  acdbIsJoinableEntity,
  acdbJoinAllEntities,
  AcDbObjectId
} from '@mlightcad/data-model'

import type { AcApContext } from '../../app/AcApContext.js'
import { AcEdCommand } from '../../editor/command/AcEdCommand.js'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode.js'
import { AcApI18n } from '../../i18n/index.js'

/**
 * JOIN: combines open lines, arcs, and polylines at common endpoints into
 * single objects, like the AutoCAD JOIN command (multiple-objects mode).
 *
 * Geometry comes from {@link acdbJoinAllEntities} in the data model:
 * collinear lines become one line, concentric arcs become an arc or circle,
 * and contiguous coplanar curves become a polyline. Sources are erased after
 * the results are appended. The whole command is one undo step.
 *
 * Imports stay on leaf modules (not `editor/index` / `service/index`) so
 * registration from `AcApDocManager` does not hit a CJS cycle.
 */
export class AcApJoinCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const { resolveSelectedEntities } = await import(
      '../../service/AcApEntitySelection.js'
    )
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'join'
    })
    if (!resolved) return

    const joinable = resolved.entities.filter(acdbIsJoinableEntity)
    if (joinable.length < 2) {
      this.showMessage(AcApI18n.t('jig.join.needTwo'), 'warning')
      return
    }

    const { groups, consumed } = acdbJoinAllEntities(joinable)
    if (groups.length === 0) {
      this.showMessage(AcApI18n.t('jig.join.noneJoined'), 'warning')
      return
    }

    const created = groups.map(group => group.result)
    for (const group of groups) {
      const space = resolveOwnerSpace(context, group.sources[0].ownerId)
      space.appendEntity(group.result)
    }

    const eraseIds = consumed
      .map(entity => entity.objectId)
      .filter((id): id is AcDbObjectId => !!id)
    const erased = context.doc.entityService.eraseEntities(eraseIds)
    if (erased !== eraseIds.length) {
      this.showMessage(AcApI18n.t('jig.join.eraseFailed'), 'warning')
      throw new Error('JOIN: failed to erase all source entities')
    }

    // Appends inside the command transaction are announced on commit; add
    // them now so the joined geometry appears immediately (same as EXPLODE).
    context.view.addEntity(created)
    context.view.selectionSet.clear()
    this.showMessage(
      AcApI18n.t('jig.join.joined').replace(
        '{count}',
        String(consumed.length)
      )
    )
  }
}

/**
 * Returns the block table record that owns `ownerId`, or model space when the
 * owner cannot be resolved.
 */
function resolveOwnerSpace(
  context: AcApContext,
  ownerId: AcDbObjectId
): AcDbBlockTableRecord {
  const owner = context.doc.database.getObjectById(ownerId)
  if (owner instanceof AcDbBlockTableRecord) return owner
  return context.doc.database.tables.blockTable.modelSpace
}
