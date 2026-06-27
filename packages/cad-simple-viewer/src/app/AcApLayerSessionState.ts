/**
 * Snapshot of the layer table at a point in time for the `LAYERP` command.
 */
export interface AcApLayerPreviousSnapshot {
  /** Current layer name (`CLAYER`) at capture time. */
  clayer: string
  /** Per-layer on, frozen, and locked state. */
  states: Array<{
    name: string
    isOn: boolean
    isFrozen: boolean
    isLocked: boolean
  }>
}
