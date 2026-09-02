/**
 * Portable precise point-pick tutorial dialog (DOM + CSS animation only).
 *
 * Re-exported from `@mlightcad/cad-simple-viewer` for the live viewer and
 * offline HTML viewer (via {@link AcExHtmlSimpleViewerUi}).
 */

import type { AcEdUiTheme } from '../editor/global/AcEdUiTheme'
import { AcUiDialog } from './AcUiDialog'

/** DOM id of tutorial-specific styles. */
const STYLE_ID = 'ml-ui-touch-point-tutorial-styles'

/** Loop length for the demo animation (ms). */
const DEMO_CYCLE_MS = 10000

/** Road intersection center in canvas percentage coordinates. */
const ROAD_X_PCT = 38
const ROAD_Y_PCT = 42

/** Road half-width in viewBox units (160×100). */
const ROAD_HALF_W = 4

/** Ring stroke draw duration (ms). */
const RING_DRAW_MS = 500

/** Delay after snap box before cross commits green (ms). */
const SNAP_BOX_BEFORE_LIFT_MS = 500

/** Cross stays green at snap corner before finger returns (ms). */
const CROSS_GREEN_HOLD_MS = 2000

/** Finger returns to start while the touch zone fades out (ms). */
const RETURN_MS = 900

/** Move from cross appear until cross top hits snap corner (ms). */
const MOVE_TO_SNAP_TOP_MS = 1800

/** Move cross center onto snap corner after top touches (ms). */
const MOVE_TO_SNAP_CENTER_MS = 400

/** Finger appears before the touch ring fill. */
const FINGER_APPEAR_MS = 280

/** Gray fill fades in after the finger. */
const FILL_APPEAR_MS = 180

/** Touch zone diameter (px); white circle is centered on the finger point. */
const TOUCH_ZONE_SIZE = 36
const TOUCH_ZONE_RADIUS = TOUCH_ZONE_SIZE / 2

/** Gap between cross bottom and touch circle top (px). */
const CROSS_ABOVE_CIRCLE_GAP = 5

/** Crosshair size (px); CSS `top` anchors the cross center. */
const CROSS_SIZE = 18
const CROSS_HALF_H = CROSS_SIZE / 2

/** Cross center offset above the finger touch point (px). */
const CROSS_ABOVE_TOUCH_PX =
  TOUCH_ZONE_RADIUS + CROSS_ABOVE_CIRCLE_GAP + CROSS_HALF_H

/** Localized strings for the tutorial dialog. */
export interface AcUiTouchPointTutorialLabels {
  title: string
  description: string
  snoozeToday: string
  hideForever: string
  ok: string
}

/** Persisted snooze / dismiss preferences. */
export interface AcUiTouchPointTutorialPrefs {
  hideForever: boolean
  snoozeDate: string | null
}

/** Runtime configuration for {@link AcUiTouchPointTutorial.maybeShow}. */
export interface AcUiTouchPointTutorialConfig {
  /** Backdrop host; defaults to `document.body`. */
  host?: HTMLElement
  /** Theme tokens; defaults to {@link resolveUiTheme} from the host. */
  theme?: AcEdUiTheme
  labels: AcUiTouchPointTutorialLabels
  /** Long-press delay shown in the demo animation (ms). */
  longPressMs: number
  /** When false, {@link AcUiTouchPointTutorial.maybeShow} is a no-op. */
  shouldShow: () => boolean
  readPrefs: () => AcUiTouchPointTutorialPrefs
  writePrefs: (prefs: AcUiTouchPointTutorialPrefs) => void
}

/**
 * Returns today's date as `YYYY-MM-DD` in local time.
 */
export function acuiLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Whether the tutorial should be shown from layout + preference state.
 */
export function acuiShouldShowTouchPointTutorialFromPrefs(
  shouldShowOnMobile: () => boolean,
  prefs: AcUiTouchPointTutorialPrefs
): boolean {
  if (!shouldShowOnMobile()) return false
  if (prefs.hideForever) return false
  if (prefs.snoozeDate != null && prefs.snoozeDate === acuiLocalIsoDate()) {
    return false
  }
  return true
}

/**
 * Modal tutorial explaining long-press precise point picking on mobile.
 */
export class AcUiTouchPointTutorial extends AcUiDialog {
  private static openInstance: AcUiTouchPointTutorial | null = null

  private readonly config: AcUiTouchPointTutorialConfig
  private readonly snoozeTodayCheckbox: HTMLInputElement
  private readonly hideForeverCheckbox: HTMLInputElement

