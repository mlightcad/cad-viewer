// SPDX-License-Identifier: GPL-3.0-or-later
//
// Rework do M3-I4: a navegação FIND atrasada nunca pode mexer
// na vista depois de ultrapassada, e o zoom do hit é sempre o de `target.box`.
//
// A prova usa a função upstream REAL (`acapNavigateToFindHit`, que muda de
// layout, ESPERA `waitUntilIdle` e só depois faz zoom + selecção na vista que
// capturou), o `layoutManager` REAL do data-model, o FIND REAL e um DXF real
// (fixture de e2e lida in-place). Só a vista (WebGL) é um duplo, que regista
// cada escrita numa ordem observável (`log`).

import {
  acapFindHitBox,
  type AcApFindLayoutHit,
  acapFindText
} from '@mlightcad/cad-simple-viewer/find'
import { acdbHostApplicationServices } from '@mlightcad/data-model'

import { createDocManagerViewPort } from '../src/viewer/viewPort'
import { e2eBytes } from './helpers/openFixture'
import { harness, only } from './helpers/viewerHarness'

const { acapNavigateToFindHit } = jest.requireActual(
  '../../cad-simple-viewer/src/find/AcApFindNavigator'
) as { acapNavigateToFindHit: (...args: never[]) => Promise<never> }

const LAYOUTS = e2eBytes('find-layouts.dxf')
const BLOCKS = e2eBytes('find-blocks.dxf')
const QUERY = 'Sala Técnica'

const tick = () => new Promise<void>(resolve => setImmediate(resolve))

interface Point {
  x: number
  y: number
}

/** Vista (WebGL) falsa: regista todas as escritas por ordem. */
class RealishView {
  static current: RealishView | null = null
  activeLayoutBtrId = ''
  width = 400
  height = 200
  /** Ordem observável das escritas: switch, zoom, center, clear, add:<id>. */
  log: string[] = []
  zooms: Array<{ box: { min: Point; max: Point }; margin?: number }> = []
  centers: Point[] = []
  selected: string[] = []
  private initialized = new Set<string>()
  private waiters: Array<{ ok: () => void; ko: (e: unknown) => void }> = []
  zoomTo: ((box: never, margin?: number) => void) | undefined = (
    box: { min: Point; max: Point },
    margin?: number
  ) => {
    this.log.push('zoom')
    this.zooms.push({
      box: { min: { ...box.min }, max: { ...box.max } },
      margin
    })
  }
  selectionSet = {
    clear: () => {
      this.log.push('clear')
    },
    add: (id: string) => {
      this.log.push(`add:${id}`)
      this.selected.push(id)
    }
  }

  constructor() {
    RealishView.current = this
  }

  set center(p: Point) {
    this.log.push('center')
    this.centers.push({ x: p.x, y: p.y })
  }
  isLayoutInitialized(id: string) {
    return this.initialized.has(id)
  }
  markLayoutAsInitialized(id: string) {
    this.initialized.add(id)
  }
  /** Fica pendente até `release()`: modela a conversão do layout activado. */
  waitUntilIdle() {
    return new Promise<boolean>((resolve, reject) => {
      this.waiters.push({ ok: () => resolve(true), ko: reject })
    })
  }
  release() {
    this.waiters.splice(0).forEach(w => w.ok())
  }
  /** A conversão do layout falha (p.ex. contexto WebGL perdido). */
  rejectIdle(error: Error) {
    this.waiters.splice(0).forEach(w => w.ko(error))
  }
  // ecrã ≡ mundo (1 px = 1 unidade): torna o centro esperado trivial de calcular
  screenToWorld = (p: Point) => ({ x: p.x, y: p.y })
  worldToScreen = (p: Point) => ({ x: p.x, y: p.y })
}

beforeAll(() => {
  // o layoutManager real avisa a vista (como o AcTrView2d faz em produção)
  acdbHostApplicationServices().layoutManager.events.layoutSwitched.addEventListener(
    args => {
      const view = RealishView.current
      if (!view) return
      view.log.push('switch')
      view.activeLayoutBtrId = args.layout.blockTableRecordId
    }
  )
})

