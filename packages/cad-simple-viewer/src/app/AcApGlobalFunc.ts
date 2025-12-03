import {
  AcDbDatabaseConverterManager,
  AcDbDxfConverter,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'
import { AcTrMTextRenderer } from '@mlightcad/three-renderer'

/**
 * Registers file format converters for CAD file processing.
 *
 * This function initializes and registers both DXF and DWG converters with the
 * global database converter manager. Each converter is configured to use web workers
 * for improved performance during file parsing operations.
 *
 * The function handles registration errors gracefully by logging them to the console
 * without throwing exceptions, ensuring that the application can continue to function
 * even if one or more converters fail to register.
 */
export function registerConverters() {
  // Register DXF converter
  try {
    const converter = new AcDbDxfConverter({
      convertByEntityType: false,
      useWorker: true,
      parserWorkerUrl: './assets/dxf-parser-worker.js'
    })
    AcDbDatabaseConverterManager.instance.register(AcDbFileType.DXF, converter)
  } catch (error) {
    console.error('Failed to register dxf converter: ', error)
  }

  // Register DWG converter
  try {
    const converter = new AcDbLibreDwgConverter({
      convertByEntityType: false,
      useWorker: true,
      parserWorkerUrl: './assets/libredwg-parser-worker.js'
    })
    AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
  } catch (error) {
    console.error('Failed to register dwg converter: ', error)
  }
}

/**
 * Initializes background workers used by the viewer runtime.
 *
 * This function performs two tasks:
 * - Ensures DXF/DWG converters are registered with worker-based parsers for
 *   off-main-thread file processing.
 * - Initializes the MText renderer by pointing it to its dedicated Web Worker
 *   script for text layout and shaping.
 *
 * The function is safe to call during application startup. Errors during
 * initialization are handled inside the respective registration routines.
 */
export function registerWorkers() {
  registerConverters()
  const isDev =
    typeof window !== 'undefined' &&
    !!window.location &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
  if (isDev) {
    AcTrMTextRenderer.getInstance().initialize(
      '/assets/mtext-renderer-worker.js'
    )
  } else {
    AcTrMTextRenderer.getInstance().initialize('./mtext-renderer-worker.js')
  }
}
