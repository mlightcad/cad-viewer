import { acedIsMobileOrPadUi } from './AcExHtmlSimpleViewerUi'

/**
 * World-space point used by {@link AcExConfirmedPointMarks}.
 */
export interface AcExConfirmedPointMarkPos {
  x: number
  y: number
}

/**
 * Temporary plus marks at confirmed pick points during multi-step measure /
 * markup tools on phone and pad.
 *
 * Desktop never shows these marks. There is no override API in the offline
 * HTML viewer (unlike `AcEdPromptPointOptions.showConfirmedPointMark` in the
 * live CAD viewer).
 */
export class AcExConfirmedPointMarks {
  private readonly host: HTMLElement
  private readonly wcsToScreen: (pos: AcExConfirmedPointMarkPos) => {
    x: number
    y: number
  }
  private readonly markers: HTMLDivElement[] = []
  private worldPoints: AcExConfirmedPointMarkPos[] = []

  /**
   * @param host - Overlay host (usually `#mlcad-root` or a measure/markup layer).
   * @param wcsToScreen - Converts WCS to host-relative CSS pixels.
   */
  constructor(
    host: HTMLElement,
    wcsToScreen: (pos: AcExConfirmedPointMarkPos) => { x: number; y: number }
  ) {
    this.host = host
    this.wcsToScreen = wcsToScreen
    AcExConfirmedPointMarks.injectCss()
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative'
    }
  }

  /**
   * Replaces the mark set with the given world points.
   *
   * No-ops visually on desktop (clears any existing marks).
   */
  setWorldPoints(points: readonly AcExConfirmedPointMarkPos[]): void {
    if (!acedIsMobileOrPadUi()) {
      this.clear()
      return
    }

    const next = points.map(p => ({ x: p.x, y: p.y }))
    const reuse = Math.min(this.markers.length, next.length)
    for (let i = 0; i < reuse; i++) {
      this.place(this.markers[i]!, next[i]!)
    }
    if (next.length < this.markers.length) {
      for (let i = next.length; i < this.markers.length; i++) {
        this.markers[i]!.remove()
      }
      this.markers.length = next.length
    } else {
      for (let i = reuse; i < next.length; i++) {
        const el = document.createElement('div')
        el.className = 'mlcad-confirmed-point-mark'
        this.host.appendChild(el)
        this.place(el, next[i]!)
        this.markers.push(el)
      }
    }
    this.worldPoints = next
  }

  /** Repositions existing marks after pan/zoom. */
  sync(): void {
    for (let i = 0; i < this.markers.length; i++) {
      const pos = this.worldPoints[i]
      if (!pos) continue
      this.place(this.markers[i]!, pos)
    }
  }

  /** Removes all marks. */
  clear(): void {
    for (const el of this.markers) el.remove()
    this.markers.length = 0
    this.worldPoints = []
  }

  private place(el: HTMLDivElement, world: AcExConfirmedPointMarkPos): void {
    const screen = this.wcsToScreen(world)
    el.style.left = `${screen.x}px`
    el.style.top = `${screen.y}px`
  }

  private static injectCss(): void {
    if (document.getElementById('mlcad-confirmed-point-mark-style')) return
    const style = document.createElement('style')
    style.id = 'mlcad-confirmed-point-mark-style'
    style.textContent = `
      .mlcad-confirmed-point-mark {
        position: absolute;
        pointer-events: none;
        z-index: 5;
        width: 12px;
        height: 12px;
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        color: var(--mlcad-measure-accent, #08e8de);
      }
      .mlcad-confirmed-point-mark::before,
      .mlcad-confirmed-point-mark::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        background: currentColor;
        transform-origin: center;
      }
      .mlcad-confirmed-point-mark::before {
        width: 100%;
        height: 2px;
        transform: translate(-50%, -50%);
      }
      .mlcad-confirmed-point-mark::after {
        width: 2px;
        height: 100%;
        transform: translate(-50%, -50%);
      }
    `
    document.head.appendChild(style)
  }
}
