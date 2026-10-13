// SPDX-License-Identifier: GPL-3.0-or-later
//
// Viewer SINTÉTICO: implementa, sobre dados sintéticos, o lado web do contrato
// de docs/OBJ-0104-architecture.md §5.2/§5.5 para que o `BridgeClient` e o
// estado da app possam ser exercitados sem WebView, sem parser e sem rede.
//
// Não é o `handleBridgeMessage` real (packages/cad-mobile-viewer, B2/I1): é um
// executável do contrato. Determinístico: só reage a `handle(script)` e só
// responde em `drain()` — nada acontece sozinho nem com relógio real.

import {
  type AppMessage,
  detectDocumentFormat,
  type DocumentFormat,
  FIND_MAX_RESULTS,
  type FindActivePayload,
  type FindHit,
  type FindResultPayload,
  type Insets,
  type ReadyPayload,
  type ViewerMessage,
  type ViewerPayloads,
  type ViewerToAppType
} from '../contracts/protocol.ts'
import type { Box, SyntheticDocument } from './syntheticDocuments.ts'

export interface SyntheticViewerOptions {
  documents: readonly SyntheticDocument[]
  dwg?: ReadyPayload['dwg']
  /** `btrId` de layouts que `goto` não consegue activar (`layout-missing`). */
  missingLayouts?: readonly string[]
}

export interface FailureInjection {
  code: string
  message: string
}

interface ActiveFind {
  findId: number
  hits: FindHit[]
}

const READY_PAYLOAD = (dwg: ReadyPayload['dwg']): ReadyPayload => ({
  viewerVersion: 'synthetic-1',
  protocol: 1,
  caps: dwg === 'ok' ? ['find', 'dwg', 'dxf'] : ['find', 'dxf'],
  dwg
})

/** Decodifica o script de `encodeInjection` (duplo stringify) de volta à mensagem. */
export function decodeInjection(script: string): AppMessage {
  const prefix = 'window.__cadBridge.receive('
  const suffix = ');true;'
  if (!script.startsWith(prefix) || !script.endsWith(suffix)) {
    throw new Error('script de injecção inválido')
  }
  const literal = script.slice(prefix.length, -suffix.length)
  // O literal é uma string JS entre aspas gerada por JSON.stringify: JSON.parse
  // chega, sem `eval`/`Function`.
  const inner = JSON.parse(literal) as string
  return JSON.parse(inner) as AppMessage
}

export function scaleBox(box: Box, factor: number): Box {
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  const hw = (box.maxX - box.minX) / 2 / factor
  const hh = (box.maxY - box.minY) / 2 / factor
  return { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh }
}

export class SyntheticViewer {
  private readonly docs = new Map<string, SyntheticDocument>()
  private readonly dwg: ReadyPayload['dwg']
  private readonly missingLayouts: ReadonlySet<string>
  private readonly outbox: string[] = []
  private readonly failures = new Map<string, FailureInjection>()
  private nextId = 0
  private findCounter = 0

  /** Documento aberto (`null` = nenhum). */
  doc: SyntheticDocument | null = null
  /** Vista actual (coordenadas do desenho). */
  camera: Box | null = null
  /** Último `find` (dono dos índices usados por `goto`). */
  find: ActiveFind | null = null
  /** Índice do hit realçado, `-1` = nenhum. */
  activeIndex = -1
  /** Há algo no `selectionSet` do viewer. */
  highlighted = false
  insets: Insets = { left: 0, right: 0, top: 0, bottom: 0 }
  /** Comandos recebidos, por ordem (para asserções). */
  readonly received: AppMessage[] = []

  constructor(options: SyntheticViewerOptions) {
    for (const d of options.documents) this.docs.set(d.name, d)
    this.dwg = options.dwg ?? 'ok'
    this.missingLayouts = new Set(options.missingLayouts ?? [])
  }

