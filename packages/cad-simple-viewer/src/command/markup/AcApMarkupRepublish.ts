import type { AcEdBaseView } from '../../editor'
import type { AcApMarkupRecord } from './AcApMarkupTypes'

/**
 * Callback that republishes one markup visual on a view.
 *
 * @param view - Host view for the markup presenter.
 * @param record - Store record to publish.
 */
type MarkupPublishFn = (view: AcEdBaseView, record: AcApMarkupRecord) => void

/**
 * Presenter publish implementation registered at module load.
 * Indirection avoids circular imports between entities and the presenter.
 */
let publishImpl: MarkupPublishFn | undefined

/**
 * Wire the markup publish implementation.
 *
 * Called by {@link AcApMarkupPresenter} on module load to avoid circular imports
 * between entity grip helpers and the presenter.
 *
 * @param fn - Function that publishes a record onto a view.
 */
export function registerMarkupPublish(fn: MarkupPublishFn): void {
  publishImpl = fn
}

/**
 * Republish one markup visual after a geometry / style edit.
 *
 * No-ops when {@link registerMarkupPublish} has not been called yet.
 *
 * @param view - Host view for the markup presenter.
 * @param record - Updated store record to publish.
 */
export function republishMarkup(
  view: AcEdBaseView,
  record: AcApMarkupRecord
): void {
  publishImpl?.(view, record)
}
