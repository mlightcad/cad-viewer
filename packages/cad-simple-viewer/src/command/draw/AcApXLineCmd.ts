import { AcDbLine, AcGePoint3d, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptDoubleOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

const ACAP_XLINE_MIN_VECTOR_LENGTH = 1e-9
const ACAP_XLINE_HALF_LENGTH = 1_000_000

type XLineMode = 'point' | 'hor' | 'ver' | 'ang'

/**
 * Command to create AutoCAD-style construction lines.
 *
 * This implementation supports the core XLINE branches:
 * - `Point`: two-point definition.
 * - `Hor`: horizontal xline through a point.
 * - `Ver`: vertical xline through a point.
 * - `Ang`: xline at a user-specified angle through a point.
 */
export class AcApXLineCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    let currentMode: XLineMode = 'point'

    while (true) {
      const startPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.xline.firstPointOrOptions')
      )
      startPrompt.keywords.add(
        AcApI18n.t('jig.xline.keywords.hor.display'),
        AcApI18n.t('jig.xline.keywords.hor.global'),
        AcApI18n.t('jig.xline.keywords.hor.local')
      )
      startPrompt.keywords.add(
        AcApI18n.t('jig.xline.keywords.ver.display'),
        AcApI18n.t('jig.xline.keywords.ver.global'),
        AcApI18n.t('jig.xline.keywords.ver.local')
      )
      startPrompt.keywords.add(
        AcApI18n.t('jig.xline.keywords.ang.display'),
        AcApI18n.t('jig.xline.keywords.ang.global'),
        AcApI18n.t('jig.xline.keywords.ang.local')
      )
      const startResult =
        await AcApDocManager.instance.editor.getPoint(startPrompt)
      if (startResult.status === AcEdPromptStatus.Keyword) {
        if (startResult.stringResult === 'Hor') {
          currentMode = 'hor'
        } else if (startResult.stringResult === 'Ver') {
          currentMode = 'ver'
        } else if (startResult.stringResult === 'Ang') {
          currentMode = 'ang'
        }
      } else if (
        startResult.status === AcEdPromptStatus.OK &&
        startResult.value
      ) {
        currentMode = 'point'
        const secondPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.xline.secondPoint')
        )
        secondPrompt.useBasePoint = true
        secondPrompt.useDashedLine = true
        secondPrompt.basePoint = new AcGePoint3d(startResult.value)
        const secondResult =
          await AcApDocManager.instance.editor.getPoint(secondPrompt)
        if (secondResult.status !== AcEdPromptStatus.OK || !secondResult.value)
          return

        const direction = {
          x: secondResult.value.x - startResult.value.x,
          y: secondResult.value.y - startResult.value.y,
          z: secondResult.value.z - startResult.value.z
        }
        if (!this.appendFiniteXLine(context, startResult.value, direction)) {
          AcApDocManager.instance.editor.showMessage(
            AcApI18n.t('jig.xline.invalidDirection'),
            'warning'
          )
        }
        continue
      } else {
        return
      }

      if (currentMode === 'hor') {
        const throughPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.xline.throughPoint')
        )
        const throughResult =
          await AcApDocManager.instance.editor.getPoint(throughPrompt)
        if (
          throughResult.status !== AcEdPromptStatus.OK ||
          !throughResult.value
        )
          return
        this.appendFiniteXLine(context, throughResult.value, {
          x: 1,
          y: 0,
          z: 0
        })
        continue
      }
      if (currentMode === 'ver') {
        const throughPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.xline.throughPoint')
        )
        const throughResult =
          await AcApDocManager.instance.editor.getPoint(throughPrompt)
        if (
          throughResult.status !== AcEdPromptStatus.OK ||
          !throughResult.value
        )
          return
        this.appendFiniteXLine(context, throughResult.value, {
          x: 0,
          y: 1,
          z: 0
        })
        continue
      }

      const anglePrompt = new AcEdPromptDoubleOptions(
        AcApI18n.t('jig.xline.angle')
      )
      const angleResult =
        await AcApDocManager.instance.editor.getDouble(anglePrompt)
      if (
        angleResult.status !== AcEdPromptStatus.OK ||
        angleResult.value == null
      )
        return

      const throughPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.xline.throughPoint')
      )
      const throughResult =
        await AcApDocManager.instance.editor.getPoint(throughPrompt)
      if (throughResult.status !== AcEdPromptStatus.OK || !throughResult.value)
        return

      const angleRad = (angleResult.value * Math.PI) / 180
      this.appendFiniteXLine(context, throughResult.value, {
        x: Math.cos(angleRad),
        y: Math.sin(angleRad),
        z: 0
      })
    }
  }

  /**
   * Creates one long finite line to mimic an infinite construction line.
   *
   * The underlying viewer already understands infinite entities, but this
   * fallback keeps XLINE behavior stable without relying on runtime-specific
   * infinite-entity constructors.
   */
  private appendFiniteXLine(
    context: AcApContext,
    throughPoint: AcGePoint3dLike,
    direction: AcGePoint3dLike
  ) {
    const unit = this.normalizeDirection(direction)
    if (!unit) return false

    const start = new AcGePoint3d(
      throughPoint.x - unit.x * ACAP_XLINE_HALF_LENGTH,
      throughPoint.y - unit.y * ACAP_XLINE_HALF_LENGTH,
      throughPoint.z - unit.z * ACAP_XLINE_HALF_LENGTH
    )
    const end = new AcGePoint3d(
      throughPoint.x + unit.x * ACAP_XLINE_HALF_LENGTH,
      throughPoint.y + unit.y * ACAP_XLINE_HALF_LENGTH,
      throughPoint.z + unit.z * ACAP_XLINE_HALF_LENGTH
    )
    context.doc.database.tables.blockTable.modelSpace.appendEntity(
      new AcDbLine(start, end)
    )
    return true
  }

  private normalizeDirection(vector: AcGePoint3dLike) {
    const length = Math.sqrt(
      vector.x * vector.x + vector.y * vector.y + vector.z * vector.z
    )
    if (length <= ACAP_XLINE_MIN_VECTOR_LENGTH) return undefined
    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length
    }
  }
}