async function setup(bytes = LAYOUTS, name = 'find-layouts.dxf') {
  const view = new RealishView()
  const manager: { curView: RealishView | null; curDocument?: unknown } = {
    curView: view
  }
  const port = createDocManagerViewPort(manager as never, {
    navigateToHit: acapNavigateToFindHit as never
  })
  const h = harness({ view: port as never })
  manager.curDocument = {
    get database() {
      return h.session.document?.database
    }
  }
  const opened = only(await h.open(name, bytes), 'opened').payload
  view.activeLayoutBtrId = opened.activeLayoutId
  view.log.length = 0
  return { h, view, manager, opened }
}

type Ctx = Awaited<ReturnType<typeof setup>>

async function search(ctx: Ctx, query = QUERY) {
  const r = only(
    await ctx.h.send('find', { query, matchCase: false, scope: 'drawing' }),
    'findResult'
  ).payload
  ctx.view.log.length = 0
  return r
}

/** Hit real (do FIND real) de índice `i`, para calcular a caixa esperada. */
function realHit(ctx: Ctx, i: number, query = QUERY): AcApFindLayoutHit {
  const doc = ctx.h.session.document!
  return acapFindText(doc.database as never, query, {
    scope: 'drawing',
    currentLayoutId: doc.activeLayoutId
  }).hits[i]
}

const crossLayoutIndex = (
  r: Awaited<ReturnType<typeof search>>,
  model: string
) => r.hits.findIndex(x => x.layoutId !== model)
const sameLayoutIndex = (
  r: Awaited<ReturnType<typeof search>>,
  model: string
) => r.hits.findIndex(x => x.layoutId === model)

// ---------------------------------------------------------------------------

