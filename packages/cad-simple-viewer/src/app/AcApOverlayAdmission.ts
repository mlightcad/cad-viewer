/**
 * Aggregate policy for native references, including detached replacements and
 * references in parked documents. These are admission/retention counters, not
 * browser heap or GPU measurements. Decoder and single-entity conversion peaks,
 * fonts, textures, material caches and the primary drawing are not covered.
 */
export interface AcApOverlayLimits {
  references: number
  preparations: number
  /** Sum of original encoded input sizes; retained as a conservative charge. */
  inputBytes: number
  /** Native database entity counts, including block definitions. */
  entities: number
  /** Native data-model estimator output, not an exact heap measurement. */
  databaseBytes: number
  /** Native layout geometry, mapping and spatial-index statistics. */
  layoutBytes: number
}

export type AcApOverlayUsage = Readonly<AcApOverlayLimits>
const dimensions = [
  'references',
  'preparations',
  'inputBytes',
  'entities',
  'databaseBytes',
  'layoutBytes'
] as const

function empty(): AcApOverlayLimits {
  return {
    references: 0,
    preparations: 0,
    inputBytes: 0,
    entities: 0,
    databaseBytes: 0,
    layoutBytes: 0
  }
}

export class AcApOverlayCapacityError extends Error {
  constructor(
    readonly dimension: keyof AcApOverlayLimits,
    readonly requested: number,
    readonly limit: number
  ) {
    super(
      `Reference ${dimension} admission limit exceeded (${requested} > ${limit})`
    )
    this.name = 'AcApOverlayCapacityError'
  }
}

/** A charge moves from preparation to retained ownership without re-admission. */
export interface AcApOverlayReservation {
  database(entities: number, estimatedBytes: number): void
  layout(estimatedBytes: number): void
  ready(): void
  release(): void
}

/** Native document-manager owner. No queue, eviction or source cache. */
export class AcApOverlayAdmission {
  readonly limits: AcApOverlayUsage
  private used = empty()

  constructor(limits: AcApOverlayLimits) {
    const snapshot = { ...limits }
    for (const key of dimensions) this.validate(snapshot[key])
    this.limits = Object.freeze(snapshot)
  }

  get usage(): AcApOverlayUsage {
    return Object.freeze({ ...this.used })
  }

  reserve(inputBytes: number): AcApOverlayReservation {
    let charge = empty()
    let state: 'preparing' | 'ready' | 'released' = 'preparing'
    const update = (next: AcApOverlayLimits) => {
      const total = empty()
      for (const key of dimensions) {
        this.validate(next[key])
        total[key] = this.used[key] - charge[key] + next[key]
        if (
          !Number.isSafeInteger(total[key]) ||
          total[key] > this.limits[key]
        ) {
          throw new AcApOverlayCapacityError(key, total[key], this.limits[key])
        }
      }
      // Refusal changes neither the owner nor the reservation.
      this.used = total
      charge = next
    }
    const preparing = () => {
      if (state !== 'preparing')
        throw new Error('Reference preparation has ended')
    }
    update({ ...charge, references: 1, preparations: 1, inputBytes })
    return {
      database: (entities, databaseBytes) => {
        preparing()
        update({ ...charge, entities, databaseBytes })
      },
      layout: layoutBytes => {
        preparing()
        update({ ...charge, layoutBytes })
      },
      ready: () => {
        preparing()
        update({ ...charge, preparations: 0 })
        state = 'ready'
      },
      release: () => {
        if (state === 'released') return
        update(empty())
        state = 'released'
      }
    }
  }

  private validate(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(
        'Reference admission values must be nonnegative safe integers'
      )
    }
  }
}
