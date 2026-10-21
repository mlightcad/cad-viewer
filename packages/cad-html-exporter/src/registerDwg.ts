import {
  type AcDbDatabaseConverter,
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgMainThreadConverter } from '@mlightcad/libredwg-converter/node'

/**
 * Which DWG parser {@link exportFileToHtml} registers for `AcDbFileType.DWG`.
 *
 * - `'libredwg'` — `@mlightcad/libredwg-converter` (default; always available
 *   as a package dependency).
 * - `'dwg'` — commercial `@mlightcad/dwg-converter` (not a declared dependency;
 *   install it yourself when you have registry access + license/trial).
 */
export type AcExDwgParser = 'libredwg' | 'dwg'

export interface AcExDwgParserRegisterOptions {
  /**
   * DWG parser to register. Defaults to `'libredwg'`.
   */
  dwgParser?: AcExDwgParser
  /**
   * Offline license key for `@mlightcad/dwg-converter`.
   * Omit to use that package's evaluation period when still active.
   * Ignored when {@link AcExDwgParserRegisterOptions.dwgParser} is `'libredwg'`.
   */
  dwgLicenseKey?: string
}

let registeredParser: AcExDwgParser | null = null
let registeredLicenseKey: string | undefined

/**
 * Registers the selected DWG parser on the Node main thread.
 *
 * Safe to call multiple times with the same parser (and same license key for
 * `'dwg'`). Switching parsers or license keys replaces the manager registration.
 */
export async function ensureDwgParserRegistered(
  options: AcExDwgParserRegisterOptions = {}
): Promise<void> {
  const parser: AcExDwgParser = options.dwgParser ?? 'libredwg'
  if (
    registeredParser === parser &&
    (parser !== 'dwg' || registeredLicenseKey === options.dwgLicenseKey)
  ) {
    return
  }

  if (parser === 'libredwg') {
    registerLibreDwg()
    registeredLicenseKey = undefined
  } else {
    await registerCommercialDwg(options.dwgLicenseKey)
    registeredLicenseKey = options.dwgLicenseKey
  }
  registeredParser = parser
}

/**
 * Registers LibreDWG for DWG reads (same as
 * {@link ensureDwgParserRegistered} with `dwgParser: 'libredwg'`).
 */
export function ensureLibreDwgRegistered(): void {
  if (registeredParser === 'libredwg') {
    return
  }
  registerLibreDwg()
  registeredParser = 'libredwg'
  registeredLicenseKey = undefined
}

function registerLibreDwg(): void {
  const converter = new AcDbLibreDwgMainThreadConverter({
    convertByEntityType: false
  })
  AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
}

async function registerCommercialDwg(licenseKey?: string): Promise<void> {
  let mod: typeof import('@mlightcad/dwg-converter')
  try {
    mod = await import('@mlightcad/dwg-converter')
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    throw new Error(
      'DWG parser "dwg" requires the optional package @mlightcad/dwg-converter. ' +
        'Install it from GitHub Packages (or your private registry), or use ' +
        'dwgParser: "libredwg" (default). ' +
        `Import failed: ${detail}`
    )
  }

  try {
    const converter = new mod.AcDbDwgConverter({
      convertByEntityType: false,
      useWorker: false,
      licenseKey
    })
    // Ambient typings are intentionally minimal when the peer is absent.
    AcDbDatabaseConverterManager.instance.register(
      AcDbFileType.DWG,
      converter as unknown as AcDbDatabaseConverter
    )
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    throw new Error(
      'Failed to initialize @mlightcad/dwg-converter. Provide a valid ' +
        'dwgLicenseKey, or wait until a trial is available, or use ' +
        'dwgParser: "libredwg". ' +
        `Detail: ${detail}`
    )
  }
}
