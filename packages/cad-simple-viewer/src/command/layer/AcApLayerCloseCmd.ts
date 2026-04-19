import { AcApContext } from '../../app'
import { AcEdCommand, eventBus } from '../../editor'

/**
 * AutoCAD-style `LAYERCLOSE` command.
 *
 * Host applications decide how to map this request to concrete UI. In the
 * viewer app, it closes the layer properties manager when that palette tab is
 * currently active.
 */
export class AcApLayerCloseCmd extends AcEdCommand {
  /**
   * Emits a request to close the layer properties manager.
   *
   * The viewer listens for this event and only closes the palette when the
   * layer manager tab is currently active, which mirrors AutoCAD's
   * `LAYERCLOSE` behavior.
   *
   * @param _context - Active application context (unused).
   * @returns Resolves after the close request has been emitted.
   */
  async execute(_context: AcApContext) {
    eventBus.emit('close-layer-manager', {})
  }
}