describe('navegação atrasada ultrapassada não toca na vista (função upstream real)', () => {
  /** Arranca um goto entre layouts e deixa-o pendente em `waitUntilIdle`. */
  async function pendingCrossLayout() {
    const ctx = await setup()
    const r = await search(ctx)
    const i = crossLayoutIndex(r, ctx.opened.activeLayoutId)
    expect(i).toBeGreaterThanOrEqual(0)
    const pending = ctx.h.send('goto', { findId: r.findId, index: i })
    await tick()
    // a vista já mudou de layout e a função upstream espera pela conversão
    expect(ctx.view.log).toEqual(['switch'])
    return { ...ctx, r, i, pending }
  }

  const STALE = (findId: number) => ({ findId, index: -1, outcome: 'stale' })

  test('controlo: sem interrupção a navegação selecciona UMA vez e enquadra target.box', async () => {
    const { h, view, r, i, pending } = await pendingCrossLayout()
    view.release()
    const a = only(await pending, 'findActive').payload
    expect(a).toEqual({ findId: r.findId, index: i, outcome: 'navigated' })
    expect(view.log.filter(e => e.startsWith('add:'))).toHaveLength(1)
    expect(view.log.filter(e => e === 'zoom')).toHaveLength(1)
    expect(h.session.activeFindId).toBe(r.findId)
  })

  test('clearHighlight a meio: o realce atrasado NÃO volta e não há zoom', async () => {
    const { h, view, r, pending } = await pendingCrossLayout()
    expect(await h.send('clearHighlight', {})).toEqual([])
    expect(view.log).toEqual(['switch', 'clear'])
    view.release()
    expect(only(await pending, 'findActive').payload).toEqual(STALE(r.findId))
    expect(view.log).toEqual(['switch', 'clear'])
    expect(view.selected).toEqual([])
    expect(view.zooms).toEqual([])
    expect(view.centers).toEqual([])
  })

  test('find novo a meio: nada do hit antigo é seleccionado nem enquadrado', async () => {
    const { h, view, r, pending } = await pendingCrossLayout()
    const second = only(
      await h.send('find', {
        query: 'Quadro',
        matchCase: false,
        scope: 'drawing'
      }),
      'findResult'
    ).payload
    expect(second.findId).toBe(r.findId + 1)
    expect(view.log).toEqual(['switch', 'clear'])
    view.release()
    expect(only(await pending, 'findActive').payload).toEqual(STALE(r.findId))
    expect(view.log).toEqual(['switch', 'clear'])
    expect(view.selected).toEqual([])
    expect(view.zooms).toEqual([])
  })

  test('open novo a meio: o documento antigo não realça nem enquadra no novo', async () => {
    const { h, view, r, pending } = await pendingCrossLayout()
    only(await h.open('find-blocks.dxf', BLOCKS), 'opened')
    expect(h.session.document?.name).toBe('find-blocks.dxf')
    const before = [...view.log]
    view.release()
    expect(only(await pending, 'findActive').payload).toEqual(STALE(r.findId))
    expect(view.log).toEqual(before)
    expect(view.selected).toEqual([])
    expect(view.zooms).toEqual([])
  })

  test('segundo goto ao mesmo hit (síncrono) ultrapassa o primeiro: UMA selecção e UM zoom', async () => {
    const { h, view, r, i, pending } = await pendingCrossLayout()
    // o layout já foi activado pelo primeiro: este goto não espera
    const second = only(
      await h.send('goto', { findId: r.findId, index: i }),
      'findActive'
    ).payload
    expect(second).toEqual({ findId: r.findId, index: i, outcome: 'navigated' })
    const afterSecond = [...view.log]
    expect(afterSecond.filter(e => e.startsWith('add:'))).toHaveLength(1)
    expect(afterSecond.filter(e => e === 'zoom')).toHaveLength(1)
    view.release()
    expect(only(await pending, 'findActive').payload).toEqual(STALE(r.findId))
    // o primeiro, ao acordar, não repete selecção nem zoom
    expect(view.log).toEqual(afterSecond)
    expect(view.selected).toHaveLength(1)
    expect(view.zooms).toHaveLength(1)
  })

  test('vista (sessão) trocada a meio: nem a antiga nem a nova são tocadas', async () => {
    const { view, manager, r, pending } = await pendingCrossLayout()
    const replacement = new RealishView()
    manager.curView = replacement
    view.release()
    expect(only(await pending, 'findActive').payload).toEqual(STALE(r.findId))
    expect(view.log).toEqual(['switch'])
    expect(replacement.log).toEqual([])
    expect(replacement.selected).toEqual([])
  })

  test('navegação que lança depois de ultrapassada é `stale`, não navigate-failed', async () => {
    const ctx = await setup()
    const r = await search(ctx)
    const i = crossLayoutIndex(r, ctx.opened.activeLayoutId)
    const pending = ctx.h.send('goto', { findId: r.findId, index: i })
    await tick()
    await ctx.h.send('clearHighlight', {})
    // a vista dá erro ao acordar (p.ex. contexto WebGL perdido)
    ctx.view.rejectIdle(new Error('webgl perdido'))
    const out = await pending
    expect(out.map(m => m.type)).toEqual(['findActive'])
    expect(only(out, 'findActive').payload).toEqual({
      findId: r.findId,
      index: -1,
      outcome: 'stale'
    })
  })
})

// ---------------------------------------------------------------------------