  private constructor(config: AcUiTouchPointTutorialConfig) {
    super({
      host: config.host,
      title: config.labels.title,
      theme: config.theme,
      layoutWidth: false,
      showCloseButton: false,
      titleAlign: 'center',
      closeOnBackdrop: false,
      closeOnEscape: false,
      dialogClassName: 'ml-ui-touch-point-tutorial'
    })
    this.config = config
    AcUiTouchPointTutorial.ensureTutorialStyles(config.longPressMs)

    const description = document.createElement('p')
    description.className = 'ml-ui-touch-point-tutorial-desc'
    description.textContent = config.labels.description
    this.bodyEl.appendChild(description)
    this.bodyEl.appendChild(AcUiTouchPointTutorial.createDemo())

    const options = document.createElement('div')
    options.className = 'ml-ui-touch-point-tutorial-options'

    this.snoozeTodayCheckbox = document.createElement('input')
    this.snoozeTodayCheckbox.type = 'checkbox'
    this.snoozeTodayCheckbox.id = 'ml-touch-tutorial-snooze-today'
    this.snoozeTodayCheckbox.checked = true
    const snoozeLabel = document.createElement('label')
    snoozeLabel.className = 'ml-ui-touch-point-tutorial-option'
    snoozeLabel.htmlFor = this.snoozeTodayCheckbox.id
    snoozeLabel.append(this.snoozeTodayCheckbox, document.createTextNode(''))
    snoozeLabel.lastChild!.textContent = config.labels.snoozeToday

    this.hideForeverCheckbox = document.createElement('input')
    this.hideForeverCheckbox.type = 'checkbox'
    this.hideForeverCheckbox.id = 'ml-touch-tutorial-hide-forever'
    const hideLabel = document.createElement('label')
    hideLabel.className = 'ml-ui-touch-point-tutorial-option'
    hideLabel.htmlFor = this.hideForeverCheckbox.id
    hideLabel.append(this.hideForeverCheckbox, document.createTextNode(''))
    hideLabel.lastChild!.textContent = config.labels.hideForever

    this.hideForeverCheckbox.addEventListener('change', () => {
      if (this.hideForeverCheckbox.checked) {
        this.snoozeTodayCheckbox.checked = false
      }
    })
    this.snoozeTodayCheckbox.addEventListener('change', () => {
      if (this.snoozeTodayCheckbox.checked) {
        this.hideForeverCheckbox.checked = false
      }
    })

    options.append(snoozeLabel, hideLabel)
    this.bodyEl.appendChild(options)

    const okBtn = document.createElement('button')
    okBtn.type = 'button'
    okBtn.className = 'ml-ui-touch-point-tutorial-ok'
    okBtn.textContent = config.labels.ok
    okBtn.addEventListener('click', () => this.dismiss())
    this.footerEl.appendChild(okBtn)
    this.focusAfterOpen(okBtn)
  }

  /**
   * Opens the tutorial when {@link AcUiTouchPointTutorialConfig.shouldShow} is true.
   */
  static maybeShow(config: AcUiTouchPointTutorialConfig): Promise<void> {
    if (!config.shouldShow()) return Promise.resolve()
    AcUiTouchPointTutorial.openInstance?.close()
    const dialog = new AcUiTouchPointTutorial(config)
    AcUiTouchPointTutorial.openInstance = dialog
    return dialog.show()
  }

  override close(): void {
    if (AcUiTouchPointTutorial.openInstance === this) {
      AcUiTouchPointTutorial.openInstance = null
    }
    super.close()
  }

  private dismiss(): void {
    const prefs = this.config.readPrefs()
    if (this.hideForeverCheckbox.checked) {
      this.config.writePrefs({ hideForever: true, snoozeDate: null })
    } else if (this.snoozeTodayCheckbox.checked) {
      this.config.writePrefs({
        hideForever: prefs.hideForever,
        snoozeDate: acuiLocalIsoDate()
      })
    }
    this.close()
  }

