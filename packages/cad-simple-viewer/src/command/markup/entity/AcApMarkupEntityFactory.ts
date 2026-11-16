import type { AcApMarkupRecord } from '../AcApMarkupTypes.js'
import { AcApMarkupCalloutEntity } from './AcApMarkupCalloutEntity.js'
import type { AcApMarkupEntity } from './AcApMarkupEntity.js'
import { AcApMarkupHighlightEntity } from './AcApMarkupHighlightEntity.js'
import { AcApMarkupSegmentEntity } from './AcApMarkupSegmentEntity.js'
import { AcApMarkupShapeEntity } from './AcApMarkupShapeEntity.js'
import { AcApMarkupStampEntity } from './AcApMarkupStampEntity.js'
import { AcApMarkupTextEntity } from './AcApMarkupTextEntity.js'

/**
 * Create the concrete markup entity for a store / sidecar record (deserialize).
 *
 * Pair with {@link AcApMarkupEntity.toRecord} for the serialize half of the
 * overlay persistence protocol. Dispatches on
 * {@link AcApMarkupRecord.geometry} `.type` to the matching entity class
 * (text, line/arrow, cloud/rect/circle, highlight, callout, stamp/symbol).
 *
 * @param record - Markup store record to wrap.
 * @returns Entity instance that implements overlay draw / grip / serialize.
 */
export function createMarkupEntityFromRecord(
  record: AcApMarkupRecord
): AcApMarkupEntity {
  switch (record.geometry.type) {
    case 'text':
      return new AcApMarkupTextEntity(record)
    case 'line':
    case 'arrow':
      return new AcApMarkupSegmentEntity(record)
    case 'cloud':
    case 'rect':
    case 'circle':
      return new AcApMarkupShapeEntity(record)
    case 'highlight':
      return new AcApMarkupHighlightEntity(record)
    case 'callout':
      return new AcApMarkupCalloutEntity(record)
    case 'stamp':
    case 'symbol':
      return new AcApMarkupStampEntity(record)
  }
}

/**
 * @deprecated Prefer {@link createMarkupEntityFromRecord} for symmetry with
 *   measure deserialize.
 */
export const createMarkupEntity = createMarkupEntityFromRecord
