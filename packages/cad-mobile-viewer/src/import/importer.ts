// SPDX-License-Identifier: GPL-3.0-or-later
//
// Camada de importação DWG+DXF (D-2/D-3): valida, converte com o conversor
// registado (LibreDWG para DWG, parser MIT para DXF) e devolve o formato
// intermédio consumido pelo viewer. Nunca lança para falhas esperadas
// (docs/OBJ-0104-m2-i2-libredwg-import-spec.md §3).

import { AcDbDatabase, AcDbFileType } from '@mlightcad/data-model'

import { makeFailure, mapOpenError } from './errors'
import { detectImportFormat, sniffFormat } from './format'
import { DEFAULT_IMPORT_TIMEOUT_MS, MAX_DOCUMENT_BYTES } from './limits'
import type {
  DwgStatus,
  ImportedDocument,
  ImportFormat,
  ImportLayout,
  ImportOutcome,
  ImportRequest,
  OpenedPayloadShape
} from './types'

export interface LoadInput {
  name: string
  format: ImportFormat
  bytes: ArrayBuffer
}

/** Converte `bytes` numa base de dados; lança em caso de falha. */
export type DocumentLoader = (input: LoadInput) => Promise<AcDbDatabase>

/** Loader por omissão: `AcDbDatabase.read` com os conversores registados. */
export const defaultLoader: DocumentLoader = async ({
  name,
  format,
  bytes
}) => {
  const db = new AcDbDatabase()
  await db.read(
    bytes,
    { readOnly: true, fileName: name },
    format === 'dwg' ? AcDbFileType.DWG : AcDbFileType.DXF
  )
  return db
}

export interface ImportDeps {
  /** Estado devolvido por `registerDwg`. */
  dwg: DwgStatus
  load?: DocumentLoader
  timeoutMs?: number
}

interface LayoutLike {
  layoutName?: string
  tabOrder?: number
  blockTableRecordId?: string
}

/**
 * Layouts por `tabOrder`; mesma regra que `acapListFindLayouts`
 * (findDrawing.ts:82-99; teste de deriva).
 */
export function listLayouts(db: {
  objects?: { layout?: { newIterator?(): Iterable<LayoutLike> } }
}): ImportLayout[] {
  const table = db.objects?.layout
  if (!table?.newIterator) return []
  const layouts: ImportLayout[] = []
  for (const layout of table.newIterator()) {
    if (!layout.blockTableRecordId) continue
    layouts.push({
      name: layout.layoutName ?? '',
      btrId: layout.blockTableRecordId,
      tabOrder: Number(layout.tabOrder) || 0
    })
  }
  return layouts.sort(
    (a, b) => a.tabOrder - b.tabOrder || a.name.localeCompare(b.name)
  )
}

/** O layout «Model» (modelo) se existir; senão o primeiro por `tabOrder`. */
export function pickActiveLayout(layouts: ImportLayout[]): ImportLayout | null {
  return (
    layouts.find(l => l.name.toLowerCase() === 'model') ?? layouts[0] ?? null
  )
}

const TIMED_OUT = Symbol('timed-out')

export async function importDocument(
  request: ImportRequest,
  deps: ImportDeps
): Promise<ImportOutcome> {
  const fail = (failure: ReturnType<typeof makeFailure>): ImportOutcome => ({
    ok: false,
    failure
  })
  try {
    const { name, bytes } = request
    const format = typeof name === 'string' ? detectImportFormat(name) : null
    if (!format) {
      return fail(
        makeFailure('unsupported-ext', 'validate', 'extensão não é .dwg/.dxf')
      )
    }
    const byteLength = (bytes as { byteLength?: unknown } | null)?.byteLength
    if (typeof byteLength !== 'number') {
      return fail(makeFailure('read-failed', 'validate', 'sem bytes'))
    }
    if (byteLength === 0) {
      return fail(makeFailure('read-failed', 'validate', 'ficheiro vazio'))
    }
    if (byteLength > MAX_DOCUMENT_BYTES[format]) {
      return fail(
        makeFailure('too-large', 'validate', `${byteLength} bytes (${format})`)
      )
    }
    if (
      request.declaredSize !== undefined &&
      request.declaredSize !== byteLength
    ) {
      return fail(
        makeFailure(
          'read-failed',
          'validate',
          `tamanho real ${byteLength} ≠ anunciado ${request.declaredSize}`
        )
      )
    }

    const sniff = sniffFormat(format, bytes)
    if (!sniff.ok) {
      return fail(
        makeFailure('parse', 'sniff', `cabeçalho inválido (${sniff.reason})`)
      )
    }
    if (format === 'dwg' && deps.dwg === 'unavailable') {
      return fail(
        makeFailure('dwg-unavailable', 'validate', 'estado: unavailable')
      )
    }

    const load = deps.load ?? defaultLoader
    const timeoutMs = deps.timeoutMs ?? DEFAULT_IMPORT_TIMEOUT_MS
    let timer: ReturnType<typeof setTimeout> | undefined
    let database: AcDbDatabase | typeof TIMED_OUT
    try {
      database = await Promise.race([
        load({ name, format, bytes }),
        new Promise<typeof TIMED_OUT>(resolve => {
          timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs)
        })
      ])
    } catch (error) {
      return fail(mapOpenError(error, { format, stage: 'convert' }))
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
    if (database === TIMED_OUT) {
      return fail(makeFailure('timeout', 'convert', `> ${timeoutMs} ms`))
    }

    const layouts = listLayouts(database)
    const active = pickActiveLayout(layouts)
    if (!active) {
      return fail(makeFailure('parse', 'inspect', 'documento sem layouts'))
    }
    const document: ImportedDocument = {
      name,
      format,
      byteLength,
      layouts,
      activeLayoutId: active.btrId,
      database
    }
    if (sniff.dwgVersion) document.dwgVersion = sniff.dwgVersion
    return { ok: true, document }
  } catch (error) {
    // salvaguarda: um defeito interno nunca escapa como excepção
    return fail(
      mapOpenError(error, {
        format: detectImportFormat(request?.name ?? '') ?? 'dxf',
        stage: 'inspect'
      })
    )
  }
}

/** Projecção exacta de `OpenedPayload` (§5.2); `database` não atravessa a ponte. */
export function toOpenedPayload(doc: ImportedDocument): OpenedPayloadShape {
  return {
    name: doc.name,
    format: doc.format,
    layouts: doc.layouts.map(l => ({ ...l })),
    activeLayoutId: doc.activeLayoutId
  }
}
