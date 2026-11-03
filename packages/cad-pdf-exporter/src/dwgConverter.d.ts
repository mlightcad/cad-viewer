/**
 * Ambient types for the optional peer `@mlightcad/dwg-converter`.
 * Keeps this package typechecking when that private package is not installed.
 */
declare module '@mlightcad/dwg-converter' {
  import type { AcDbDatabaseConverterConfig } from '@mlightcad/data-model'

  export interface AcDbDwgConverterConfig extends AcDbDatabaseConverterConfig {
    licenseKey?: string
  }

  export class AcDbDwgConverter {
    constructor(config?: AcDbDwgConverterConfig)
  }
}
