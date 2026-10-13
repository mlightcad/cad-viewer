// SPDX-License-Identifier: GPL-3.0-or-later
//
// Adaptador da vista real (`AcApDocManager.curView`, `AcTrView2d`) para a porta
// da sessão (spec M3-I4 §2.3). Estrutural: não importa
// `cad-simple-viewer` (Three.js) — o bundle passa o `AcApDocManager` e
// `acapNavigateToFindHit`.
//
// Duas garantias que a função upstream, sozinha, não dá:
//  1. Navegação cancelável. `acapNavigateToFindHit` muda de layout, ESPERA
//     (`waitUntilIdle`, até 15 s) e só depois faz zoom + `selectionSet.clear/add`
//     na vista que capturou no início — um `clearHighlight`/`find`/`open` que
//     chegue entretanto não a pára. Por isso a função recebe uma vista
//     «guardada»: depois de `target.signal` abortar (ou de a vista corrente
//     mudar) as escritas na selecção são descartadas.
//  2. O zoom é SEMPRE o de `target.box` (a caixa de `acapFindHitBox` validada
//     pela sessão). O zoom da função upstream é vetado na vista guardada e o
//     adaptador enquadra `target.box` ele próprio (mesma lógica de `insets`);
//     uma vista que não consegue fazer `zoomTo` dá falha explícita ANTES de
//     tocar em nada.
// Só caixas válidas chegam a `zoomTo`; leituras inválidas da vista dão `null`
// (a sessão responde `view-unavailable`), nunca valores inventados.

import type { AcApFindLayoutHit } from '@mlightcad/cad-simple-viewer/find'
import { AcGeBox2d, AcGePoint2d } from '@mlightcad/data-model'

import type { ViewBox } from '../model/types'
import type { FindOutcome, Insets } from './protocol'
import type { NavigateTarget, ViewPort } from './session'
import { boxFromCorners, usableViewBox } from './zoom'

interface XY {
  x: number
  y: number
}

/** Forma mínima de `AcTrView2d` usada aqui. */
export interface ViewLike {
  activeLayoutBtrId?: string
  width?: number
  height?: number
  center?: XY
  screenToWorld?(p: XY): XY
  worldToScreen?(p: XY): XY
  zoomTo(box: AcGeBox2d, margin?: number): void
  selectionSet?: { clear(): void }
}

/** Forma mínima de `AcApDocManager` usada aqui. */
export interface DocManagerLike {
  readonly curView?: ViewLike | null
}

/** Assinatura de `acapNavigateToFindHit` (injectada pelo bundle). */
export type NavigateToHit<M> = (
  manager: M,
  hit: AcApFindLayoutHit,
  options: { insets?: Insets }
) => Promise<FindOutcome> | FindOutcome

/** Margem de `zoomTo` para um hit (a mesma de `acapNavigateToFindHit`). */
export const HIT_ZOOM_MARGIN = 1.1

/** Fracção mínima do canvas que as `insets` têm de deixar visível. */
const MIN_VISIBLE_FRACTION = 0.2

function toAcBox(box: ViewBox): AcGeBox2d {
  return new AcGeBox2d(
    new AcGePoint2d(box.min.x, box.min.y),
    new AcGePoint2d(box.max.x, box.max.y)
  )
}

/**
 * Enquadra `box` no centro da parte do canvas que as `insets` deixam visível
 * (mesma aritmética de `zoomToVisible` em `AcApFindNavigator.ts`). Com `insets`
 * inutilizáveis (vista sem conversão de coordenadas ou área visível < 20 %) faz
 * o zoom simples: as `insets` são uma indicação de posição, não dados. Lança se
 * a caixa ou a vista não permitirem enquadrar.
 */
function zoomToHitBox(
  view: ViewLike,
  box: ViewBox,
  insets: Insets | undefined
): void {
  if (typeof view.zoomTo !== 'function') {
    throw new Error('vista sem zoomTo: não é possível enquadrar o hit')
  }
  const safe = usableViewBox(box)
  if (!safe) throw new Error('caixa de zoom inválida')

  const width = Number(view.width) || 0
  const height = Number(view.height) || 0
  const left = Math.max(0, insets?.left ?? 0)
  const right = Math.max(0, insets?.right ?? 0)
  const top = Math.max(0, insets?.top ?? 0)
  const bottom = Math.max(0, insets?.bottom ?? 0)
  const visibleW = width - left - right
  const visibleH = height - top - bottom
  const usable =
    width > 0 &&
    height > 0 &&
    left + right + top + bottom > 0 &&
    visibleW >= width * MIN_VISIBLE_FRACTION &&
    visibleH >= height * MIN_VISIBLE_FRACTION &&
    typeof view.worldToScreen === 'function' &&
    typeof view.screenToWorld === 'function'
  if (!usable) {
    view.zoomTo(toAcBox(safe), HIT_ZOOM_MARGIN)
    return
  }

  // alarga a caixa para que, enquadrada no canvas inteiro, a original caiba na
  // parte visível…
  const cx = (safe.min.x + safe.max.x) / 2
  const cy = (safe.min.y + safe.max.y) / 2
  const halfW = ((safe.max.x - safe.min.x) / 2) * (width / visibleW)
  const halfH = ((safe.max.y - safe.min.y) / 2) * (height / visibleH)
  const grown = usableViewBox({
    min: { x: cx - halfW, y: cy - halfH },
    max: { x: cx + halfW, y: cy + halfH }
  })
  if (!grown) throw new Error('caixa de zoom com insets fora de limites')
  view.zoomTo(toAcBox(grown), HIT_ZOOM_MARGIN)

  // …e centra o hit na parte visível
  const onScreen = view.worldToScreen!({ x: cx, y: cy })
  const center = view.screenToWorld!({
    x: width / 2 + (onScreen.x - (left + visibleW / 2)),
    y: height / 2 + (onScreen.y - (top + visibleH / 2))
  })
  if (Number.isFinite(center.x) && Number.isFinite(center.y)) {
    view.center = new AcGePoint2d(center.x, center.y)
  }
}

