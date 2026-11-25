import {
  AcDbEntity,
  AcDbObjectId,
  AcGeBox2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import type { AcApContext } from '../../app/AcApContext.js'
import { AcApDocManager } from '../../app/AcApDocManager.js'
import { AcEdCommand } from '../../editor/command/AcEdCommand.js'
import {
  type AcEdPromptState,
  AcEdPromptStateMachine,
  type AcEdPromptStateStep
} from '../../editor/input/AcEdPromptStateMachine.js'
import { AcEdPromptBoxOptions } from '../../editor/input/prompt/AcEdPromptBoxOptions.js'
import { AcEdPromptPointOptions } from '../../editor/input/prompt/AcEdPromptPointOptions.js'
import { AcEdPromptPointResult } from '../../editor/input/prompt/AcEdPromptPointResult.js'
import { AcEdPromptStatus } from '../../editor/input/prompt/AcEdPromptStatus.js'
import type {
  AcEdSelectionMode,
  AcEdViewportCoordinateMapper
} from '../../editor/view/AcEdBaseView.js'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode.js'
import { AcApI18n } from '../../i18n/index.js'
import {
  acapStretchLayoutDeltaToEntitySpace,
  acapStretchPointToLayout
} from './acapStretchCoords.js'
import type { AcApStretchPreviewTarget } from './AcApStretchPreviewJig.js'

/**
 * STRETCH plan for one entity from the selection window.
 */
interface AcApStretchTarget {
  entity: AcDbEntity
  indices: Set<number>
  fullyEnclosed: boolean
  viewportId?: AcDbObjectId
}

/**
 * STRETCH command — AutoCAD-like window stretch.
 *
 * Selection is one window or crossing box (from drag direction): stretch
 * points inside a crossing box move by the displacement; fully enclosed
 * entities (window selection, or every stretch point selected) are translated
 * via {@link AcDbEntity.transformBy}. Model entities selected through a
 * paper-space viewport map points and displacement through that viewport.
 *
 * Imports stay on leaf modules (not `app/index` / `editor/index`), and
 * locked-layer / preview jig helpers load lazily, so registration from
 * `AcApDocManager` does not hit a CJS cycle that leaves this class
 * undefined (or pull `AcApLockedLayer`'s prototype patch too early).
 */
export class AcApStretchCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const selectionSet = context.view.selectionSet
    const targets = await this.collectStretchTargets(context)
    if (!targets || targets.length === 0) {
      selectionSet.clear()
      return
    }

    const { AcApStretchPreviewJig } = await import(
      './AcApStretchPreviewJig.js'
    )

    const previewTargets: AcApStretchPreviewTarget[] = targets.map(t => ({
      entity: t.entity,
      indices: [...t.indices],
      fullyEnclosed: t.fullyEnclosed,
      viewportId: t.viewportId
    }))

    let basePoint: AcGePoint3d | undefined
    let layoutDisplacement: AcGePoint3d | undefined

    type StretchState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >
    type StretchStep = AcEdPromptStateStep
    type StretchMachine = AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >

    const createDisplacementKeyword = (prompt: AcEdPromptPointOptions) => {
      prompt.keywords.add(
        AcApI18n.t('jig.stretch.keywords.displacement.display'),
        AcApI18n.t('jig.stretch.keywords.displacement.global'),
        AcApI18n.t('jig.stretch.keywords.displacement.local')
      )
    }

    class BasePointState implements StretchState {
      constructor(private machine: StretchMachine) {}

      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.stretch.basePointOrDisplacement')
        )
        createDisplacementKeyword(prompt)
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<StretchStep> {
        if (result.status === AcEdPromptStatus.OK) {
          basePoint = new AcGePoint3d(result.value!)
          this.machine.setState(new SecondPointState(this.machine))
          return 'continue'
        }

        if (result.status === AcEdPromptStatus.None) {
          this.machine.setState(new DisplacementState())
          return 'continue'
        }

        if (
          result.status === AcEdPromptStatus.Keyword &&
          result.stringResult === 'Displacement'
        ) {
          this.machine.setState(new DisplacementState())
          return 'continue'
        }

        return 'finish'
      }
    }

    class SecondPointState implements StretchState {
      constructor(private machine: StretchMachine) {}

      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.stretch.secondPointOrDisplacement')
        )
        createDisplacementKeyword(prompt)
        if (basePoint) {
          prompt.useBasePoint = true
          prompt.useDashedLine = true
          prompt.basePoint = basePoint
          prompt.jig = new AcApStretchPreviewJig(
            context.view,
            previewTargets,
            basePoint
          )
        }
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<StretchStep> {
        if (result.status === AcEdPromptStatus.OK && basePoint) {
          const secondPoint = new AcGePoint3d(result.value!)
          layoutDisplacement = new AcGePoint3d(secondPoint).sub(basePoint)
          return 'finish'
        }

        if (
          result.status === AcEdPromptStatus.Keyword &&
          result.stringResult === 'Displacement'
        ) {
          this.machine.setState(new DisplacementState())
          return 'continue'
        }

        return 'finish'
      }
    }

    class DisplacementState implements StretchState {
      buildPrompt() {
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.stretch.displacement')
        )
        prompt.useBasePoint = true
        prompt.useDashedLine = true
        prompt.basePoint = new AcGePoint3d(0, 0, 0)
        prompt.jig = new AcApStretchPreviewJig(
          context.view,
          previewTargets,
          prompt.basePoint
        )
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: AcEdPromptPointResult): Promise<StretchStep> {
        if (result.status === AcEdPromptStatus.OK) {
          basePoint = new AcGePoint3d(0, 0, 0)
          layoutDisplacement = new AcGePoint3d(result.value!)
        }
        return 'finish'
      }
    }

    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(new BasePointState(machine))
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))

    if (!layoutDisplacement || !basePoint) {
      selectionSet.clear()
      return
    }

    const stretchPlans = previewTargets.map(target => ({
      entity: target.entity,
      indices: target.indices,
      fullyEnclosed: target.fullyEnclosed,
      offset: acapStretchLayoutDeltaToEntitySpace(
        context.view,
        target.viewportId,
        basePoint!,
        layoutDisplacement!
      )
    }))

    const count = context.doc.entityService.stretchEntities(stretchPlans)
    if (count === 0) {
      this.showMessage(AcApI18n.t('jig.stretch.nothingStretched'), 'warning')
    }
    selectionSet.clear()
  }

  /**
   * Prompts for a single window that both selects entities and chooses which
   * stretch points move, then proceeds to the displacement prompts.
   */
  private async collectStretchTargets(
    context: AcApContext
  ): Promise<AcApStretchTarget[] | null> {
    const selectionSet = context.view.selectionSet
    const db = context.doc.database

    const options = new AcEdPromptBoxOptions(
      AcApI18n.t('jig.stretch.crossingFirst'),
      AcApI18n.t('jig.stretch.crossingSecond')
    )
    const result = await AcApDocManager.instance.editor.getBox(options)
    if (result.status !== AcEdPromptStatus.OK || !result.value) {
      return null
    }

    const box = result.value
    const mode: AcEdSelectionMode = result.mode ?? 'crossing'
    const { isEntityOnLockedLayer } = await import(
      '../../service/AcApLockedLayer.js'
    )
    const byId = new Map<AcDbObjectId, AcApStretchTarget>()
    const ids = context.view.collectSelectionIdsForBox(box, mode)
    selectionSet.clear()
    selectionSet.add(ids)

    for (const id of ids) {
      const entity = db.tables.blockTable.getEntityById(id)
      if (!entity || isEntityOnLockedLayer(db, entity)) continue

      // AutoCAD skips entities with no stretch points (e.g. 3D solids).
      if (entity.subGetStretchPoints().length === 0) continue

      const viewportMapping = context.view.findViewportMapperForModelEntity(id)
      const mapper = viewportMapping?.mapper
      const target: AcApStretchTarget = {
        entity,
        indices: new Set(),
        fullyEnclosed: false,
        viewportId: viewportMapping?.viewportId
      }

      // Window selection already requires full enclosure at pick time.
      if (mode === 'window' || this.isFullyEnclosed(entity, box, mapper)) {
        target.fullyEnclosed = true
      } else {
        const stretchPoints = entity.subGetStretchPoints()
        for (let i = 0; i < stretchPoints.length; i++) {
          const layoutPoint = acapStretchPointToLayout(stretchPoints[i], mapper)
          if (box.containsPoint(layoutPoint)) {
            target.indices.add(i)
          }
        }
      }

      if (target.fullyEnclosed || target.indices.size > 0) {
        byId.set(id, target)
      }
    }

    const targets = [...byId.values()]
    return targets.length > 0 ? targets : null
  }

  private isFullyEnclosed(
    entity: AcDbEntity,
    box: AcGeBox2d,
    mapper?: AcEdViewportCoordinateMapper
  ): boolean {
    const extents = entity.geometricExtents
    if (extents.isEmpty()) return false
    const corners = [
      { x: extents.min.x, y: extents.min.y, z: extents.min.z },
      { x: extents.max.x, y: extents.min.y, z: extents.min.z },
      { x: extents.min.x, y: extents.max.y, z: extents.max.z },
      { x: extents.max.x, y: extents.max.y, z: extents.max.z }
    ]
    return corners.every(corner =>
      box.containsPoint(acapStretchPointToLayout(corner, mapper))
    )
  }
}
