import { AcGeBox2d, AcGeVector2d } from '@mlightcad/data-model'

/** Callback that applies a zoom-to-fit in the host view. */
export type AcTrProgressiveOpenFitZoomFn = (
  box: AcGeBox2d,
  margin?: number
) => void

/**
 * Coordinates camera framing while a document is opened and entities are still
 * being batch-converted into the scene.
 *
 * Responsibilities:
 * - Throttled incremental fit for large drawings while entities convert
 * - Final fit once conversion completes (always from batch geometry bounds)
 * - Stop auto-framing when the user pans or zooms manually
 *
 * UI yields during open are owned by {@link AcTrView2d.batchConvert} via
 * {@link AcCmUiYieldGate}; this controller only manages camera framing.
 *
 * The host view ({@link AcTrView2d}) supplies layout fit boxes and performs
 * the actual camera updates through {@link AcTrProgressiveOpenFitZoomFn}.
 */
export class AcTrProgressiveOpenFitController {
  private static readonly SMALL_ENTITY_THRESHOLD = 500
  private static readonly BBOX_GROWTH_RATIO = 1.5
  private static readonly FIT_INTERVAL_MS = 500

  private active = false
  private userAdjusted = false
  private programmaticDepth = 0
  private incrementalEnabled = false
  private initialPendingCount = 0
  private convertedCount = 0
  private lastFittedBox?: AcGeBox2d
  private lastZoomAt = 0

  constructor(private readonly zoomTo: AcTrProgressiveOpenFitZoomFn) {}

  get isActive() {
    return this.active
  }

  /**
   * Starts progressive open framing for the current document open operation.
   *
   * Safe to call again while already active (e.g. once before `db.read` with an
   * unknown count, then again after appends have started): refreshes the
   * pending-count threshold without resetting user-adjusted / fit state.
   */
  begin(pendingEntityCount: number) {
    if (this.active) {
      this.initialPendingCount = Math.max(
        this.initialPendingCount,
        pendingEntityCount
      )
      this.maybeEnableIncrementalFit()
      return
    }

    this.active = true
    this.userAdjusted = false
    this.lastZoomAt = 0
    this.initialPendingCount = pendingEntityCount
    this.convertedCount = 0
    this.lastFittedBox = undefined
    this.incrementalEnabled = false
    this.maybeEnableIncrementalFit()
  }

  /** Ends progressive open framing. */
  end() {
    this.active = false
    this.incrementalEnabled = false
    this.lastFittedBox = undefined
    this.convertedCount = 0
  }

  /**
   * Applies the terminal fit after all entities are converted, unless the user
   * already adjusted the view manually.
   */
  applyFinalFit(resolveFitBox: () => AcGeBox2d | undefined) {
    if (this.userAdjusted) {
      return
    }

    const box = resolveFitBox()
    if (box) {
      this.applyZoom(box)
    }
  }

  /**
   * Notifies the controller that the active layout camera changed. User-driven
   * changes cancel further auto framing.
   */
  onLayoutViewChanged() {
    if (!this.active || this.userAdjusted || this.programmaticDepth > 0) {
      return
    }

    this.userAdjusted = true
    this.end()
  }

  /**
   * Called after one entity (or group bucket) was added to the scene during open.
   */
  afterGeometryBatch(
    resolveFitBox: () => AcGeBox2d | undefined,
    _entityIndex?: number
  ) {
    if (!this.active) {
      return
    }

    this.convertedCount++
    this.maybeEnableIncrementalFit()
    this.maybeIncrementalFit(resolveFitBox)
  }

  private maybeEnableIncrementalFit() {
    if (this.incrementalEnabled) {
      return
    }
    if (
      this.initialPendingCount >=
        AcTrProgressiveOpenFitController.SMALL_ENTITY_THRESHOLD ||
      this.convertedCount >=
        AcTrProgressiveOpenFitController.SMALL_ENTITY_THRESHOLD
    ) {
      this.incrementalEnabled = true
    }
  }

  private maybeIncrementalFit(resolveFitBox: () => AcGeBox2d | undefined) {
    if (!this.active || !this.incrementalEnabled || this.userAdjusted) {
      return
    }

    const now = performance.now()
    if (
      now - this.lastZoomAt <
      AcTrProgressiveOpenFitController.FIT_INTERVAL_MS
    ) {
      return
    }

    const box = resolveFitBox()
    if (!box || !this.shouldApplyIncrementalFit(box)) {
      return
    }

    this.lastZoomAt = now
    this.applyZoom(box)
  }

  private shouldApplyIncrementalFit(box: AcGeBox2d) {
    const lastBox = this.lastFittedBox
    if (!lastBox) {
      return true
    }

    const lastArea = this.estimateBoxArea(lastBox)
    if (lastArea <= Number.EPSILON) {
      return true
    }

    return (
      this.estimateBoxArea(box) >=
      lastArea * AcTrProgressiveOpenFitController.BBOX_GROWTH_RATIO
    )
  }

  private applyZoom(box: AcGeBox2d, margin: number = 1.1) {
    this.programmaticDepth++
    try {
      this.zoomTo(box, margin)
      this.lastFittedBox = this.snapshotFitBox(box)
    } finally {
      this.programmaticDepth--
    }
  }

  private estimateBoxArea(box: AcGeBox2d) {
    const size = new AcGeVector2d()
    box.getSize(size)
    return Math.abs(size.x) * Math.abs(size.y)
  }

  private snapshotFitBox(box: AcGeBox2d) {
    return new AcGeBox2d(
      { x: box.min.x, y: box.min.y },
      { x: box.max.x, y: box.max.y }
    )
  }
}
