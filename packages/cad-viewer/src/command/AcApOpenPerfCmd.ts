import {
  AcApContext,
  AcApOpenFileProfiler,
  AcEdCommand
} from '@mlightcad/cad-simple-viewer'

import { store } from '../app'
import { publishOpenFileProfile } from '../composable/useOpenFileProfile'

/**
 * Opens the Open Performance palette with the latest document-open profile.
 *
 * Profiles are collected automatically on every open; use OPENPROF to also
 * print the same report to the console.
 */
export class AcApOpenPerfCmd extends AcEdCommand {
  async execute(_context: AcApContext) {
    publishOpenFileProfile(AcApOpenFileProfiler.getLastSnapshot())
    store.openFileProfileTick++
    store.dialogs.activePaletteTab = 'openFileProfile'
    store.dialogs.layerManager = true
  }
}
