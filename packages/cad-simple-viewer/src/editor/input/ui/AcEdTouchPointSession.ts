/**
 * Long-press delay before the snap loupe appears, in milliseconds.
 */
export const ACED_TOUCH_POINT_LONG_PRESS_MS = 1000

/**
 * Pointer movement in CSS pixels that cancels a pending long-press so the
 * gesture can be treated as a pan instead of a pick.
 */
export const ACED_TOUCH_POINT_MOVE_CANCEL_PX = 10

let followingClickSink: ((event: Event) => void) | null = null
let followingClickSinkTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Ignore compatibility mouse events this long after a touch pick ends.
 *
 * Chrome fires a `pointerType: 'mouse'` `pointerdown` then `click` after
 * touch `pointerup`. Those coordinates are near the finger, so a two-point
 * command (measure distance) would commit both points from one long-press.
 */
export const ACED_TOUCH_MOUSE_GUARD_MS = 1000

let ignoreCompatMouseUntil = 0

/**
 * Whether a mouse/pen event is a leftover from a touch gesture.
 *
 * Browsers synthesize `pointerType: 'mouse'` (and `click`) after touch.
 * Those events often have `clientX/clientY` of `0`, which maps to the
 * canvas origin — the top-left of the view.
 */
export function acedIsTouchDerivedMouseEvent(
  event: MouseEvent | PointerEvent
): boolean {
  if ('pointerType' in event && event.pointerType === 'touch') return true
  const caps = (
    event as MouseEvent & {
      sourceCapabilities?: { firesTouchEvents?: boolean }
    }
  ).sourceCapabilities
  return caps?.firesTouchEvents === true
}

/**
 * Whether client coordinates are the document origin.
 *
 * Compatibility mouse events after a toolbar tap are often dispatched at
 * `(0, 0)`, which would commit a point at the canvas top-left.
 *
 * @param event - Event with client coordinates.
 * @returns True when both client axes are zero.
 */
export function acedIsGhostClientOrigin(event: {
  clientX: number
  clientY: number
}): boolean {
  return event.clientX === 0 && event.clientY === 0
}

/**
 * Stops the next `click` in the capture phase and ignores compatibility
 * mouse events for {@link ACED_TOUCH_MOUSE_GUARD_MS}.
 *
 * Touch picking commits on `pointerup`. The browser then synthesizes a
 * mouse `pointerdown` + `click` near the finger. A new point prompt would
 * treat that as a real mouse pick unless this guard stays armed across
 * prompt instances.
 */
export function acedSinkFollowingClick() {
  acedArmTouchMouseGuard()
  if (followingClickSink) return
  const sink = (event: Event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
    acedClearFollowingClickSink()
  }
  followingClickSink = sink
  window.addEventListener('click', sink, true)
  // If `preventDefault` on touch pointerdown already suppressed the leftover
  // click, do not leave the sink armed forever — that would eat the next
  // real mouse click on a hybrid (touch + mouse) device.
  followingClickSinkTimer = setTimeout(() => {
    acedClearFollowingClickSink()
  }, ACED_TOUCH_MOUSE_GUARD_MS)
}

/**
 * Removes {@link acedSinkFollowingClick} if it is armed.
 */
export function acedClearFollowingClickSink() {
  if (followingClickSinkTimer != null) {
    clearTimeout(followingClickSinkTimer)
    followingClickSinkTimer = null
  }
  if (!followingClickSink) return
  window.removeEventListener('click', followingClickSink, true)
  followingClickSink = null
}

/**
 * Arms the compatibility-mouse ignore window after a touch pick.
 *
 * @param now - Current time in milliseconds; defaults to `performance.now()`.
 */
export function acedArmTouchMouseGuard(now: number = performance.now()) {
  ignoreCompatMouseUntil = Math.max(
    ignoreCompatMouseUntil,
    now + ACED_TOUCH_MOUSE_GUARD_MS
  )
}

/**
 * Whether mouse `pointerdown` / `click` should be ignored as leftover from
 * a touch pick (including on a newly created prompt).
 *
 * @param now - Current time in milliseconds; defaults to `performance.now()`.
 * @returns True while a following-click sink is armed or the guard window
 *   has not expired.
 */
export function acedShouldIgnoreCompatMouse(
  now: number = performance.now()
): boolean {
  return followingClickSink != null || now < ignoreCompatMouseUntil
}

/**
 * Whether a `contextmenu` event is leftover from a touch long-press.
 *
 * Phones synthesize `contextmenu` ~500ms after finger-down — the same
 * gesture that opens the snap loupe. Point prompts treat right-click as
 * Enter; that leftover must not cancel the command.
 *
 * After `pointercancel`, some browsers omit `firesTouchEvents` and report
 * `button === 2`. The compat-mouse guard covers that case.
 *
 * @param event - Context-menu mouse event.
 * @returns True when the event should not be treated as right-click Enter.
 */
export function acedIsTouchLongPressContextMenu(event: MouseEvent): boolean {
  if (acedIsTouchDerivedMouseEvent(event)) return true
  return acedShouldIgnoreCompatMouse()
}

/**
 * Clears the click sink and mouse guard. Used by tests.
 */
export function acedResetTouchMouseGuard() {
  acedClearFollowingClickSink()
  ignoreCompatMouseUntil = 0
}

/**
 * Phases of a one-finger point-pick gesture.
 *
 * - `idle` — no gesture in progress.
 * - `pending` — finger is down; waiting for a short tap, long-press, or pan.
 * - `loupe` — long-press fired; the magnifier is visible.
 * - `panning` — moved past the cancel threshold before the timer; pick aborted.
 */
