import { AcDbDatabase, AcDbLayerTableRecord } from '@mlightcad/data-model'

/**
 * Snapshot of the layer state at a specific point in time.
 */
export interface AcEdLayerStateSnapshot {
  /** Current layer name */
  clayer: string
  /** State of each layer */
  states: Array<{
    name: string
    isOn: boolean
    isFrozen: boolean
    isLocked: boolean
  }>
}

/**
 * Manages layer state snapshots to support LAYERP command and other layer state restoration operations.
 *
 * This manager captures the complete state of all layers before layer-modifying operations
 * and provides methods to restore that state later. It maintains a single previous snapshot
 * which can be replaced with new captures or cleared.
 */
export class AcEdLayerStateManager {
  /** The most recently captured layer state snapshot */
  private previousSnapshot: AcEdLayerStateSnapshot | null = null

  /**
   * Restores the previous layer state to the current database.
   *
   * This applies all captured layer state changes:
   * - Restores on/off state
   * - Restores frozen/thawed state
   * - Restores locked/unlocked state
   * - Restores the active layer (clayer)
   *
   * @param db - Active database instance
   * @returns true if restoration was successful, false if no snapshot is available
   */
  restorePreviousState(db: AcDbDatabase): boolean {
    if (!this.previousSnapshot) {
      return false
    }

    const snapshot = this.previousSnapshot

    // Apply layer state changes
    snapshot.states.forEach(state => {
      const layer = db.tables.layerTable.getAt(state.name)
      if (!layer) return

      layer.isOff = !state.isOn
      this.setLayerFrozen(layer, state.isFrozen)
      this.setLayerLocked(layer, state.isLocked)
    })

    // Restore current layer
    const currentLayer = db.tables.layerTable.getAt(snapshot.clayer)
    if (currentLayer) {
      currentLayer.isOff = false
      this.setLayerFrozen(currentLayer, false)
      db.clayer = currentLayer.name
      return true
    }

    return false
  }

  /**
   * Clears the stored previous state snapshot.
   *
   * After calling this method, subsequent calls to `restorePreviousState()`
   * will return false until a new state is captured.
   */
  clearPreviousState(): void {
    this.previousSnapshot = null
  }

  /**
   * Checks if a snapshot is currently available.
   *
   * @returns true if a snapshot has been captured and not cleared
   */
  hasPreviousState(): boolean {
    return this.previousSnapshot !== null
  }

  /**
   * Imports a pre-captured snapshot as the previous state.
   *
   * This is useful when the state is captured at a different point than
   * when it's stored, such as in event-driven scenarios.
   *
   * @param snapshot - The snapshot to store as the previous state
   */
  importSnapshot(snapshot: AcEdLayerStateSnapshot): void {
    this.previousSnapshot = snapshot
  }

  /**
   * Compares two layer state snapshots to detect if any layer properties changed.
   *
   * Returns true if any layer's on/off, frozen, or locked state differs between
   * the two snapshots, or if the current layer (clayer) changed.
   *
   * @param before - The snapshot before the command
   * @param after - The snapshot after the command
   * @returns true if layer states differ, false if they are identical
   */
  static hasLayerStateChanged(
    before: AcEdLayerStateSnapshot,
    after: AcEdLayerStateSnapshot
  ): boolean {
    // Check if current layer changed
    if (before.clayer !== after.clayer) {
      return true
    }

    // Check if layer count changed
    if (before.states.length !== after.states.length) {
      return true
    }

    // Check if any layer state changed
    for (let i = 0; i < before.states.length; i++) {
      const beforeState = before.states[i]
      const afterState = after.states[i]

      if (
        beforeState.name !== afterState.name ||
        beforeState.isOn !== afterState.isOn ||
        beforeState.isFrozen !== afterState.isFrozen ||
        beforeState.isLocked !== afterState.isLocked
      ) {
        return true
      }
    }

    return false
  }

  /**
   * Sets or clears the locked bit in layer flags.
   *
   * @param layer - Layer table record
   * @param locked - Whether the layer should be locked
   */
  private setLayerLocked(layer: AcDbLayerTableRecord, locked: boolean) {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = locked ? flags | 0x04 : flags & ~0x04
  }

  /**
   * Sets or clears the frozen bit in layer flags.
   *
   * @param layer - Layer table record
   * @param frozen - Whether the layer should be frozen
   */
  private setLayerFrozen(layer: AcDbLayerTableRecord, frozen: boolean) {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = frozen ? flags | 0x01 : flags & ~0x01
  }
}
