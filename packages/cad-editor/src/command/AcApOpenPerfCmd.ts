import {
  ACAP_PALETTE_NAMED_TAB,
  AcApContext,
  AcApOpenFileProfiler,
  AcApPaletteService,
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
    AcApPaletteService.openNamedTab(ACAP_PALETTE_NAMED_TAB.openFileProfile)
  }
}
