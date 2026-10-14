// SPDX-License-Identifier: GPL-3.0-or-later
//
// Sessão do viewer (OBJ-0104 M3-I4, docs/OBJ-0104-m3-i4-hardening-spec.md §2):
// liga o importador real (I2), o mapa de entidades e o índice FIND (I3) ao
// protocolo v1 (§5.2), com a vista real atrás de uma porta (`ViewPort`).
// Regra única: nenhuma falha é escondida — cada caminho termina numa resposta
// explícita (`openFailed`, `error{code}`, `findActive{outcome}` ou `log`), e a
// vista só recebe caixas validadas.

import {
  type AcApFindDrawingOptions,
  type AcApFindDrawingResult,
  type AcApFindLayoutHit,
  acapFindText
} from '@mlightcad/cad-simple-viewer/find'
import {
  acdbAssignWorkingDatabase,
  type AcDbDatabase,
  acdbGetWorkingDatabase
} from '@mlightcad/data-model'

import {
  makeFailure,
  redactDetail,
  toOpenFailedPayload
} from '../import/errors'
import {
  type DocumentLoader,
  importDocument,
  toOpenedPayload
} from '../import/importer'
import { readOpenSource } from '../import/source'
import type {
  DwgStatus,
  ImportedDocument,
  ImportFailure
} from '../import/types'
import {
  describeCoverage,
  type DocumentMap,
  mapDocument
} from '../model/documentMap'
import { dwgCoverageSource } from '../model/dwgCoverage'
import {
  buildFindIndex,
  type FindIndex,
  type FindIndexEntry
} from '../model/findIndex'
import { scanDxfEntityTypes } from '../model/scan'
import type {
  CoverageReport,
  TypeCounts,
  ViewBox,
  ViewBoxReason
} from '../model/types'
import {
  type AppMessage,
  type ErrorPayload,
  FIND_MAX_RESULTS,
  type FindOutcome,
  type FindPayload,
  type FindResultPayload,
  type FindStepPayload,
  type GotoPayload,
  type Insets,
  isFindOutcome,
  isValidFindResult,
  isValidOpenedPayload,
  type OpenPayload,
  type ViewerErrorCode,
  type ViewerOutput,
  type ZoomPayload
} from './protocol'
import { scaleViewBox, usableViewBox } from './zoom'

/** Pedido de navegação a um hit, já validado pela sessão. */
export interface NavigateTarget {
  /** Hit original de `acapFindText` (o que `acapNavigateToFindHit` recebe). */
  hit: AcApFindLayoutHit
  entry: FindIndexEntry
  /**
   * Caixa de zoom (`acapFindHitBox`) já validada pela sessão (finita, não
   * degenerada). É a ÚNICA caixa com que a vista pode enquadrar o hit.
   */
  box: ViewBox
  insets?: Insets
  /**
   * Abortado quando a navegação deixa de ser a actual (`clearHighlight`, `find`,
   * `open`, outra navegação). Depois do abort a vista NÃO pode alterar o
   * realce, a selecção nem o zoom; o resultado é descartado como `stale`.
   */
  signal: AbortSignal
}

/**
 * Vista real (WebGL) vista pela sessão. Qualquer método pode lançar: a sessão
 * converte a excepção num erro explícito.
 */
export interface ViewPort {
  /** `btrId` do layout mostrado, ou `null` sem vista. */
  activeLayoutId(): string | null
  /** Caixa WCS visível no canvas, ou `null` se indisponível. */
  visibleBox(): ViewBox | null
  zoomTo(box: ViewBox, margin: number): void
  clearSelection(): void
  /**
   * Activa o layout do hit, enquadra `target.box` e selecciona a entidade.
   * Honra `target.signal`; lança se não conseguir enquadrar `target.box`.
   */
  navigate(target: NavigateTarget): Promise<FindOutcome> | FindOutcome
}

export type FindTextFn = (
  db: AcDbDatabase,
  query: string,
  options: AcApFindDrawingOptions
) => AcApFindDrawingResult

/**
 * Log explícito quando o `extents` cai na vista por omissão (`viewBoxReason`
 * ≠ `'extents'`): o utilizador nunca vê uma vista «inventada» sem explicação.
 * `empty-layout` é informativo; os outros motivos (entidades que existem mas
 * não são desenháveis/mapeadas) são avisos.
 */