export type AcEdTouchPointPhase = 'idle' | 'pending' | 'loupe' | 'panning'

/**
 * Long-press / short-tap state machine for touch point picking.
 *
 * - Short tap (`pending` → end): commit at the last sample.
 * - Hold until {@link ACED_TOUCH_POINT_LONG_PRESS_MS}: enter `loupe`.
 * - Move beyond {@link ACED_TOUCH_POINT_MOVE_CANCEL_PX} before the timer
 *   (when `cancelOnMove` is true): enter `panning` and do not commit.
 */
export class AcEdTouchPointSession {
  /** Current gesture phase. */
  private _phase: AcEdTouchPointPhase = 'idle'
  /** Pointer id of the active finger, or `-1` when idle. */
  private _pointerId = -1
  /** Client X of the finger-down sample. */
  private _startX = 0
  /** Client Y of the finger-down sample. */
  private _startY = 0
  /** Latest sample X in the same space as {@link start}. */
  private _x = 0
  /** Latest sample Y in the same space as {@link start}. */
  private _y = 0
  /** Pending long-press timer, or `null` when none is scheduled. */
  private _timer: ReturnType<typeof setTimeout> | null = null
  /** Callback invoked once when the session enters the `loupe` phase. */
  private _onLongPress: (() => void) | null = null

  /**
   * Current gesture phase.
   *
   * @returns One of {@link AcEdTouchPointPhase}.
   */
  get phase(): AcEdTouchPointPhase {
    return this._phase
  }

  /**
   * Active pointer id, or `-1` when idle.
   *
   * @returns The pointer id passed to {@link start}, or `-1`.
   */
  get pointerId(): number {
    return this._pointerId
  }

  /**
   * Latest sample X in the same space as {@link start}.
   *
   * @returns Client (or canvas-host) X of the last sample.
   */
  get x(): number {
    return this._x
  }

  /**
   * Latest sample Y in the same space as {@link start}.
   *
   * @returns Client (or canvas-host) Y of the last sample.
   */
  get y(): number {
    return this._y
  }

  /**
   * Begins a touch pick. Invokes `onLongPress` after the long-press delay
   * unless the session is cancelled or converted to a pan.
   *
   * @param pointerId - Pointer id of the finger that started the gesture.
   * @param x - Sample X in client (or canvas-host) CSS pixels.
   * @param y - Sample Y in client (or canvas-host) CSS pixels.
   * @param onLongPress - Called once when the session enters the `loupe` phase.
   * @param longPressMs - Delay before the loupe appears; defaults to
   *   {@link ACED_TOUCH_POINT_LONG_PRESS_MS}.
   */
  start(
    pointerId: number,
    x: number,
    y: number,
    onLongPress: () => void,
    longPressMs: number = ACED_TOUCH_POINT_LONG_PRESS_MS
  ) {
    this.reset()
    this._phase = 'pending'
    this._pointerId = pointerId
    this._startX = x
    this._startY = y
    this._x = x
    this._y = y
    this._onLongPress = onLongPress
    this._timer = setTimeout(() => {
      this._timer = null
      if (this._phase !== 'pending') return
      this._phase = 'loupe'
      this._onLongPress?.()
    }, longPressMs)
  }

  /**
   * Updates the sample position.
   *
   * @param x - New sample X in the same space as {@link start}.
   * @param y - New sample Y in the same space as {@link start}.
   * @param cancelOnMove - When true, movement past the cancel threshold
   *   before the loupe appears aborts the pick (live viewer pan).
   * @param cancelPx - Movement threshold in CSS pixels; defaults to
   *   {@link ACED_TOUCH_POINT_MOVE_CANCEL_PX}.
   * @returns `'panning'` when the pick was aborted, otherwise `'continue'`.
   */
  move(
    x: number,
    y: number,
    cancelOnMove: boolean,
    cancelPx: number = ACED_TOUCH_POINT_MOVE_CANCEL_PX
  ): 'continue' | 'panning' {
    if (this._phase === 'idle' || this._phase === 'panning') return 'continue'
    this._x = x
    this._y = y
    if (this._phase !== 'pending' || !cancelOnMove) return 'continue'
    const dx = x - this._startX
    const dy = y - this._startY
    if (dx * dx + dy * dy < cancelPx * cancelPx) return 'continue'
    this.clearTimer()
    this._phase = 'panning'
    this._onLongPress = null
    return 'panning'
  }

  /**
   * Ends the gesture.
   *
   * @returns `'commit'` for a short tap or loupe release, `'ignore'` otherwise.
   */
  end(): 'commit' | 'ignore' {
    const phase = this._phase
    this.reset()
    if (phase === 'pending' || phase === 'loupe') return 'commit'
    return 'ignore'
  }

  /**
   * Aborts without committing (for example on `pointercancel`).
   */
  cancel() {
    this.reset()
  }

  /**
   * Whether a pick is in progress (including while the loupe is visible).
   *
   * @returns True in the `pending` or `loupe` phase.
   */
  get isPicking(): boolean {
    return this._phase === 'pending' || this._phase === 'loupe'
  }

  /**
   * Whether the long-press magnifier is currently shown.
   *
   * @returns True in the `loupe` phase.
   */
  get isLoupe(): boolean {
    return this._phase === 'loupe'
  }

  /**
   * Clears the pending long-press timer, if any.
   */
  private clearTimer() {
    if (this._timer != null) {
      clearTimeout(this._timer)
      this._timer = null
    }
  }

  /**
   * Returns the session to {@link AcEdTouchPointPhase | idle} and drops the
   * long-press callback.
   */
  private reset() {
    this.clearTimer()
    this._phase = 'idle'
    this._pointerId = -1
    this._onLongPress = null
  }
}
