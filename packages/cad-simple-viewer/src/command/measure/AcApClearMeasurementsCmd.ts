import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcTrView2d } from '../../view'

/** Cleanup callbacks registered by measurement commands. */
const cleanups: (() => void)[] = []

/**
 * Registers a cleanup function to be called when the Clear Measurements command
 * runs. Used for CAD transient entities, canvas overlays, and viewChanged
 * listeners that are not managed by the htmlTransientManager.
 */
export function registerMeasurementCleanup(fn: () => void): void {
  cleanups.push(fn)
}

/**
 * Runs every measurement-cleanup callback registered via
 * `registerMeasurementCleanup` and clears the measurement HTML overlay
 * layer on the given view. Shared between the user-facing
 * `AcApClearMeasurementsCmd` command and internal lifecycle hooks
 * (e.g. clearing measurements when the user switches paper-space
 * layouts, where any pending measurement would otherwise leak across
 * layouts in coordinates that no longer make sense).
 */
export function clearAllMeasurements(view: AcTrView2d): void {
  cleanups.forEach(fn => fn())
  cleanups.length = 0
  view.htmlTransientManager.clear('measurement')
}

export class AcApClearMeasurementsCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    clearAllMeasurements(context.view as AcTrView2d)
  }
}
