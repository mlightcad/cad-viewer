/**
 * Opt into GPL LibreDWG DWG parsing for this example app.
 * `@mlightcad/cad-simple-viewer` does not register a DWG converter by default.
 */
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

/**
 * Registers LibreDWG as the DWG converter for this example.
 *
 * @param parserWorkerUrl - URL of the LibreDWG parser worker script.
 */
export function registerLibreDwgConverter(parserWorkerUrl: string): void {
  const converter = new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl
  })
  AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
}
