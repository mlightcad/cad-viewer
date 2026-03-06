import { AcApContext } from '../app'
import { AcEdCommand, AcEdOpenMode } from '../editor'
import { eventBus } from '../editor/global/eventBus'

/** CAD transient entity cleanup callbacks registered by measurement commands. */
const cleanups: (() => void)[] = []

/**
 * Registers a cleanup function to be called when the Clear Measurements command
 * runs. Use this only for CAD transient entities — DOM overlays are managed by
 * the `useMeasurements` composable in `cad-viewer` via the `measurements-cleared` event.
 */
export function registerMeasurementCleanup(fn: () => void): void {
  cleanups.push(fn)
}

export class AcApClearMeasurementsCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(_context: AcApContext) {
    cleanups.forEach(fn => fn())
    cleanups.length = 0
    // Notify the useMeasurements composable to remove all DOM overlays
    eventBus.emit('measurements-cleared', undefined)
  }
}