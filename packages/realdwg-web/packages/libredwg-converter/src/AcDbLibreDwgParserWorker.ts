/// <reference lib="webworker" />

import { AcDbBaseWorker, AcDbParsingTaskResult } from '@mlightcad/data-model'
import { DwgDatabase } from '@mlightcad/libredwg-web'

import { parseDwg } from './AcDbLibreDwgConverterUtil'
/**
 * DWG parsing worker
 */
class AcDbDwgParserWorker extends AcDbBaseWorker<
  string,
  AcDbParsingTaskResult<DwgDatabase>
> {
  protected async executeTask(dxfString: string) {
    const result = await parseDwg(dxfString)
    return {
      model: result.database,
      data: result.stats
    }
  }
}

// Initialize the worker
new AcDbDwgParserWorker()
