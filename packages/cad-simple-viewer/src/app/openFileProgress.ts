import { AcDbProgressdEventArgs } from '@mlightcad/data-model'

/**
 * Returns whether an open-file progress event represents a terminal state.
 *
 * CONVERSION completes with subStage `END`. After `openUri` finishes parsing,
 * data-model also emits a trailing FETCH_FILE event at 100% with
 * subStageStatus `END` but no subStage — that must hide the overlay too.
 *
 * Leading FETCH_FILE END (download finished, convert about to start) must
 * **not** be treated as complete: hiding there briefly clears the spinner and
 * it flashes back when CONVERSION starts.
 *
 * @param conversionEnded - True after this open has already seen
 *   CONVERSION/`END`. Distinguishes trailing vs leading FETCH_FILE END.
 */
export function isOpenFileProgressComplete(
  data: AcDbProgressdEventArgs,
  conversionEnded = false
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

  if (data.stage === 'FETCH_FILE') {
    return conversionEnded
  }

  return data.subStage === 'END'
}
