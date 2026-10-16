import {
  AcDbDatabaseConverterManager,
  AcDbFileType,
  type AcDbParsingTaskResult
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'
import {
  Dwg_File_Type,
  type DwgDatabase,
  LibreDwg
} from '@mlightcad/libredwg-web'

let registered = false

/**
 * LibreDWG converter that parses on the Node main thread.
 *
 * The stock {@link AcDbLibreDwgConverter} requires browser Web Workers + WASM
 * loaded via the worker build. Node has neither a browser Worker nor a reliable
 * ESM-worker WASM path, so we call LibreDwg directly here.
 */
class AcExNodeLibreDwgConverter extends AcDbLibreDwgConverter {
  protected override async parse(
    data: ArrayBuffer
  ): Promise<AcDbParsingTaskResult<DwgDatabase>> {
    const libredwg = await LibreDwg.create()
    if (libredwg == null) {
      throw new Error('libredwg is not loaded!')
    }

    const dwgDataPtr = libredwg.dwg_read_data(data, Dwg_File_Type.DWG)
    if (dwgDataPtr == null) {
      throw new Error('Failed to read dwg data!')
    }

    try {
      const result = libredwg.convertEx(dwgDataPtr)
      return {
        model: result.database,
        data: result.stats
      }
    } finally {
      libredwg.dwg_free(dwgDataPtr)
    }
  }
}

/**
 * Registers LibreDWG for DWG reads on the Node main thread.
 * Safe to call multiple times.
 */
export function ensureLibreDwgRegistered(): void {
  if (registered) {
    return
  }
  const converter = new AcExNodeLibreDwgConverter({
    convertByEntityType: false,
    useWorker: false
  })
  AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
  registered = true
}