/**
 * Vista «guardada» entregue à função de navegação upstream:
 *  - `zoomTo` e `center` são vetados (o zoom é o do adaptador, de `target.box`);
 *  - as escritas em `selectionSet` só passam enquanto `live()`;
 *  - o resto (`activeLayoutBtrId`, `waitUntilIdle`, …) é reencaminhado à vista
 *    real, com `this` correcto.
 */
function guardView(view: ViewLike, live: () => boolean): ViewLike {
  const guardSelection = (selection: object): object =>
    new Proxy(selection, {
      get(target, prop) {
        const value = Reflect.get(target, prop, target)
        if (typeof value !== 'function') return value
        return (...args: unknown[]) =>
          live() ? value.apply(target, args) : undefined
      }
    })
  return new Proxy(view, {
    get(target, prop) {
      if (prop === 'zoomTo') return () => undefined
      const value = Reflect.get(target, prop, target)
      if (prop === 'selectionSet' && value && typeof value === 'object') {
        return guardSelection(value)
      }
      return typeof value === 'function' ? value.bind(target) : value
    },
    set(target, prop, value) {
      // `center` faz parte do zoom, que não é da função upstream
      if (prop === 'center' || !live()) return true
      return Reflect.set(target, prop, value, target)
    }
  })
}

function guardManager<M extends DocManagerLike>(manager: M, view: ViewLike): M {
  return new Proxy(manager, {
    get(target, prop) {
      if (prop === 'curView') return view
      const value = Reflect.get(target, prop, target)
      return typeof value === 'function' ? value.bind(target) : value
    }
  })
}

export function createDocManagerViewPort<M extends DocManagerLike>(
  manager: M,
  deps: { navigateToHit: NavigateToHit<M> }
): ViewPort {
  const view = (): ViewLike | null => manager.curView ?? null

  return {
    activeLayoutId() {
      const id = view()?.activeLayoutBtrId
      return typeof id === 'string' && id.length > 0 ? id : null
    },

    visibleBox(): ViewBox | null {
      const v = view()
      if (!v?.screenToWorld) return null
      const width = Number(v.width)
      const height = Number(v.height)
      if (!(width > 0 && height > 0 && Number.isFinite(width + height))) {
        return null
      }
      return boxFromCorners(
        v.screenToWorld({ x: 0, y: 0 }),
        v.screenToWorld({ x: width, y: height })
      )
    },

    zoomTo(box, margin) {
      const v = view()
      if (!v) throw new Error('sem vista activa')
      const safe = usableViewBox(box)
      // defesa em profundidade: a sessão já validou
      if (!safe) throw new Error('caixa de zoom inválida')
      v.zoomTo(toAcBox(safe), margin)
    },

    clearSelection() {
      view()?.selectionSet?.clear()
    },

    async navigate(target: NavigateTarget): Promise<FindOutcome> {
      const real = view()
      if (!real) return 'no-document'
      if (target.signal.aborted) return 'stale'
      // falhas explícitas ANTES de a função upstream mexer na vista
      const box = usableViewBox(target.box)
      if (!box) throw new Error('caixa de zoom inválida')
      if (typeof real.zoomTo !== 'function') {
        throw new Error('vista sem zoomTo: não é possível enquadrar o hit')
      }

      const live = (): boolean =>
        !target.signal.aborted && manager.curView === real
      const options: { insets?: Insets } = {}
      if (target.insets) options.insets = { ...target.insets }

      const outcome = await deps.navigateToHit(
        guardManager(manager, guardView(real, live)),
        target.hit,
        options
      )
      if (outcome !== 'navigated') return outcome
      // a navegação foi ultrapassada (ou a vista trocada) enquanto esperava:
      // nada do que lhe pertence pode tocar na vista actual
      if (!live()) return 'stale'

      try {
        zoomToHitBox(real, box, target.insets)
      } catch (error) {
        // o hit ficaria seleccionado sem enquadramento: desfaz o realce
        if (live()) {
          try {
            real.selectionSet?.clear()
          } catch {
            // a falha original é a que interessa à sessão
          }
        }
        throw error
      }
      return 'navigated'
    }
  }
}