  /** Envia `ready` (o bundle arrancou). */
  boot(): void {
    this.emit('ready', READY_PAYLOAD(this.dwg))
  }

  /** Faz o próximo comando do tipo `type` falhar com um `error` explícito. */
  failNext(type: AppMessage['type'], failure: FailureInjection): void {
    this.failures.set(type, failure)
  }

  /** Mensagens (JSON) pendentes para a app; esvazia a caixa de saída. */
  drain(): string[] {
    return this.outbox.splice(0, this.outbox.length)
  }

  get pending(): number {
    return this.outbox.length
  }

  /** Recebe o que a app injectou (`webview.injectJavaScript`). */
  handle(script: string): void {
    const msg = decodeInjection(script)
    this.received.push(msg)
    const injected = this.failures.get(msg.type)
    if (injected) {
      this.failures.delete(msg.type)
      this.emit('error', { ...injected, replyTo: msg.id }, msg.id)
      return
    }
    switch (msg.type) {
      case 'open':
        return this.onOpen(msg)
      case 'find':
        return this.onFind(msg)
      case 'goto':
        return this.navigate(msg, msg.payload.findId, msg.payload.index)
      case 'findNext':
      case 'findPrev':
        return this.onStep(msg)
      case 'zoom':
        return this.onZoom(msg)
      case 'clearHighlight':
        // Só o realce cai; a posição na lista (`activeIndex`) mantém-se, para
        // «Seguinte» continuar de onde estava.
        this.highlighted = false
        return
      case 'setInsets':
        this.insets = msg.payload
        return
    }
  }

  // -- handlers -------------------------------------------------------------

  private onOpen(msg: Extract<AppMessage, { type: 'open' }>): void {
    const { name } = msg.payload
    const format: DocumentFormat | null = detectDocumentFormat(name)
    const fail = (code: ViewerPayloads['openFailed']['code'], text: string) =>
      // O documento anterior mantém-se (§6.4).
      this.emit('openFailed', { code, message: text }, msg.id)
    if (!format) return fail('unsupported-ext', `extensão inválida: ${name}`)
    if (format === 'dwg' && this.dwg === 'unavailable') {
      return fail('dwg-unavailable', 'DWG indisponível neste viewer sintético')
    }
    const doc = this.docs.get(name)
    if (!doc)
      return fail('read-failed', `ficheiro sintético desconhecido: ${name}`)
    this.doc = doc
    this.camera = { ...doc.extents }
    this.find = null
    this.activeIndex = -1
    this.highlighted = false
    this.emit(
      'opened',
      {
        name: doc.name,
        format,
        layouts: doc.layouts,
        activeLayoutId: doc.activeLayoutId
      },
      msg.id
    )
  }

  private onFind(msg: Extract<AppMessage, { type: 'find' }>): void {
    const doc = this.doc
    if (!doc) return this.noDocument(msg.id)
    const { query, matchCase, scope } = msg.payload
    const max = Math.min(
      msg.payload.maxResults ?? FIND_MAX_RESULTS,
      FIND_MAX_RESULTS
    )
    const norm = (s: string) => (matchCase ? s : s.toLocaleLowerCase('pt-PT'))
    const order = new Map(doc.layouts.map(l => [l.name, l]))
    const activeName = doc.layouts.find(
      l => l.btrId === doc.activeLayoutId
    )?.name
    const matches = doc.texts
      .filter(t => order.has(t.layoutName))
      .filter(t => scope === 'drawing' || t.layoutName === activeName)
      .filter(t => norm(t.text).includes(norm(query)))
      // `sort` é estável: dentro do layout mantém a ordem do documento.
      .sort(
        (a, b) =>
          (order.get(a.layoutName)?.tabOrder ?? 0) -
          (order.get(b.layoutName)?.tabOrder ?? 0)
      )
    const truncated = matches.length > max
    const hits: FindHit[] = matches.slice(0, max).map((t, index) => ({
      index,
      text: t.text,
      excerpt: `…${t.text}…`,
      layoutName: t.layoutName,
      layoutId: order.get(t.layoutName)?.btrId ?? '',
      layer: t.layer,
      kind: t.kind,
      ...(t.tag !== undefined ? { tag: t.tag } : {}),
      ...(t.blockName !== undefined ? { blockName: t.blockName } : {})
    }))
    this.find = { findId: ++this.findCounter, hits }
    // [H] `find` limpa o realce (activeIndex=-1, §5.2); decisão final em I1.
    this.activeIndex = -1
    this.highlighted = false
    const payload: FindResultPayload = {
      findId: this.find.findId,
      total: hits.length,
      truncated,
      layoutCount: new Set(hits.map(h => h.layoutId)).size,
      hits
    }
    this.emit('findResult', payload, msg.id)
  }

