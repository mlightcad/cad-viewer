import {
  AcDbBlockTableRecord,
  AcDbEntity,
  AcDbMInsertBlock,
  AcDbObjectId
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app/index.js'
import { AcEdCommand, AcEdOpenMode } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import { resolveSelectedEntities } from '../../service/index.js'

/**
 * Result of exploding a set of entities with {@link acapExplodeEntities}.
 */
export interface AcApExplodeResult {
  /** Ids of the source entities that were exploded (and erased). */
  explodedIds: AcDbObjectId[]
  /** Entities created from the exploded source entities. */
  created: AcDbEntity[]
  /** Number of selected MINSERT block references (never exploded). */
  minsertCount: number
  /** Number of other selected entities that cannot be exploded. */
  notExplodableCount: number
}

/**
 * Explodes entities with {@link AcDbEntity.explode} and appends the parts to
 * the block table record that owns each source entity (model space, a paper
 * space layout, or a block definition). The source entities themselves are
 * not erased here.
 *
 * @param context - Application context of the active document.
 * @param entities - Entities to explode.
 * @returns The created parts and counts of entities that were not exploded.
 */
export function acapExplodeEntities(
  context: AcApContext,
  entities: AcDbEntity[]
): AcApExplodeResult {
  const blockTable = context.doc.database.tables.blockTable
  const result: AcApExplodeResult = {
    explodedIds: [],
    created: [],
    minsertCount: 0,
    notExplodableCount: 0
  }

  for (const entity of entities) {
    if (entity instanceof AcDbMInsertBlock) {
      result.minsertCount++
      continue
    }
    const parts = entity.explode()
    if (parts.length === 0) {
      result.notExplodableCount++
      continue
    }
    const owner: AcDbBlockTableRecord =
      (entity.ownerId ? blockTable.getIdAt(entity.ownerId) : undefined) ??
      blockTable.modelSpace
    owner.appendEntity(parts)
    result.explodedIds.push(entity.objectId)
    result.created.push(...parts)
  }
  return result
}

/**
 * EXPLODE: breaks compound objects (polylines, block references, dimensions,
 * leaders, multiline text, hatches, tables, meshes, ...) into their component
 * objects, like the AutoCAD EXPLODE command.
 *
 * The geometry is produced by each entity's `explode()` (ObjectARX-style
 * `AcDbEntity::explode`): block references explode one level, polylines lose
 * their widths, and so on. Exploded objects are replaced by their parts in
 * the same space; objects that cannot be exploded (single lines, text,
 * MINSERT block references, ...) are reported and left unchanged. The whole
 * command is one undo step.
 */
export class AcApExplodeCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const selection = await resolveSelectedEntities(context, {
      promptKey: 'explode'
    })
    if (!selection) return

    const result = acapExplodeEntities(context, selection.entities)
    if (result.explodedIds.length > 0) {
      context.doc.entityService.eraseEntities(result.explodedIds)
      // Appends made inside the command transaction are announced to the
      // view when it commits; add them now so they show up immediately.
      context.view.addEntity(result.created)
    }
    context.view.selectionSet.clear()
    this.reportSkipped(result)
  }

  private reportSkipped(result: AcApExplodeResult) {
    const editor = AcApDocManager.instance.editor
    if (result.minsertCount > 0) {
      editor.showMessage(
        AcApI18n.t('jig.explode.minsert').replace(
          '{count}',
          String(result.minsertCount)
        ),
        'warning'
      )
    }
    if (result.notExplodableCount > 0) {
      editor.showMessage(
        AcApI18n.t('jig.explode.notExplodable').replace(
          '{count}',
          String(result.notExplodableCount)
        ),
        'warning'
      )
    }
  }
}
