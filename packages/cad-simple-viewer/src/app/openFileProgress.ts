import { AcDbProgressdEventArgs } from '@mlightcad/data-model'

/**
 * Returns whether an open-file progress event represents a terminal state.
 *
 * CONVERSION completes with subStage `END`. After `openUri` finishes parsing,
 * data-model also emits a trailing FETCH_FILE event at 100% with
 * subStageStatus `END` but no subStage — that must hide the overlay too.
 */
export function isOpenFileProgressComplete(
  data: AcDbProgressdEventArgs
): boolean {
  if (data.percentage < 100) {
    return false
  }

  if (data.subStageStatus === 'ERROR') {
    return true
  }

  if (data.subStageStatus !== 'END') {
    return false
  }

  return data.stage === 'FETCH_FILE' || data.subStage === 'END'
}