export function defaultViewNotice(
  layoutName: string,
  reason: ViewBoxReason
): { level: 'info' | 'warn'; message: string } | null {
  switch (reason) {
    case 'extents':
      return null
    case 'empty-layout':
      return {
        level: 'info',
        message: `layout «${layoutName}» sem entidades visíveis: vista por omissão`
      }
    case 'no-renderable-extents':
      return {
        level: 'warn',
        message: `layout «${layoutName}» com entidades sem limites desenháveis (invisíveis, inválidas ou ilimitadas): vista por omissão`
      }
    case 'truncated-layout':
      return {
        level: 'warn',
        message: `layout «${layoutName}» não mapeado (limite de entidades excedido): vista por omissão`
      }
  }
}

export interface ViewerSessionDeps {
  view: ViewPort
  /** Estado devolvido por `registerDwg`. */
  dwg: DwgStatus
  load?: DocumentLoader
  timeoutMs?: number
  /** Leitura de `open.source.kind === 'url'` (servidor loopback, I5). */
  fetchBytes?: (url: string) => Promise<ArrayBuffer>
  findText?: FindTextFn
  /**
   * Tipos descartados pelo conversor/parser; `undefined` = cobertura
   * desconhecida (reportada por `log{warn}`, nunca assumida completa).
   */
  coverage?: (
    doc: ImportedDocument,
    bytes: ArrayBuffer
  ) => TypeCounts | undefined
  /** Desfaz um documento importado mas recusado (repõe o estado partilhado). */
  discard?: (
    failed: ImportedDocument,
    previous: ImportedDocument | null
  ) => void
}

/** Margem passada a `zoomTo` com caixas que já trazem margem (`viewBox`). */
const VIEW_BOX_MARGIN = 1

interface OpenDocument {
  doc: ImportedDocument
  map: DocumentMap
}

interface ActiveFind {
  findId: number
  index: FindIndex
  hits: AcApFindLayoutHit[]
  /** Último hit navegado com sucesso; `-1` = nenhum. */
  activeIndex: number
}

function messageOf(error: unknown): string {
  try {
    if (error instanceof Error) return error.message
    return String(error)
  } catch {
    return 'erro'
  }
}

function defaultCoverage(
  doc: ImportedDocument,
  bytes: ArrayBuffer
): TypeCounts | undefined {
  if (doc.format === 'dxf') return scanDxfEntityTypes(bytes)
  // relatório por conversor: tem de ser lido logo após a importação
  return dwgCoverageSource()?.takeReport()
}

/** Repõe a base de trabalho global se ainda for a do documento recusado. */
function defaultDiscard(
  failed: ImportedDocument,
  previous: ImportedDocument | null
): void {
  let current: AcDbDatabase | null
  try {
    current = acdbGetWorkingDatabase()
  } catch {
    // não há base de trabalho: nada a repor
    return
  }
  if (current === failed.database) {
    acdbAssignWorkingDatabase((previous?.database ?? null) as AcDbDatabase)
  }
}

/** Perdas reais (não só o `VIEWPORT` de sistema, que é `partial`). */
function hasRealLosses(c: CoverageReport): boolean {
  return c.unsupported > 0 || c.dropped > 0 || c.truncated > 0
}

export class ViewerSession {
  private readonly deps: ViewerSessionDeps
  private current: OpenDocument | null = null
  private find: ActiveFind | null = null
  private findCounter = 0
  /** Navegação em curso (a única que pode mexer na vista); `null` = nenhuma. */
  private nav: AbortController | null = null
  private opening = 0
  private openTail: Promise<unknown> = Promise.resolve()
  private insets: Insets | undefined

  constructor(deps: ViewerSessionDeps) {
    this.deps = deps
  }

  /** Documento aberto (só leitura; para diagnóstico e testes). */
  get document(): ImportedDocument | null {
    return this.current?.doc ?? null
  }

  get documentMap(): DocumentMap | null {
    return this.current?.map ?? null
  }

  /** `findId` da pesquisa válida, ou `null`. */
  get activeFindId(): number | null {
    return this.find?.findId ?? null
  }

