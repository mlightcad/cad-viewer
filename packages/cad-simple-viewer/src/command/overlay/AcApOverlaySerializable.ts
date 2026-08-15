/**
 * Persistable overlay entity contract shared by markup and measure.
 *
 * Serialization is an instance method ({@link toRecord}). Deserialization is
 * deliberately **not** on this interface — concrete types are chosen by domain
 * factories (`createMarkupEntityFromRecord` / `createMeasureEntityFromRecord`)
 * from discriminated record geometry.
 *
 * Record schemas stay domain-specific (`AcApMarkupRecord`,
 * `AcApMeasurementRecord`); this interface only unifies the capability.
 */
export interface AcApOverlaySerializable<TRecord> {
  /**
   * Build a sidecar / store snapshot of this overlay.
   *
   * @returns Domain record ready for persistence or store upsert.
   */
  toRecord(): TRecord
}
