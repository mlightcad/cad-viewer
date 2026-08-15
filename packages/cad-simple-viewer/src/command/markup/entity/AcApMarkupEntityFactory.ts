import type { AcApMarkupRecord } from '../AcApMarkupTypes'
import { AcApMarkupCalloutEntity } from './AcApMarkupCalloutEntity'
import type { AcApMarkupEntity } from './AcApMarkupEntity'
import { AcApMarkupHighlightEntity } from './AcApMarkupHighlightEntity'
import { AcApMarkupSegmentEntity } from './AcApMarkupSegmentEntity'
import { AcApMarkupShapeEntity } from './AcApMarkupShapeEntity'
import { AcApMarkupStampEntity } from './AcApMarkupStampEntity'
import { AcApMarkupTextEntity } from './AcApMarkupTextEntity'

/**
 * Create the concrete markup entity for a store record.
 *
 * Dispatches on {@link AcApMarkupRecord.geometry} `.type` to the matching
 * entity class (text, line/arrow, cloud/rect/circle, highlight, callout,
 * stamp/symbol).
 *
 * @param record - Markup store record to wrap.
 * @returns Entity instance that implements overlay draw / grip protocols.
 */
export function createMarkupEntity(
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
