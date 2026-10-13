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
  /**
   * Abortado pelo importador quando o tempo expira. O loader deve parar o que
   * puder e TERMINAR (resolver ou rejeitar): a importação seguinte só começa
   * depois disso.
   */
  signal?: AbortSignal
  /** Tempo máximo da conversão (também usado pelo timeout do worker). */
  timeoutMs?: number
}

/**
 * Converte `bytes` numa base de dados; lança em caso de falha.
 *
 * Obrigações de um loader (spec §3.1): terminar sempre; se mudar a base de
 * trabalho global e falhar, repô-la (o importador só repõe a que o loader
 * devolveu); nunca a mudar depois de terminar.
 */
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

/** Repõe `previous` só se a global ainda for `database` (nunca pisa outro dono). */
function rollbackWorkingDatabase(
  database: unknown,
  previous: AcDbDatabase | null
): void {
  if (currentWorkingDatabase() === database) setWorkingDatabase(previous)
}

/**
 * Posse da base de trabalho global: uma importação de cada vez, desde a captura
 * da base anterior até à inspecção ou, depois de um timeout, até o loader
 * terminar de facto (`AcDbDatabase.read` não aceita AbortSignal). Assim duas
 * aberturas sobrepostas nunca capturam uma base em curso como «anterior».
 */
let workingDatabaseTail: Promise<void> = Promise.resolve()

function claimWorkingDatabase(): { ready: Promise<void>; release(): void } {
  let release!: () => void
  const held = new Promise<void>(resolve => {
    release = resolve
  })
  const ready = workingDatabaseTail
  workingDatabaseTail = ready.then(() => held)
  return { ready, release }
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
 * objectos sem dono resolvem-se contra ela) e não aceita AbortSignal. Por isso,
 * mesmo abortada, a nova base continua a ser a de trabalho enquanto o `read`
 * corre (a conversão nunca se resolve contra o documento anterior); quando o
 * `read` falha ou termina depois do abort, a anterior é reposta — só se a global
 * ainda for a nossa. Em sucesso a nova base mantém-se como a de trabalho.
 * Só é seguro através de `importDocument`, que serializa as importações.
 */
export const defaultLoader: DocumentLoader = async ({
  name,
  format,
  bytes,
  signal,
  timeoutMs
}) => {
  if (signal?.aborted) throw abortError()
  const previous = currentWorkingDatabase()
  const db = new AcDbDatabase()
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
    rollbackWorkingDatabase(db, previous)
    throw error
  }
  if (signal?.aborted) {
    // conclusão tardia: ninguém vai usar este resultado (a referência morre aqui)
    rollbackWorkingDatabase(db, previous)
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
    // o tempo conta desde aqui, incluindo a espera por uma importação anterior
    const claim = claimWorkingDatabase()
    let releaseWhenSettled = false
    try {
      let previous: AcDbDatabase | null = null
      const loading = claim.ready.then(() => {
        // expirou ainda na fila: o loader nunca chega a ser chamado
        if (controller.signal.aborted) throw abortError()
        previous = currentWorkingDatabase()
        return load({
          name,
          format,
          bytes,
          signal: controller.signal,
          timeoutMs
        })
      })
      // se o tempo expirar, um resultado ou erro tardio é descartado sem ruído
      loading.catch(() => undefined)
      let timer: ReturnType<typeof setTimeout> | undefined
      let database: AcDbDatabase | typeof TIMED_OUT
      try {
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
        // sinaliza o loader; a posse só é largada quando ele terminar de facto,
        // e um resultado tardio nunca fica como base de trabalho
        controller.abort()
        releaseWhenSettled = true
        void loading
          .then(late => rollbackWorkingDatabase(late, previous))
          .catch(() => undefined)
          .then(claim.release)
        return fail(makeFailure('timeout', 'convert', `> ${timeoutMs} ms`))
      }

      let committed = false
      try {
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
        committed = true
        return { ok: true, document }
      } finally {
        // inspecção falhou (sem layouts ou excepção): repõe a base anterior
        if (!committed) rollbackWorkingDatabase(database, previous)
      }
    } finally {
      if (!releaseWhenSettled) claim.release()
    }
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