  /** Trata uma mensagem já validada. Nunca rejeita. */
  async handle(msg: AppMessage): Promise<ViewerOutput[]> {
    try {
      switch (msg.type) {
        case 'open':
          return await this.open(msg.payload)
        case 'find':
          return this.runFind(msg.payload)
        case 'goto':
          return await this.navigate(msg.payload, 'goto')
        case 'findNext':
          return await this.navigate(msg.payload, 'next')
        case 'findPrev':
          return await this.navigate(msg.payload, 'prev')
        case 'zoom':
          return this.zoom(msg.payload)
        case 'clearHighlight':
          return this.clearHighlight()
        case 'setInsets':
          this.insets = { ...msg.payload }
          return []
      }
    } catch (error) {
      // salvaguarda: um defeito interno nunca escapa como excepção
      return [this.error('internal', redactDetail(messageOf(error)))]
    }
    return [this.error('internal', 'tipo não tratado')]
  }

  // -- open -----------------------------------------------------------------

  private open(p: OpenPayload): Promise<ViewerOutput[]> {
    // a navegação em curso é do documento que está prestes a ser trocado
    this.cancelNavigation()
    this.opening++
    const run = this.openTail.then(() => this.doOpen(p))
    this.openTail = run.catch(() => undefined)
    return run.finally(() => {
      this.opening--
    })
  }

  private openFailed(failure: ImportFailure): ViewerOutput[] {
    const detail = failure.detail ? `: ${failure.detail}` : ''
    return [
      { type: 'openFailed', payload: toOpenFailedPayload(failure) },
      {
        type: 'log',
        payload: {
          level: 'warn',
          message: `openFailed ${failure.code} (${failure.stage})${detail}`
        }
      }
    ]
  }

  private async doOpen(p: OpenPayload): Promise<ViewerOutput[]> {
    const deps = this.deps
    const source = await readOpenSource(p.source, {
      fetchBytes: deps.fetchBytes
    })
    if (!source.ok) return this.openFailed(source.failure)

    const imported = await importDocument(
      { name: p.name, bytes: source.bytes, declaredSize: p.size },
      { dwg: deps.dwg, load: deps.load, timeoutMs: deps.timeoutMs }
    )
    if (!imported.ok) return this.openFailed(imported.failure)
    const doc = imported.document
    const previous = this.current?.doc ?? null
    const reject = (failure: ImportFailure): ViewerOutput[] => {
      try {
        ;(deps.discard ?? defaultDiscard)(doc, previous)
      } catch (error) {
        failure.detail = redactDetail(
          `${failure.detail ?? ''} · reposição falhou: ${messageOf(error)}`
        )
      }
      return this.openFailed(failure)
    }

    // Tudo o que pode falhar acontece ANTES do compromisso e dentro deste
    // `try`: qualquer falha (mapa, validação, vista, defeito interno) descarta o
    // documento importado e deixa o anterior intacto. Depois do compromisso só
    // há atribuições (nada que possa lançar).
    try {
      let dropped: TypeCounts | undefined
      let coverageError: string | undefined
      try {
        dropped = (deps.coverage ?? defaultCoverage)(doc, source.bytes)
      } catch (error) {
        coverageError = messageOf(error)
      }

      const mapped = mapDocument(doc, dropped ? { dropped } : {})
      if (!mapped.ok) return reject(mapped.failure)

      const opened = toOpenedPayload(doc)
      if (!isValidOpenedPayload(opened)) {
        return reject(
          makeFailure('parse', 'inspect', 'layouts fora do contrato (tabOrder)')
        )
      }

      const out: ViewerOutput[] = [{ type: 'opened', payload: opened }]
      const coverage = mapped.map.coverage
      out.push({
        type: 'log',
        payload: {
          level: hasRealLosses(coverage) ? 'warn' : 'info',
          message: describeCoverage(coverage)
        }
      })
      if (dropped === undefined) {
        out.push({
          type: 'log',
          payload: {
            level: 'warn',
            message: `cobertura do conversor desconhecida (${doc.format})${
              coverageError ? `: ${redactDetail(coverageError)}` : ''
            }`
          }
        })
      }

      // vista inutilizável (não consegue largar o realce anterior) = documento
      // recusado: nunca se abre sobre uma vista que não obedece
      try {
        this.deps.view.clearSelection()
      } catch (error) {
        return reject(
          makeFailure('parse', 'inspect', `vista: ${messageOf(error)}`)
        )
      }

      // compromisso (§6.4): o documento novo substitui o anterior
      this.cancelNavigation()
      this.current = { doc, map: mapped.map }
      this.find = null
      return out
    } catch (error) {
      return reject(makeFailure('parse', 'inspect', messageOf(error)))
    }
  }

