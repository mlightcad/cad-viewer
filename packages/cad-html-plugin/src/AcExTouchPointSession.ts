/**
 * Long-press delay before the snap loupe appears, in milliseconds.
 */
export const ACEX_TOUCH_POINT_LONG_PRESS_MS = 350

/**
 * Pointer movement in CSS pixels that cancels a pending long-press so the
 * gesture can be treated as a pan. Offline HTML drawing tools already disable
 * one-finger pan, so callers typically pass `cancelOnMove: false`.
 */
export const ACEX_TOUCH_POINT_MOVE_CANCEL_PX = 10

/**
 * Phases of a one-finger point-pick gesture.
 *
 * - `idle` — no gesture in progress.
 * - `pending` — finger is down; waiting for a short tap, long-press, or pan.
 * - `loupe` — long-press fired; the magnifier is visible.
 * - `panning` — moved past the cancel threshold before the timer; pick aborted.
 */
export type AcExTouchPointPhase = 'idle' | 'pending' | 'loupe' | 'panning'

/**
 * Long-press / short-tap state machine for touch point picking in the
 * exported HTML viewer.
 *
 * - Short tap (`pending` → end): commit at the last sample.
 * - Hold until {@link ACEX_TOUCH_POINT_LONG_PRESS_MS}: enter `loupe`.
 * - Move beyond {@link ACEX_TOUCH_POINT_MOVE_CANCEL_PX} before the timer
 *   (when `cancelOnMove` is true): enter `panning` and do not commit.
 */
export class AcExTouchPointSession {
  /** Current gesture phase. */
  private _phase: AcExTouchPointPhase = 'idle'
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
   * @returns One of {@link AcExTouchPointPhase}.
   */
  get phase(): AcExTouchPointPhase {
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
   * @returns Client X of the last sample.
   */
  get x(): number {
    return this._x
  }

  /**
   * Latest sample Y in the same space as {@link start}.
   *
   * @returns Client Y of the last sample.
   */
  get y(): number {
    return this._y
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
   * Begins a touch pick. Invokes `onLongPress` after the long-press delay
   * unless the session is cancelled or converted to a pan.
   *
   * @param pointerId - Pointer id of the finger that started the gesture.
   * @param x - Sample X in client CSS pixels.
   * @param y - Sample Y in client CSS pixels.
   * @param onLongPress - Called once when the session enters the `loupe` phase.
   * @param longPressMs - Delay before the loupe appears; defaults to
   *   {@link ACEX_TOUCH_POINT_LONG_PRESS_MS}.
   */
  start(
    pointerId: number,
    x: number,
    y: number,
    onLongPress: () => void,
    longPressMs: number = ACEX_TOUCH_POINT_LONG_PRESS_MS
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
   *   before the loupe appears aborts the pick.
   * @param cancelPx - Movement threshold in CSS pixels; defaults to
   *   {@link ACEX_TOUCH_POINT_MOVE_CANCEL_PX}.
   * @returns `'panning'` when the pick was aborted, otherwise `'continue'`.
   */
  move(
    x: number,
    y: number,
    cancelOnMove: boolean,
    cancelPx: number = ACEX_TOUCH_POINT_MOVE_CANCEL_PX
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
   * Clears the pending long-press timer, if any.
   */
  private clearTimer() {
    if (this._timer != null) {
      clearTimeout(this._timer)
      this._timer = null
    }
  }

  /**
   * Returns the session to {@link AcExTouchPointPhase | idle} and drops the
   * long-press callback.
   */
  private reset() {
    this.clearTimer()
    this._phase = 'idle'
    this._pointerId = -1
    this._onLongPress = null
  }
}
