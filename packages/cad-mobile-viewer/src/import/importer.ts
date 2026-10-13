// SPDX-License-Identifier: GPL-3.0-or-later
//
// Camada de importação DWG+DXF (D-2/D-3): valida, converte com o conversor
// registado (LibreDWG para DWG, parser MIT para DXF) e devolve o formato
// intermédio consumido pelo viewer. Nunca lança para falhas esperadas
// (docs/OBJ-0104-m2-i2-libredwg-import-spec.md §3).

import {
  acdbAssignWorkingDatabase,
  AcDbDatabase,
  AcDbFileType,
  acdbGetWorkingDatabase
} from '@mlightcad/data-model'

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
  /** Abortado pelo importador ao expirar o tempo; o loader deve libertar recursos. */
  signal?: AbortSignal
  /** Tempo máximo da conversão (também usado pelo timeout do worker). */
  timeoutMs?: number
}

/** Converte `bytes` numa base de dados; lança em caso de falha. */
export type DocumentLoader = (input: LoadInput) => Promise<AcDbDatabase>

/** Base de dados de trabalho global, ou `null` se ainda não existe nenhuma. */
function currentWorkingDatabase(): AcDbDatabase | null {
  try {
    return acdbGetWorkingDatabase()
  } catch {
    return null
  }
}

/** `AcDbDatabase.read` instala-se como base de trabalho global (estado partilhado). */
function setWorkingDatabase(database: AcDbDatabase | null): void {
  acdbAssignWorkingDatabase(database as AcDbDatabase)
}

function abortError(): Error {
  const error = new Error('importação cancelada')
  error.name = 'AbortError'
  return error
}

/**
 * Loader por omissão: `AcDbDatabase.read` com os conversores registados.
 *
 * O `read` substitui a base de dados de trabalho global ANTES de converter (os
 * objectos sem dono resolvem-se contra ela). Para que uma falha, um timeout ou
 * uma conclusão tardia não deixem esse estado apontado a uma base de dados
 * descartada, a anterior é restaurada nesses casos — só se a global ainda for a
 * nossa (nunca se sobrepõe a uma importação posterior). Em sucesso a nova base
 * mantém-se como a de trabalho.
 */
export const defaultLoader: DocumentLoader = async ({
  name,
  format,
  bytes,
  signal,
  timeoutMs
}) => {
  const previous = currentWorkingDatabase()
  const db = new AcDbDatabase()
  const restore = () => {
    if (currentWorkingDatabase() === db) setWorkingDatabase(previous)
  }
  signal?.addEventListener('abort', restore, { once: true })
  try {
    await db.read(
      bytes,
      {
        readOnly: true,
        fileName: name,
        ...(timeoutMs !== undefined ? { timeout: timeoutMs } : {})
      },
      format === 'dwg' ? AcDbFileType.DWG : AcDbFileType.DXF
    )
  } catch (error) {
    restore()
    throw error
  } finally {
    signal?.removeEventListener('abort', restore)
  }
  if (signal?.aborted) {
    // conclusão tardia: ninguém vai usar este resultado (a referência morre aqui)
    restore()
    throw abortError()
  }
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
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let database: AcDbDatabase | typeof TIMED_OUT
    try {
      const loading = load({
        name,
        format,
        bytes,
        signal: controller.signal,
        timeoutMs
      })
      // se o tempo expirar, um resultado ou erro tardio é descartado sem ruído
      loading.catch(() => undefined)
      database = await Promise.race([
        loading,
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
      // sinaliza o loader (restaura a base de trabalho e liberta recursos)
      controller.abort()
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
