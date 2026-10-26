/**
 * Opt into GPL LibreDWG DWG parsing for this example app.
 * `@mlightcad/cad-simple-viewer` / `@mlightcad/cad-viewer` do not register a
 * DWG converter by default.
 */
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

export function registerLibreDwgConverter(parserWorkerUrl: string): void {
  const converter = new AcDbLibreDwgConverter({
    convertByEntityType: false,
    useWorker: true,
    parserWorkerUrl
  })
  AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
}