  // -- find -----------------------------------------------------------------

  private runFind(p: FindPayload): ViewerOutput[] {
    const guard = this.documentGuard()
    if (guard) return [guard]
    const cur = this.current as OpenDocument
    // uma pesquisa nova anula a anterior (e a navegação em curso) antes de
    // qualquer falha possível: nunca se reapresenta uma lista antiga como actual
    const findId = ++this.findCounter
    this.find = null
    this.cancelNavigation()
    // e larga o realce da pesquisa anterior em TODOS os desfechos (sem match,
    // erro, sucesso); se a vista não o largar, o erro é explícito e a pesquisa
    // não corre
    const notCleared = this.clearViewSelection('pesquisa nova')
    if (notCleared) return [notCleared]

    const viewLayout = this.safeActiveLayoutId()
    const known =
      viewLayout !== null && cur.map.layout(viewLayout) !== undefined
    if (p.scope === 'layout' && !known) {
      return [this.error('layout-missing', 'layout activo desconhecido')]
    }
    const max = p.maxResults ?? FIND_MAX_RESULTS
    let result: AcApFindDrawingResult
    let index: FindIndex
    try {
      result = (this.deps.findText ?? acapFindText)(cur.doc.database, p.query, {
        matchCase: p.matchCase,
        scope: p.scope,
        currentLayoutId: known
          ? (viewLayout as string)
          : cur.doc.activeLayoutId,
        maxResults: max
      })
      if (!Array.isArray(result?.hits) || result.hits.length > max) {
        return [this.error('find-failed', 'resultado do FIND inválido')]
      }
      index = buildFindIndex(cur.map, cur.doc.database as never, result, {
        query: p.query,
        matchCase: p.matchCase
      })
    } catch (error) {
      return [this.error('find-failed', redactDetail(messageOf(error)))]
    }

    const payload: FindResultPayload = {
      findId,
      total: index.entries.length,
      truncated: index.truncated === true,
      layoutCount: index.layoutCount,
      hits: index.toFindHits()
    }
    if (!isValidFindResult(payload)) {
      return [this.error('find-failed', 'resultado fora do contrato')]
    }
    this.find = { findId, index, hits: result.hits, activeIndex: -1 }

    const out: ViewerOutput[] = [{ type: 'findResult', payload }]
    const notZoomable = index.entries.filter(e => !e.zoomable).length
    if (index.unresolved > 0 || notZoomable > 0) {
      out.push({
        type: 'log',
        payload: {
          level: 'warn',
          message: `FIND ${findId}: ${index.unresolved} hit(s) sem entidade no mapa, ${notZoomable} sem caixa de zoom`
        }
      })
    }
    return out
  }

  // -- goto / findNext / findPrev -------------------------------------------

  private async navigate(
    p: GotoPayload | FindStepPayload,
    mode: 'goto' | 'next' | 'prev'
  ): Promise<ViewerOutput[]> {
    const guard = this.documentGuard()
    if (guard) return [guard]
    const find = this.find
    if (!find || p.findId !== find.findId) {
      return [this.error('stale-find', `findId ${p.findId} desactualizado`)]
    }
    const n = find.index.entries.length
    let i: number
    if (mode === 'goto') {
      i = (p as GotoPayload).index
      if (i >= n) {
        return [
          this.error('index-out-of-range', `índice ${i} fora de 0..${n - 1}`)
        ]
      }
    } else {
      if (n === 0) return [this.active(find.findId, -1, 'stale')]
      // useFind.submit: de -1 vai a 0 nos dois sentidos; senão wrap módulo n
      const back = mode === 'prev'
      i = find.activeIndex < 0 ? 0 : (find.activeIndex + (back ? n - 1 : 1)) % n
    }

    const entry = find.index.entry(i)
    const hit = find.hits[i]
    if (!entry || !hit || hit.entityId !== entry.entityId) {
      return [this.error('internal', `índice FIND incoerente em ${i}`)]
    }
    if (!entry.resolved) {
      return [
        this.error(
          'hit-unresolved',
          `hit ${i}: entidade ${entry.entityId} fora do mapa`
        )
      ]
    }
    const box = entry.zoomable ? usableViewBox(entry.box) : null
    if (!box) {
      return [
        this.error('hit-not-zoomable', `hit ${i}: sem caixa de zoom válida`)
      ]
    }
    // só uma navegação de cada vez pode mexer na vista: a anterior é abortada
    // (o seu resultado tardio fica `stale` e a vista não lhe obedece)
    this.cancelNavigation()
    const controller = new AbortController()
    this.nav = controller
    const target: NavigateTarget = {
      hit,
      entry,
      box,
      signal: controller.signal
    }
    const insets = p.insets ?? this.insets
    if (insets) target.insets = { ...insets }
    let outcome: unknown
    try {
      outcome = await this.deps.view.navigate(target)
    } catch (error) {
      if (controller.signal.aborted) {
        return [this.active(find.findId, -1, 'stale')]
      }
      return [this.error('navigate-failed', redactDetail(messageOf(error)))]
    } finally {
      if (this.nav === controller) this.nav = null
    }
    if (controller.signal.aborted || this.find !== find) {
      return [this.active(find.findId, -1, 'stale')]
    }
    if (!isFindOutcome(outcome)) {
      return [
        this.error('navigate-failed', 'resultado de navegação desconhecido')
      ]
    }
    if (outcome !== 'navigated') return [this.active(find.findId, -1, outcome)]
    find.activeIndex = i
    return [this.active(find.findId, i, 'navigated')]
  }