describe('o zoom do hit é o de target.box (acapFindHitBox) ou falha explícita', () => {
  test('suportado, sem insets: UM zoom, exactamente a caixa de acapFindHitBox, margem 1.1', async () => {
    const ctx = await setup()
    const r = await search(ctx)
    const i = sameLayoutIndex(r, ctx.opened.activeLayoutId)
    expect(i).toBeGreaterThanOrEqual(0)
    const a = only(
      await ctx.h.send('goto', { findId: r.findId, index: i }),
      'findActive'
    ).payload
    expect(a.outcome).toBe('navigated')
    const hit = realHit(ctx, i)
    const expected = acapFindHitBox(
      ctx.h.session.document!.database as never,
      hit.layoutId,
      hit
    )
    // o zoom da função upstream é vetado: só o do adaptador, de target.box
    expect(ctx.view.zooms).toHaveLength(1)
    expect(ctx.view.zooms[0].box).toEqual(expected)
    expect(ctx.view.zooms[0].margin).toBe(1.1)
    // ordem: a selecção (upstream) precede o zoom do adaptador
    expect(ctx.view.log).toEqual(['clear', `add:${hit.entityId}`, 'zoom'])
    expect(ctx.view.centers).toEqual([])
  })

  test('suportado, com insets: caixa alargada em Y (×h/visível), mesmo centro, hit centrado na parte visível', async () => {
    const ctx = await setup()
    const r = await search(ctx)
    const i = sameLayoutIndex(r, ctx.opened.activeLayoutId)
    // 400×200 com 100 px tapados em baixo → visível 400×100
    await ctx.h.send('setInsets', { left: 0, right: 0, top: 0, bottom: 100 })
    await ctx.h.send('goto', { findId: r.findId, index: i })
    const hit = realHit(ctx, i)
    const box = acapFindHitBox(
      ctx.h.session.document!.database as never,
      hit.layoutId,
      hit
    )
    const cx = (box.min.x + box.max.x) / 2
    const cy = (box.min.y + box.max.y) / 2
    const [zoom] = ctx.view.zooms
    expect(ctx.view.zooms).toHaveLength(1)
    expect(zoom.box.min.x).toBeCloseTo(box.min.x, 9)
    expect(zoom.box.max.x).toBeCloseTo(box.max.x, 9)
    expect(zoom.box.max.y - zoom.box.min.y).toBeCloseTo(
      (box.max.y - box.min.y) * 2,
      9
    )
    expect((zoom.box.min.y + zoom.box.max.y) / 2).toBeCloseTo(cy, 9)
    // centro do ecrã = 200,100; o hit tem de ficar no meio da parte visível (200,50)
    expect(ctx.view.centers).toHaveLength(1)
    expect(ctx.view.centers[0].x).toBeCloseTo(cx, 9)
    expect(ctx.view.centers[0].y).toBeCloseTo(cy + 50, 9)
  })

  test('insets inutilizáveis (área visível < 20 %): zoom simples da mesma caixa', async () => {
    const ctx = await setup()
    const r = await search(ctx)
    const i = sameLayoutIndex(r, ctx.opened.activeLayoutId)
    await ctx.h.send('setInsets', { left: 0, right: 0, top: 0, bottom: 190 })
    await ctx.h.send('goto', { findId: r.findId, index: i })
    const hit = realHit(ctx, i)
    const box = acapFindHitBox(
      ctx.h.session.document!.database as never,
      hit.layoutId,
      hit
    )
    expect(ctx.view.zooms).toHaveLength(1)
    expect(ctx.view.zooms[0].box).toEqual(box)
    expect(ctx.view.centers).toEqual([])
  })

  test('NÃO suportado (vista sem zoomTo): navigate-failed determinístico e a vista não é tocada', async () => {
    const ctx = await setup()
    const r = await search(ctx)
    const i = crossLayoutIndex(r, ctx.opened.activeLayoutId)
    ctx.view.zoomTo = undefined
    const err = only(
      await ctx.h.send('goto', { findId: r.findId, index: i }),
      'error'
    ).payload
    expect(err.code).toBe('navigate-failed')
    expect(err.message).toMatch(/vista sem zoomTo/)
    // falhou ANTES de a função upstream mexer em layout ou selecção
    expect(ctx.view.log).toEqual([])
    expect(ctx.view.activeLayoutBtrId).toBe(ctx.opened.activeLayoutId)
  })

  test('zoomTo que lança depois da selecção: navigate-failed e o realce é desfeito', async () => {
    const ctx = await setup()
    const r = await search(ctx)
    const i = sameLayoutIndex(r, ctx.opened.activeLayoutId)
    ctx.view.zoomTo = () => {
      throw new Error('contexto WebGL perdido')
    }
    const err = only(
      await ctx.h.send('goto', { findId: r.findId, index: i }),
      'error'
    ).payload
    expect(err).toMatchObject({
      code: 'navigate-failed',
      message: 'contexto WebGL perdido'
    })
    const adds = ctx.view.log.filter(e => e.startsWith('add:'))
    expect(adds).toHaveLength(1)
    // o último acto na vista foi limpar: o hit não fica realçado sem enquadramento
    expect(ctx.view.log[ctx.view.log.length - 1]).toBe('clear')
    expect(ctx.view.zooms).toEqual([])
  })
})