  private onStep(
    msg: Extract<AppMessage, { type: 'findNext' | 'findPrev' }>
  ): void {
    const find = this.find
    if (!this.doc) return this.noDocument(msg.id)
    if (!find || msg.payload.findId !== find.findId) return this.stale(msg)
    const n = find.hits.length
    if (n === 0) {
      return this.activeReply(msg.id, {
        findId: find.findId,
        index: -1,
        outcome: 'stale'
      })
    }
    const back = msg.type === 'findPrev'
    // useFind.submit: de -1 vai a 0 nos dois sentidos; senão wrap módulo n.
    const next =
      this.activeIndex < 0 ? 0 : (this.activeIndex + (back ? n - 1 : 1)) % n
    this.navigate(msg, find.findId, next)
  }

  private navigate(msg: AppMessage, findId: number, index: number): void {
    if (!this.doc) return this.noDocument(msg.id)
    const find = this.find
    if (!find || findId !== find.findId) return this.stale(msg)
    const hit = find.hits[index]
    if (!hit) {
      return this.emit(
        'error',
        {
          code: 'index-out-of-range',
          message: `índice ${index} fora de 0..${find.hits.length - 1}`,
          replyTo: msg.id
        },
        msg.id
      )
    }
    if (this.missingLayouts.has(hit.layoutId)) {
      return this.activeReply(msg.id, {
        findId,
        index: -1,
        outcome: 'layout-missing'
      })
    }
    this.activeIndex = index
    this.highlighted = true
    this.activeReply(msg.id, { findId, index, outcome: 'navigated' })
  }

  private onZoom(msg: Extract<AppMessage, { type: 'zoom' }>): void {
    if (!this.doc || !this.camera) return this.noDocument(msg.id)
    const { op, factor } = msg.payload
    if (op === 'extents') {
      this.camera = { ...this.doc.extents }
      return
    }
    // §5.5: meias dimensões divididas por `factor` (por omissão in=2, out=0.5).
    this.camera = scaleBox(this.camera, factor ?? (op === 'in' ? 2 : 0.5))
  }

  // -- saída ----------------------------------------------------------------

  private noDocument(replyTo: string): void {
    this.emit(
      'error',
      { code: 'no-document', message: 'nenhum documento aberto', replyTo },
      replyTo
    )
  }

  private stale(msg: AppMessage): void {
    this.emit(
      'error',
      {
        code: 'stale-find',
        message: `findId desactualizado em ${msg.type}`,
        replyTo: msg.id
      },
      msg.id
    )
  }

  private activeReply(replyTo: string, payload: FindActivePayload): void {
    this.emit('findActive', payload, replyTo)
  }

  private emit<T extends ViewerToAppType>(
    type: T,
    payload: ViewerPayloads[T],
    replyTo?: string
  ): void {
    const msg = {
      v: 1,
      id: `w-${++this.nextId}`,
      type,
      ...(replyTo !== undefined ? { replyTo } : {}),
      payload
    } as ViewerMessage
    this.outbox.push(JSON.stringify(msg))
  }
}
