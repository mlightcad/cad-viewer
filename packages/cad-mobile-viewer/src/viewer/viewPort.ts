// SPDX-License-Identifier: GPL-3.0-or-later
//
// Adaptador da vista real (`AcApDocManager.curView`, `AcTrView2d`) para a porta
// da sessão (spec M3-I4 §2.3). Estrutural: não importa `cad-simple-viewer`
// (Three.js) — o bundle passa o `AcApDocManager` e `acapNavigateToFindHit`.
// Só caixas já validadas chegam a `zoomTo`; leituras inválidas da vista dão
// `null` (a sessão responde `view-unavailable`), nunca valores inventados.

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
  screenToWorld?(p: XY): XY
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
      v.zoomTo(
        new AcGeBox2d(
          new AcGePoint2d(safe.min.x, safe.min.y),
          new AcGePoint2d(safe.max.x, safe.max.y)
        ),
        margin
      )
    },

    clearSelection() {
      view()?.selectionSet?.clear()
    },

    navigate(target: NavigateTarget) {
      if (!view()) return 'no-document'
      const options: { insets?: Insets } = {}
      if (target.insets) options.insets = { ...target.insets }
      return deps.navigateToHit(manager, target.hit, options)
    }
  }
}