  // -- zoom / realce --------------------------------------------------------

  private zoom(p: ZoomPayload): ViewerOutput[] {
    const guard = this.documentGuard()
    if (guard) return [guard]
    const cur = this.current as OpenDocument
    const out: ViewerOutput[] = []
    let box: ViewBox | null
    if (p.op === 'extents') {
      const id = this.safeActiveLayoutId()
      const layout = id === null ? undefined : cur.map.layout(id)
      if (!layout)
        return [this.error('layout-missing', 'layout activo desconhecido')]
      box = usableViewBox(layout.viewBox)
      if (!box) return [this.error('zoom-limit', 'extensão do layout inválida')]
      const notice = defaultViewNotice(layout.name, layout.viewBoxReason)
      if (notice) out.push({ type: 'log', payload: notice })
    } else {
      let visible: ViewBox | null
      try {
        visible = this.deps.view.visibleBox()
      } catch {
        visible = null
      }
      const step = scaleViewBox(visible, p.op, p.factor)
      if (!step.ok) return [this.error(step.code, step.message)]
      box = step.box
    }
    try {
      this.deps.view.zoomTo(box, VIEW_BOX_MARGIN)
    } catch (error) {
      return [this.error('view-failed', redactDetail(messageOf(error)))]
    }
    return out
  }

  private clearHighlight(): ViewerOutput[] {
    // uma navegação em curso não pode voltar a realçar depois disto
    this.cancelNavigation()
    if (!this.current) return []
    try {
      this.deps.view.clearSelection()
    } catch (error) {
      return [this.error('view-failed', redactDetail(messageOf(error)))]
    }
    return []
  }

  // -- utilitários ----------------------------------------------------------

  private documentGuard(): ViewerOutput | null {
    if (this.opening > 0) return this.error('busy', 'documento a abrir')
    if (!this.current)
      return this.error('no-document', 'nenhum documento aberto')
    return null
  }

  private safeActiveLayoutId(): string | null {
    try {
      const id = this.deps.view.activeLayoutId()
      return typeof id === 'string' && id.length > 0 ? id : null
    } catch {
      return null
    }
  }

  /** Aborta a navegação em curso (se houver); idempotente. */
  private cancelNavigation(): void {
    const nav = this.nav
    this.nav = null
    nav?.abort()
  }

  /** Larga o realce; `view-failed` explícito se a vista não o largar. */
  private clearViewSelection(why: string): ViewerOutput | null {
    try {
      this.deps.view.clearSelection()
      return null
    } catch (error) {
      return this.error(
        'view-failed',
        `realce anterior não limpo (${why}): ${redactDetail(messageOf(error))}`
      )
    }
  }

  private active(
    findId: number,
    index: number,
    outcome: FindOutcome
  ): ViewerOutput {
    return { type: 'findActive', payload: { findId, index, outcome } }
  }

  private error(code: ViewerErrorCode, message: string): ViewerOutput {
    const payload: ErrorPayload = { code, message }
    return { type: 'error', payload }
  }
}
