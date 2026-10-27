import { AcDbDimension } from '@mlightcad/data-model'

import { AcApDocManager } from '../../app'
import {
  AcEdPromptAngleOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'

export type DimCommonKeyword = 'mtext' | 'text' | 'angle'

/** Last dimension used by DIMCONTINUE / DIMBASELINE. */
let chainCursorId: string | null = null
let chainBaseId: string | null = null
let baselineStep = 0

/** Record a newly created dimension as the continue cursor and baseline base. */
export function rememberCreatedDimension(objectId: string | undefined | null) {
  if (!objectId) return
  const id = String(objectId)
  chainCursorId = id
  chainBaseId = id
  baselineStep = 0
}

export function getChainCursorId() {
  return chainCursorId
}

export function getChainBaseId() {
  return chainBaseId
}

export function getBaselineStep() {
  return baselineStep
}

/** Continue chains from the new dimension; the baseline origin stays put. */
export function advanceContinueCursor(objectId: string) {
  chainCursorId = String(objectId)
}

export function advanceBaselineStep() {
  baselineStep += 1
}

/** Replace both cursors when the user selects an existing dimension. */
export function selectChainDimension(objectId: string) {
  const id = String(objectId)
  chainCursorId = id
  chainBaseId = id
  baselineStep = 0
}

export {
  allocateDimBlockName,
  applyCurrentDimStyle,
  commitDimBlock,
  definitionPointsFromEntity,
  DIM_PREVIEW_BLOCK,
  ensureDimResources,
  inferLinearRotation,
  isAlignedDimension,
  isRotatedDimension,
  rebuildPreviewBlock,
  removePreviewBlock,
  type DimDefinitionPoints
} from './AcApDimBlockUtil'

export function addDimKeyword(
  prompt: AcEdPromptPointOptions,
  key:
    | DimCommonKeyword
    | 'horizontal'
    | 'vertical'
    | 'rotated'
    | 'xdatum'
    | 'ydatum'
    | 'select',
  i18nPrefix: string
) {
  prompt.keywords.add(
    AcApI18n.t(`${i18nPrefix}.keywords.${key}.display`),
    AcApI18n.t(`${i18nPrefix}.keywords.${key}.global`),
    AcApI18n.t(`${i18nPrefix}.keywords.${key}.local`)
  )
}

export function addCommonDimKeywords(
  prompt: AcEdPromptPointOptions,
  i18nPrefix: string
) {
  addDimKeyword(prompt, 'mtext', i18nPrefix)
  addDimKeyword(prompt, 'text', i18nPrefix)
  addDimKeyword(prompt, 'angle', i18nPrefix)
}

/**
 * Handle Mtext / Text / Angle keywords shared by dimension commands.
 * Returns true if the keyword was handled (caller should re-prompt for location).
 */
export async function handleCommonDimKeyword(
  keyword: string | undefined,
  dim: AcDbDimension,
  i18nPrefix: string
): Promise<boolean> {
  const key = (keyword ?? '').toUpperCase()
  const editor = AcApDocManager.instance.editor

  if (key === 'MTEXT' || key === 'TEXT' || key === 'T' || key === 'M') {
    const prompt = new AcEdPromptStringOptions(
      AcApI18n.t(`${i18nPrefix}.dimensionText`)
    )
    prompt.allowSpaces = true
    const result = await editor.getString(prompt)
    if (result.status === AcEdPromptStatus.OK && result.stringResult != null) {
      dim.dimensionText = result.stringResult
    }
    return true
  }

  if (key === 'ANGLE' || key === 'A') {
    const prompt = new AcEdPromptAngleOptions(
      AcApI18n.t(`${i18nPrefix}.textAngle`)
    )
    prompt.allowNegative = true
    prompt.allowZero = true
    const result = await editor.getAngle(prompt)
    if (result.status === AcEdPromptStatus.OK && result.value != null) {
      // getAngle returns degrees; dimension textRotation is radians.
      dim.textRotation = (result.value * Math.PI) / 180
    }
    return true
  }

  return false
}
