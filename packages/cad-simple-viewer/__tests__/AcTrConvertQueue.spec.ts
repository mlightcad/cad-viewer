import {
  absorbConvertQueue,
  adaptConvertSliceSize,
  createConvertPending,
  hasPendingActiveOwner,
  orderActiveLayoutFirst
} from '../src/view/AcTrConvertQueue'

function ids(entities: Array<{ ownerId?: string; id: string }>) {
  return entities.map(entity => entity.id)
}

describe('orderActiveLayoutFirst', () => {
  const paper = 'paper'
  const model = 'model'

  test('puts the active layout ahead of entities queued before it', () => {
    const modelRefs = Array.from({ length: 80 }, (_, index) => ({
      id: `m${index}`,
      ownerId: model
    }))
    const sheet = [
      { id: 'frame', ownerId: paper },
      { id: 'title', ownerId: paper },
      { id: 'vp1', ownerId: paper },
      { id: 'vp2', ownerId: paper }
    ]
    const ordered = orderActiveLayoutFirst([...modelRefs, ...sheet], paper)
    expect(ids(ordered).slice(0, 4)).toEqual(['frame', 'title', 'vp1', 'vp2'])
    expect(ids(ordered).slice(4)).toEqual(ids(modelRefs))
  })

  test('keeps file order when nothing belongs to the active layout', () => {
    const queued = [
      { id: 'm0', ownerId: model },
      { id: 'm1', ownerId: model }
    ]
    expect(orderActiveLayoutFirst(queued, paper)).toBe(queued)
  })
})

describe('absorbConvertQueue', () => {
  const paper = 'paper'
  const model = 'model'

  test('a layout activated mid-batch jumps ahead of the unconverted tail', () => {
    const state = createConvertPending(
      [
        { id: 'm0', ownerId: model },
        { id: 'm1', ownerId: model },
        { id: 'm2', ownerId: model },
        { id: 'frame', ownerId: paper },
        { id: 'vp', ownerId: paper }
      ],
      model
    )
    // Two model references already converted before the sheet was activated.
    state.cursor = 2
    const next = absorbConvertQueue(state, [], paper)
    expect(ids(next.pending.slice(next.cursor))).toEqual([
      'frame',
      'vp',
      'm2'
    ])
  })

  test('entities queued for the active layout convert before the old tail', () => {
    const state = createConvertPending(
      [
        { id: 'm0', ownerId: model },
        { id: 'm1', ownerId: model }
      ],
      paper
    )
    const next = absorbConvertQueue(
      state,
      [
        { id: 'frame', ownerId: paper },
        { id: 'm2', ownerId: model }
      ],
      paper
    )
    expect(ids(next.pending)).toEqual(['frame', 'm0', 'm1', 'm2'])
    expect(next.cursor).toBe(0)
  })

  test('non-active arrivals append without copying the remainder', () => {
    const state = createConvertPending(
      [
        { id: 'frame', ownerId: paper },
        { id: 'm0', ownerId: model }
      ],
      paper
    )
    state.cursor = 1
    const pending = state.pending
    const next = absorbConvertQueue(state, [{ id: 'm1', ownerId: model }], paper)
    expect(next).toBe(state)
    expect(next.pending).toBe(pending)
    expect(next.cursor).toBe(1)
    expect(ids(next.pending)).toEqual(['frame', 'm0', 'm1'])
  })
})

describe('hasPendingActiveOwner', () => {
  const paper = 'paper'
  const model = 'model'

  test('is true while the active layout still has unconverted entities', () => {
    const state = createConvertPending(
      [
        { id: 'frame', ownerId: paper },
        { id: 'm0', ownerId: model }
      ],
      paper
    )
    expect(hasPendingActiveOwner(state)).toBe(true)
    state.cursor = 1
    expect(hasPendingActiveOwner(state)).toBe(false)
  })
})

describe('adaptConvertSliceSize', () => {
  const budgetMs = 64
  const maxSlice = 512

  test('grows by 2× while the active layout is still pending', () => {
    expect(
      adaptConvertSliceSize({
        slice: 8,
        tookMs: 10,
        budgetMs,
        maxSlice,
        activeLayoutPending: true
      })
    ).toBe(16)
  })

  test('grows by 4× once only non-active entities remain', () => {
    expect(
      adaptConvertSliceSize({
        slice: 8,
        tookMs: 10,
        budgetMs,
        maxSlice,
        activeLayoutPending: false
      })
    ).toBe(32)
  })

  test('grows by 4× for model-active throughput (caller clears pending flag)', () => {
    // runConvertDrain passes activeLayoutPending=false when the active
    // layout is model space so Model-first opens are not slowed by 2× ramps.
    expect(
      adaptConvertSliceSize({
        slice: 8,
        tookMs: 10,
        budgetMs: 300,
        maxSlice,
        activeLayoutPending: false
      })
    ).toBe(32)
  })

  test('shrinks when a slice overruns the budget', () => {
    expect(
      adaptConvertSliceSize({
        slice: 16,
        tookMs: 200,
        budgetMs,
        maxSlice,
        activeLayoutPending: false
      })
    ).toBe(8)
  })

  test('caps growth at maxSlice', () => {
    expect(
      adaptConvertSliceSize({
        slice: 256,
        tookMs: 10,
        budgetMs,
        maxSlice,
        activeLayoutPending: false
      })
    ).toBe(512)
  })
})
