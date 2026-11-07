import {
  AcDbDatabaseConverterManager
} from '@mlightcad/data-model'

import { AcDbSvgConverter } from './AcDbSvgConverter'
import { ACDB_SVG_FILE_TYPE } from './AcDbSvgFileType'

/**
 * Registers {@link AcDbSvgConverter} for the `'svg'` converter key.
 *
 * Host apps (cad-editor, demos) should call this once at startup so File →
 * Open and `openUri` can load `.svg` drawings. `@mlightcad/cad-simple-viewer`
 * does not register the converter by itself.
 */
export function registerSvgConverter(): void {
  const converter = new AcDbSvgConverter()
  AcDbDatabaseConverterManager.instance.register(ACDB_SVG_FILE_TYPE, converter)
}
