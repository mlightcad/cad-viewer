import { AcApContext } from '../app'
import { AcEdCommand, AcEdOpenMode } from '../editor'
import { AcTrView2d } from '../view'

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

export class AcApClearMeasurementsCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    // Run registered cleanups (CAD transients, canvas overlays, listeners)
    cleanups.forEach(fn => fn())
    cleanups.length = 0

    // Clear all HTML transient overlays in the measurement layer
    ;(context.view as AcTrView2d).htmlTransientManager.clear('measurement')
  }
}
