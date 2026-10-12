/**
 * Entity waiting in {@link AcTrView2d}'s convert queue.
 *
 * Only `ownerId` matters for scheduling: paper-space sheets must be converted
 * before the model-space block references queued ahead of them.
 */
export interface AcTrConvertQueueEntity {
  ownerId?: string
}

/**
 * Remainder of a convert batch plus the active layout that ordered it.
 */
export interface AcTrConvertPendingState<T extends AcTrConvertQueueEntity> {
  pending: T[]
  /** Index of the next entity in {@link pending} to convert. */
  cursor: number
  activeOwnerId: string
}

/**
 * Stable-partitions `entities` so those owned by `activeOwnerId` come first.
 *
 * Returns the same array when it is already in that order (or when there is
 * nothing to split) so a large model-space queue is not copied on every slice.
 *
 * @param entities - Queue contents in arrival order.
 * @param activeOwnerId - Block table record id of the layout on screen.
 * @returns `entities`, or a new array with the active layout's entities first.
 */
export function orderActiveLayoutFirst<T extends AcTrConvertQueueEntity>(
  entities: T[],
  activeOwnerId: string
): T[] {
  if (!activeOwnerId || entities.length < 2) return entities

  let firstActive = -1
  let firstOther = -1
  for (let i = 0; i < entities.length; i++) {
    if (entities[i].ownerId === activeOwnerId) {
      if (firstActive < 0) firstActive = i
    } else if (firstOther < 0) {
      firstOther = i
    }
    if (firstActive >= 0 && firstOther >= 0) break
  }
  if (firstActive < 0 || firstOther < 0 || firstActive < firstOther) {
    return entities
  }

  const first: T[] = []
  const rest: T[] = []
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    if (entity.ownerId === activeOwnerId) first.push(entity)
    else rest.push(entity)
  }
  return first.concat(rest)
}

/**
 * Seeds a drain from the entities queued so far.
 *
 * @param entities - Everything currently in the convert queue.
 * @param activeOwnerId - Layout that should convert first.
 */
export function createConvertPending<T extends AcTrConvertQueueEntity>(
  entities: T[],
  activeOwnerId: string
): AcTrConvertPendingState<T> {
  return {
    pending: orderActiveLayoutFirst(entities, activeOwnerId),
    cursor: 0,
    activeOwnerId
  }
}

/**
 * Folds entities queued during a slice, and a layout activated meanwhile,
 * into the not-yet-converted remainder.
 *
 * Active-layout entities jump ahead of the remainder. Other arrivals stay
 * behind it, without copying the remainder, so a long model-space tail is
 * not recopied on every flush chunk.
 *
 * @param state - Remainder of the current drain.
 * @param queued - Entities appended since the previous slice.
 * @param activeOwnerId - Layout that is active now.
 */
export function absorbConvertQueue<T extends AcTrConvertQueueEntity>(
  state: AcTrConvertPendingState<T>,
  queued: T[],
  activeOwnerId: string
): AcTrConvertPendingState<T> {
  if (queued.length === 0 && activeOwnerId === state.activeOwnerId) {
    return state
  }

  const rest =
    state.cursor === 0 ? state.pending : state.pending.slice(state.cursor)

  if (activeOwnerId !== state.activeOwnerId) {
    return {
      pending: orderActiveLayoutFirst(
        queued.length > 0 ? queued.concat(rest) : rest,
        activeOwnerId
      ),
      cursor: 0,
      activeOwnerId
    }
  }

  let hasActive = false
  const front: T[] = []
  const back: T[] = []
  for (let i = 0; i < queued.length; i++) {
    if (activeOwnerId && queued[i].ownerId === activeOwnerId) {
      hasActive = true
      front.push(queued[i])
    } else {
      back.push(queued[i])
    }
  }
  if (hasActive) {
    return {
      pending: front.concat(rest, back),
      cursor: 0,
      activeOwnerId
    }
  }

  for (let i = 0; i < back.length; i++) state.pending.push(back[i])
  return state
}

/**
 * Whether the not-yet-converted remainder still holds entities owned by the
 * active layout. Used to grow slices more aggressively once only model-space
 * (or other layouts) remain.
 */
export function hasPendingActiveOwner<T extends AcTrConvertQueueEntity>(
  state: AcTrConvertPendingState<T>
): boolean {
  const { pending, cursor, activeOwnerId } = state
  if (!activeOwnerId) return false
  for (let i = cursor; i < pending.length; i++) {
    if (pending[i].ownerId === activeOwnerId) return true
  }
  return false
}

/**
 * Grows or shrinks the next convert slice from the previous slice's wall time.
 *
 * When a paper layout still has pending entities, grow by 2× so the sheet can
 * interleave soon. Once only other owners remain — or the active layout is
 * already model space, where fine interleaving does not help first paint —
 * grow by 4× so a long model-space tail does not pay per-slice overhead.
 *
 * @param slice - Entities converted in the previous slice (≥ 1).
 * @param tookMs - Wall time of that slice.
 * @param budgetMs - Target wall time per slice.
 * @param maxSlice - Upper bound on entities per slice.
 * @param activeLayoutPending - True to prefer responsive 2× growth (paper
 *   sheet still converting); false for 4× throughput.
 */
export function adaptConvertSliceSize(options: {
  slice: number
  tookMs: number
  budgetMs: number
  maxSlice: number
  activeLayoutPending: boolean
}): number {
  const { tookMs, budgetMs, maxSlice, activeLayoutPending } = options
  const slice = Math.max(1, options.slice)
  const growBy = activeLayoutPending ? 2 : 4
  if (tookMs < budgetMs / 2) {
    return Math.min(slice * growBy, maxSlice)
  }
  if (tookMs > budgetMs * 2) {
    return Math.max(1, slice >> 1)
  }
  return slice
}