  private static createDemo(): HTMLDivElement {
    const snap = roadSnapCornerPct()
    const demo = document.createElement('div')
    demo.className = 'ml-touch-tutorial-demo'
    demo.setAttribute('aria-hidden', 'true')

    const canvas = document.createElement('div')
    canvas.className = 'ml-touch-tutorial-canvas'
    canvas.style.setProperty('--ml-touch-snap-x', `${snap.xPct}%`)
    canvas.style.setProperty('--ml-touch-snap-y', `${snap.yPct}%`)
    canvas.style.setProperty('--ml-touch-cross-above', `${CROSS_ABOVE_TOUCH_PX}px`)
    canvas.style.setProperty('--ml-touch-cross-half', `${CROSS_HALF_H}px`)

    const roads = document.createElement('div')
    roads.className = 'ml-touch-tutorial-roads'
    roads.innerHTML = roadCrossSvg()

    const snapBox = document.createElement('div')
    snapBox.className = 'ml-touch-tutorial-snap-box'

    const touchGroup = document.createElement('div')
    touchGroup.className = 'ml-touch-tutorial-touch-group'

    const touchZone = document.createElement('div')
    touchZone.className = 'ml-touch-tutorial-touch-zone'
    touchZone.innerHTML = touchZoneSvg()

    const finger = document.createElement('div')
    finger.className = 'ml-touch-tutorial-finger'
    finger.innerHTML = fingerIconSvg()

    const cross = document.createElement('div')
    cross.className = 'ml-touch-tutorial-cross'
    cross.innerHTML = snapCrossSvg()

    touchGroup.append(touchZone, finger)
    canvas.append(roads, snapBox, touchGroup, cross)
    demo.appendChild(canvas)
    return demo
  }

  private static pct(ms: number): string {
    return ((ms / DEMO_CYCLE_MS) * 100).toFixed(2)
  }

  private static pctAfter(baseMs: number, deltaMs: number): string {
    return AcUiTouchPointTutorial.pct(baseMs + deltaMs)
  }

  private static ensureTutorialStyles(longPressMs: number): void {
    if (document.getElementById(STYLE_ID)) return

    const fingerIn = AcUiTouchPointTutorial.pct(FINGER_APPEAR_MS)
    const fillIn = AcUiTouchPointTutorial.pct(FINGER_APPEAR_MS + FILL_APPEAR_MS)
    const ringStart = fillIn
    const ringEnd = AcUiTouchPointTutorial.pct(
      FINGER_APPEAR_MS + FILL_APPEAR_MS + RING_DRAW_MS
    )
    const crossIn = AcUiTouchPointTutorial.pct(longPressMs)
    const snapTopAt = AcUiTouchPointTutorial.pctAfter(
      longPressMs,
      MOVE_TO_SNAP_TOP_MS
    )
    const snapCenterAt = AcUiTouchPointTutorial.pctAfter(
      longPressMs,
      MOVE_TO_SNAP_TOP_MS + MOVE_TO_SNAP_CENTER_MS
    )
    const snapCommitAt = AcUiTouchPointTutorial.pctAfter(
      longPressMs,
      MOVE_TO_SNAP_TOP_MS + SNAP_BOX_BEFORE_LIFT_MS
    )
    const crossHoldEnd = AcUiTouchPointTutorial.pctAfter(
      longPressMs,
      MOVE_TO_SNAP_TOP_MS + SNAP_BOX_BEFORE_LIFT_MS + CROSS_GREEN_HOLD_MS
    )
    const returnStart = crossHoldEnd
    const returnEnd = AcUiTouchPointTutorial.pctAfter(
      longPressMs,
      MOVE_TO_SNAP_TOP_MS + SNAP_BOX_BEFORE_LIFT_MS + CROSS_GREEN_HOLD_MS + RETURN_MS
    )
    const resetAt = AcUiTouchPointTutorial.pct(DEMO_CYCLE_MS - 400)
    const fillVisible = AcUiTouchPointTutorial.pctAfter(
      FINGER_APPEAR_MS + FILL_APPEAR_MS,
      80
    )
    const crossVisible = AcUiTouchPointTutorial.pctAfter(longPressMs, 60)
    const snapBoxOn = AcUiTouchPointTutorial.pctAfter(
      longPressMs,
      MOVE_TO_SNAP_TOP_MS + 1
    )
    const crossGreen = AcUiTouchPointTutorial.pctAfter(
      longPressMs,
      MOVE_TO_SNAP_TOP_MS + SNAP_BOX_BEFORE_LIFT_MS + 1
    )

    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
.ml-ui-touch-point-tutorial {
  padding: 16px 18px;
}

.ml-ui-touch-point-tutorial-desc {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--ml-ui-text-muted, #606266);
  text-align: center;
}

.ml-touch-tutorial-demo {
  margin: 0 auto 14px;
  max-width: 100%;
}

.ml-touch-tutorial-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #0a0a0a;
  border-radius: 4px;
  overflow: hidden;
}

.ml-touch-tutorial-roads {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ml-touch-tutorial-roads svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-touch-tutorial-touch-group {
  position: absolute;
  left: 70%;
  top: 76%;
  width: 0;
  height: 0;
  animation: ml-touch-group ${DEMO_CYCLE_MS}ms ease-in-out infinite;
  z-index: 4;
}

.ml-touch-tutorial-touch-zone {
  position: absolute;
  left: 0;
  top: 0;
  width: 36px;
  height: 36px;
  margin: -18px 0 0 -18px;
  pointer-events: none;
  opacity: 0;
  animation: ml-touch-zone-opacity ${DEMO_CYCLE_MS}ms linear infinite;
  z-index: 1;
}

.ml-touch-tutorial-touch-zone svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-touch-tutorial-touch-fill {
  opacity: 1;
}

.ml-touch-tutorial-touch-ring {
  fill: none;
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 2;
  stroke-dasharray: 113.1;
  stroke-dashoffset: 113.1;
  animation: ml-touch-ring ${DEMO_CYCLE_MS}ms linear infinite;
}

.ml-touch-tutorial-finger {
  position: absolute;
  left: 0;
  top: 0;
  width: 30px;
  height: 38px;
  margin: -6px 0 0 -15px;
  opacity: 0;
  animation: ml-touch-finger-opacity ${DEMO_CYCLE_MS}ms linear infinite;
  z-index: 2;
}

.ml-touch-tutorial-finger svg {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45));
}

