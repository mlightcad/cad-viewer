// SPDX-License-Identifier: GPL-3.0-or-later
//
// Sonda de cobertura do conversor DWG (OBJ-0104 M2-I3, spec §3.3). O
// `AcDbEntityConverter` do LibreDWG devolve `null` para os tipos que não
// conhece e nada fica registado: esta subclasse conta-os depois do `parse`
// (modelo bruto) sem tocar no pacote upstream (D-2/D-5). Continua a ser um
// `AcDbLibreDwgConverter` com a mesma configuração.

import type {
  AcDbDatabaseConverter,
  AcDbDatabaseConverterConfig,
  AcDbParsingTaskResult
} from '@mlightcad/data-model'
import {
  AcDbDatabaseConverterManager,
  AcDbFileType
} from '@mlightcad/data-model'
import { AcDbLibreDwgConverter } from '@mlightcad/libredwg-converter'

import { type DwgModelLike, tallyDwgModelTypes } from './scan'
import type { TypeCounts } from './types'

/** Fonte de relatórios de cobertura (conversor que sabe o que descartou). */
export interface DwgCoverageSource {
  /** Devolve e limpa o relatório da última conversão. */
  takeReport(): TypeCounts
}

export class DwgCoverageConverter
  extends AcDbLibreDwgConverter
  implements DwgCoverageSource
{
  private lastReport: TypeCounts = {}

  constructor(config?: AcDbDatabaseConverterConfig) {
    super(config)
  }

  protected override async parse(
    data: ArrayBuffer,
    timeout?: number
  ): Promise<AcDbParsingTaskResult<never>> {
    const result = await super.parse(data, timeout)
    try {
      this.lastReport = tallyDwgModelTypes(result.model as DwgModelLike)
    } catch {
      // a sonda nunca pode estragar a conversão
      this.lastReport = {}
    }
    return result as AcDbParsingTaskResult<never>
  }

  takeReport(): TypeCounts {
    const report = this.lastReport
    this.lastReport = {}
    return report
  }
}

export function isDwgCoverageSource(
  value: unknown
): value is DwgCoverageSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as DwgCoverageSource).takeReport === 'function'
  )
}

/**
 * O relatório do conversor DWG registado (ou `undefined` se o registado não
 * for uma sonda, p.ex. um conversor de teste). Chamar logo após
 * `importDocument` — o relatório é por conversor, não por documento.
 */
export function dwgCoverageSource(
  manager: {
    get(fileType: string): AcDbDatabaseConverter<unknown> | undefined
  } = AcDbDatabaseConverterManager.instance as never
): DwgCoverageSource | undefined {
  const converter = manager.get(AcDbFileType.DWG)
  return isDwgCoverageSource(converter) ? converter : undefined
}
