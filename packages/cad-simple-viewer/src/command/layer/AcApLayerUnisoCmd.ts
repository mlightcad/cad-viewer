import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  openLayerForWrite,
  setLayerFrozenState,
  setLayerLockedState
} from './AcApLayerEdit'
import {
  AcApLayerIsoLayerSnapshot,
  AcApLayerIsoState
} from './AcApLayerIsoState'

/**
 * AutoCAD-like `LAYUNISO` command.
 *
 * The command restores the layer state captured by the previous `LAYISO`.
 * It only reverts properties that still match the value applied by `LAYISO`,
 * so layer edits made after isolation are retained.
 */
export class AcApLayerUnisoCmd extends AcEdCommand {
  /**
   * Creates a write-enabled `LAYUNISO` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Restores the previous `LAYISO` layer state when available.
   *
   * @param context - Active application context used to update layer states.
   * @returns Resolves after restoration is attempted.
   */
  async execute(context: AcApContext) {
    const snapshot = AcApLayerIsoState.consume()
    if (!snapshot) {
      this.showMessage(AcApI18n.t('jig.layuniso.noPrevious'), 'warning')
      return
    }

    const db = context.doc.database
    const table = db.tables.layerTable
    let restoredLayers = 0

    for (const entry of snapshot.layers) {
      if (!table.getAt(entry.name)) {
        this.showMessage(
          `${AcApI18n.t('jig.layuniso.layerNotFound')}: ${entry.name}`,
          'warning'
        )
        continue
      }

      if (this.restoreLayerIfUnchanged(db, entry)) {
        restoredLayers++
      }
    }

    if (
      db.clayer === snapshot.currentLayerAfter &&
      snapshot.currentLayerBefore !== snapshot.currentLayerAfter &&
      table.getAt(snapshot.currentLayerBefore)
    ) {
      db.clayer = snapshot.currentLayerBefore
    }

    context.view.selectionSet.clear()

    if (restoredLayers === 0) {
      this.showMessage(AcApI18n.t('jig.layuniso.nothingRestored'))
      return
    }

    this.showMessage(
      `${AcApI18n.t('jig.layuniso.restored')}: ${restoredLayers}`,
      'success'
    )
  }

  /**
   * Restores tracked layer flags that were not changed after `LAYISO`.
   *
   * @param layer - Layer to restore.
   * @param snapshot - Before/after state captured for this layer by `LAYISO`.
   * @returns `true` if any tracked flag was restored.
   */
  private restoreLayerIfUnchanged(
    db: AcApContext['doc']['database'],
    snapshot: AcApLayerIsoLayerSnapshot
  ) {
    const layer = db.tables.layerTable.getAt(snapshot.name)
    if (!layer) return false

    const opened = openLayerForWrite(db, layer)
    if (!opened) return false

    let restored = false

    if (
      opened.isOff === snapshot.isolated.isOff &&
      opened.isOff !== snapshot.before.isOff
    ) {
      opened.isOff = snapshot.before.isOff
      restored = true
    }

    if (
      opened.isFrozen === snapshot.isolated.isFrozen &&
      opened.isFrozen !== snapshot.before.isFrozen
    ) {
      setLayerFrozenState(opened, snapshot.before.isFrozen)
      restored = true
    }

    if (
      opened.isLocked === snapshot.isolated.isLocked &&
      opened.isLocked !== snapshot.before.isLocked
    ) {
      setLayerLockedState(opened, snapshot.before.isLocked)
      restored = true
    }

    return restored
  }
}
