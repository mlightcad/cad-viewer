import type { AcApSystemCommandRegistrar } from '../AcApDrawStyleSession'
import {
  type AcApDrawStyleSessionInstallContext,
  acapInstallDrawStyleSessionAccessory
} from '../AcApDrawStyleSession'
import { AcApClearMeasurementsCmd } from './AcApClearMeasurementsCmd'
import { AcApMeasureAngleCmd } from './AcApMeasureAngleCmd'
import { AcApMeasureArcCmd } from './AcApMeasureArcCmd'
import { AcApMeasureAreaCmd } from './AcApMeasureAreaCmd'
import { AcApMeasureContinuousCmd } from './AcApMeasureContinuousCmd'
import { AcApMeasureDistanceCmd } from './AcApMeasureDistanceCmd'
import { AcApMeasurementExportCmd } from './AcApMeasurementImportExportCmd'
import { AcApMeasurementImportCmd } from './AcApMeasurementImportExportCmd'
import { AcApMeasurementVisibilityCmd } from './AcApMeasurementVisibilityCmd'
import { AcApMeasurePointCmd } from './AcApMeasurePointCmd'

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
