import {
  AcApContext,
  AcApI18n,
  AcApMemoryProfiler,
  AcEdCommand,
  AcTrView2d
} from '@mlightcad/cad-simple-viewer'

import { store } from '../app'
import { publishMemorySnapshot } from '../composable/useMemoryProfile'

/**
 * Opens the Memory profiling palette for diagnosing drawing memory usage.
 *
 * Collects the snapshot under the application busy overlay before opening the
 * palette so the spinner stays visible for the expensive work.
 */
export class AcApMemCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    const snapshot = await this.withBusyIndicator(
      () =>
        AcApMemoryProfiler.collect(
          context.view as AcTrView2d,
          context.doc.database
        ),
      AcApI18n.t('main.message.collectingMemoryProfile')
    )

    publishMemorySnapshot(snapshot)
    store.memoryProfileTick++
    store.dialogs.activePaletteTab = 'memoryProfile'
    store.dialogs.layerManager = true
  }
}
