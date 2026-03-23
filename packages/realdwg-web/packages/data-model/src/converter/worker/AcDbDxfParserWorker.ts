/// <reference lib="webworker" />
import { ParsedDxf } from '@mlightcad/dxf-json'

import { AcDbDxfParser } from '../AcDbDxfParser'
import { AcDbBaseWorker } from './AcDbBaseWorker'

/**
 * DXF parsing worker
 */
class AcDbDxfParserWorker extends AcDbBaseWorker<ArrayBuffer, ParsedDxf> {
  protected async executeTask(data: ArrayBuffer): Promise<ParsedDxf> {
    const parser = new AcDbDxfParser()
    return parser.parse(data)
  }
}

// Initialize the worker
export const dxfParser = new AcDbDxfParserWorker()
