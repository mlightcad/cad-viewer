import type { AcApSystemCommandRegistrar } from '../AcApDrawStyleSession.js'
import {
  type AcApDrawStyleSessionInstallContext,
  acapInstallDrawStyleSessionAccessory
} from '../AcApDrawStyleSession.js'
import { AcApClearMeasurementsCmd } from './AcApClearMeasurementsCmd.js'
import { AcApMeasureAngleCmd } from './AcApMeasureAngleCmd.js'
import { AcApMeasureArcCmd } from './AcApMeasureArcCmd.js'
import { AcApMeasureAreaCmd } from './AcApMeasureAreaCmd.js'
import { AcApMeasureContinuousCmd } from './AcApMeasureContinuousCmd.js'
import { AcApMeasureDistanceCmd } from './AcApMeasureDistanceCmd.js'
import { AcApMeasurementExportCmd } from './AcApMeasurementImportExportCmd.js'
import { AcApMeasurementImportCmd } from './AcApMeasurementImportExportCmd.js'
import { AcApMeasurementVisibilityCmd } from './AcApMeasurementVisibilityCmd.js'
import { AcApMeasurePointCmd } from './AcApMeasurePointCmd.js'

/**
 * Registers measurement commands and installs the shared draw-style session
 * accessory for the view (idempotent).
 */
export function registerMeasureCommands(
  addSystemCommand: AcApSystemCommandRegistrar,
  installCtx: AcApDrawStyleSessionInstallContext
): void {
  acapInstallDrawStyleSessionAccessory(installCtx)

  addSystemCommand(
    'measuredistance',
    'measuredistance',
    new AcApMeasureDistanceCmd()
  )
  addSystemCommand(
    'measurecontinuous',
    'measurecontinuous',
    new AcApMeasureContinuousCmd()
  )
  addSystemCommand('measurearea', 'measurearea', new AcApMeasureAreaCmd())
  addSystemCommand('measureangle', 'measureangle', new AcApMeasureAngleCmd())
  addSystemCommand('measurearc', 'measurearc', new AcApMeasureArcCmd())
  addSystemCommand('measurepoint', 'measurepoint', new AcApMeasurePointCmd())
  addSystemCommand(
    'clearmeasurements',
    'clearmeasurements',
    new AcApClearMeasurementsCmd()
  )
  addSystemCommand(
    'measurementvis',
    'measurementvis',
    new AcApMeasurementVisibilityCmd()
  )
  addSystemCommand(
    'measurementexport',
    'measurementexport',
    new AcApMeasurementExportCmd()
  )
  addSystemCommand(
    'measurementimport',
    'measurementimport',
    new AcApMeasurementImportCmd()
  )
}
