import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  isLayerLocked,
  openLayerForWrite,
  setLayerFrozenState,
  setLayerLockedState
} from './AcApLayerEdit'

/**
 * Snapshot of the layer state at a specific point in time.
 */
interface AcApLayerStateSnapshot {
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
 * Global store for layer state snapshots to support LAYERP command.
 */
class AcApLayerPreviousStateManager {
  private previousSnapshot: AcApLayerStateSnapshot | null = null

  /**
   * Captures the current layer state.
   * @param context - Active application context
   */
  captureState(context: AcApContext): void {
    const db = context.doc.database
    this.previousSnapshot = {
      clayer: db.clayer,
      states: [...db.tables.layerTable.newIterator()].map(layer => ({
        name: layer.name,
        isOn: !layer.isOff,
        isFrozen: layer.isFrozen,
        isLocked: isLayerLocked(layer)
      }))
    }
  }

  /**
   * Restores the previous layer state.
   * @param context - Active application context
   * @returns true if restoration was successful
   */
  restorePreviousState(context: AcApContext): boolean {
    if (!this.previousSnapshot) {
      return false
    }

    const db = context.doc.database
    const snapshot = this.previousSnapshot

    // Apply layer state changes
    snapshot.states.forEach(state => {
      const layer = openLayerForWrite(db, state.name)
      if (!layer) return

      layer.isOff = !state.isOn
      setLayerFrozenState(layer, state.isFrozen)
      setLayerLockedState(layer, state.isLocked)
    })

    const currentLayer = openLayerForWrite(db, snapshot.clayer)
    if (currentLayer) {
      currentLayer.isOff = false
      setLayerFrozenState(currentLayer, false)
      db.clayer = currentLayer.name
      return true
    }

    return false
  }

  /**
   * Clears the previous state snapshot.
   */
  clearPreviousState(): void {
    this.previousSnapshot = null
  }
}

// Global instance
const layerPreviousStateManager = new AcApLayerPreviousStateManager()

/**
 * Exposes layer previous state manager for external use.
 */
export function getLayerPreviousStateManager(): AcApLayerPreviousStateManager {
  return layerPreviousStateManager
}

/**
 * AutoCAD-like `LAYERP` command.
 *
 * The command restores the layer state to what it was before the last
 * layer-modifying operation. This includes changes to layer on/off,
 * freeze/thaw, and lock/unlock states.
 *
 * Note: This is a simplified implementation that tracks one previous state.
 * A full implementation would maintain a stack of states.
 */
export class AcApLayerPCmd extends AcEdCommand {
  /**
   * Creates a write-enabled `LAYERP` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the restore-previous-layer-state workflow.
   *
   * @param context - Active application context used to update the current drawing.
   * @returns Resolves when the restoration is complete or if there is nothing to restore.
   */
  async execute(context: AcApContext) {
    if (layerPreviousStateManager.restorePreviousState(context)) {
      this.showMessage(AcApI18n.t('jig.layerp.restored'), 'success')
    } else {
      this.showMessage(AcApI18n.t('jig.layerp.noPreviousState'))
    }

    context.view.selectionSet.clear()
  }
}

/**
 * Captures layer state before executing a layer-modifying command.
 * Should be called before executing commands like LAYOFF, LAYFRZ, LAYLCK, etc.
 *
 * @param context - Active application context
 */
export function captureLayerStateBeforeOperation(context: AcApContext): void {
  layerPreviousStateManager.captureState(context)
}