.ml-touch-tutorial-cross {
  position: absolute;
  left: 70%;
  top: calc(76% - var(--ml-touch-cross-above));
  width: ${CROSS_SIZE}px;
  height: ${CROSS_SIZE}px;
  margin: calc(-1 * var(--ml-touch-cross-half)) 0 0 calc(-1 * var(--ml-touch-cross-half));
  color: var(--ml-ui-accent, #0b84ff);
  opacity: 0;
  animation:
    ml-touch-cross-move ${DEMO_CYCLE_MS}ms ease-in-out infinite,
    ml-touch-cross-opacity ${DEMO_CYCLE_MS}ms linear infinite,
    ml-touch-cross-color ${DEMO_CYCLE_MS}ms step-end infinite;
  z-index: 5;
}

.ml-touch-tutorial-cross svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-touch-tutorial-snap-box {
  position: absolute;
  left: var(--ml-touch-snap-x);
  top: var(--ml-touch-snap-y);
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  border: 2px solid #0f0;
  border-radius: 1px;
  box-sizing: border-box;
  opacity: 0;
  pointer-events: none;
  animation: ml-touch-snap-box ${DEMO_CYCLE_MS}ms step-end infinite;
  z-index: 3;
}

@keyframes ml-touch-group {
  0%, ${crossIn}% {
    left: 70%;
    top: 76%;
  }
  ${snapTopAt}%, ${crossHoldEnd}% {
    left: var(--ml-touch-snap-x);
    top: calc(var(--ml-touch-snap-y) + var(--ml-touch-cross-above) + var(--ml-touch-cross-half));
  }
  ${returnEnd}%, 100% {
    left: 70%;
    top: 76%;
  }
}

@keyframes ml-touch-zone-opacity {
  0%, ${fillIn}% { opacity: 0; }
  ${fillVisible}%, ${returnStart}% { opacity: 1; }
  ${returnEnd}%, 100% { opacity: 0; }
}

@keyframes ml-touch-finger-opacity {
  0%, 2% { opacity: 0; }
  ${fingerIn}%, 99.99% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes ml-touch-ring {
  0%, ${ringStart}% { stroke-dashoffset: 113.1; }
  ${ringEnd}%, ${resetAt}% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 113.1; }
}

@keyframes ml-touch-cross-move {
  0%, ${crossIn}% {
    left: 70%;
    top: calc(76% - var(--ml-touch-cross-above));
  }
  ${snapTopAt}%, ${snapCenterAt}% {
    left: var(--ml-touch-snap-x);
    top: calc(var(--ml-touch-snap-y) + var(--ml-touch-cross-half));
  }
  ${snapCenterAt}%, 99.99% {
    left: var(--ml-touch-snap-x);
    top: var(--ml-touch-snap-y);
  }
  100% {
    left: 70%;
    top: calc(76% - var(--ml-touch-cross-above));
  }
}

@keyframes ml-touch-cross-opacity {
  0%, ${crossIn}% { opacity: 0; }
  ${crossVisible}%, ${returnEnd}% { opacity: 1; }
  ${resetAt}%, 100% { opacity: 0; }
}

@keyframes ml-touch-cross-color {
  0%, ${snapCommitAt}% { color: var(--ml-ui-accent, #0b84ff); }
  ${crossGreen}%, ${returnEnd}% { color: #0f0; }
  100% { color: var(--ml-ui-accent, #0b84ff); }
}

@keyframes ml-touch-snap-box {
  0%, ${snapTopAt}% { opacity: 0; }
  ${snapBoxOn}%, ${snapCommitAt}% { opacity: 1; }
  ${crossGreen}%, 100% { opacity: 0; }
}

.ml-ui-touch-point-tutorial-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
}

.ml-ui-touch-point-tutorial-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ml-ui-text, #303133);
  cursor: pointer;
  user-select: none;
}

.ml-ui-touch-point-tutorial-option input[type='checkbox'] {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--ml-ui-accent, #0b84ff);
}

.ml-ui-touch-point-tutorial .ml-ui-dialog-footer {
  justify-content: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ml-ui-border, #ebeef5);
}

.ml-ui-touch-point-tutorial-ok {
  border: none;
  background: transparent;
  color: var(--ml-ui-accent, #0b84ff);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 16px;
}

.ml-ui-touch-point-tutorial-ok:hover {
  filter: brightness(1.08);
}
`.trim()
    document.head.appendChild(style)
  }
}

function roadSnapCornerPct(): { xPct: number; yPct: number } {
  const ix = (160 * ROAD_X_PCT) / 100
  const iy = (100 * ROAD_Y_PCT) / 100
  return {
    xPct: ((ix + ROAD_HALF_W) / 160) * 100,
    yPct: ((iy + ROAD_HALF_W) / 100) * 100
  }
}

function roadCrossSvg(): string {
  const ix = (160 * ROAD_X_PCT) / 100
  const iy = (100 * ROAD_Y_PCT) / 100
  const h = ROAD_HALF_W
  const xl = ix - h
  const xr = ix + h
  const yt = iy - h
  const yb = iy + h
  const gray = 'rgba(210, 210, 210, 0.55)'
  const red = 'rgba(230, 70, 70, 0.95)'
  return `<svg viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" y1="${yt}" x2="${xl}" y2="${yt}" stroke="${gray}" stroke-width="0.9"/>
    <line x1="${xr}" y1="${yt}" x2="160" y2="${yt}" stroke="${gray}" stroke-width="0.9"/>
    <line x1="0" y1="${yb}" x2="${xl}" y2="${yb}" stroke="${gray}" stroke-width="0.9"/>
    <line x1="${xr}" y1="${yb}" x2="160" y2="${yb}" stroke="${gray}" stroke-width="0.9"/>
    <line x1="${xl}" y1="0" x2="${xl}" y2="${yt}" stroke="${gray}" stroke-width="0.9"/>
    <line x1="${xl}" y1="${yb}" x2="${xl}" y2="100" stroke="${gray}" stroke-width="0.9"/>
    <line x1="${xr}" y1="0" x2="${xr}" y2="${yt}" stroke="${gray}" stroke-width="0.9"/>
    <line x1="${xr}" y1="${yb}" x2="${xr}" y2="100" stroke="${gray}" stroke-width="0.9"/>
    <line x1="0" y1="${iy}" x2="160" y2="${iy}" stroke="${red}" stroke-width="1.1"/>
    <line x1="${ix}" y1="0" x2="${ix}" y2="100" stroke="${red}" stroke-width="1.1"/>
  </svg>`
}

function touchZoneSvg(): string {
  return `<svg viewBox="0 0 36 36" aria-hidden="true">
    <circle class="ml-touch-tutorial-touch-fill" cx="18" cy="18" r="16"
      fill="rgba(120, 120, 120, 0.42)"/>
    <circle class="ml-touch-tutorial-touch-ring" cx="18" cy="18" r="18"/>
  </svg>`
}

function fingerIconSvg(): string {
  return `<svg viewBox="0 0 24 32" aria-hidden="true">
    <path fill="#f5dcc8" stroke="#c9a88a" stroke-width="0.6"
      d="M12 2c-2.2 0-4 1.6-4 4.2v8.3c0 .6-.5 1-1 1s-1-.4-1-1V8.5C6 5.5 4 4 2 4.5 1 4.7.5 5.5.8 6.4c1.2 3.8 3.2 7.2 5.8 10.1 1.8 2 3.4 3.2 5.4 3.2 3.5 0 6-2.8 6-6.6V6.2C18 3.8 15.4 2 12 2z"/>
    <ellipse cx="12" cy="28" rx="9" ry="2.5" fill="rgba(0,0,0,0.25)"/>
  </svg>`
}

function snapCrossSvg(): string {
  return `<svg viewBox="0 0 16 16" aria-hidden="true">
    <path fill="none" stroke="currentColor" stroke-width="2"
      d="M8 2v12M2 8h12"/>
  </svg>`
}
