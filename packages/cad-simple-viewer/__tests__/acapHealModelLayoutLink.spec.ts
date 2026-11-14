import {
  acapHealModelLayoutLink,
  acapHealPaperLayoutLinks
} from '../src/app/acapHealModelLayoutLink'

function createDatabase(options: {
  modelSpaceId: string
  modelSpaceLayoutId?: string
  modelLayout?: {
    objectId: string
    blockTableRecordId: string
  } | null
  paperLayouts?: Array<{
    name: string
    objectId: string
    blockTableRecordId: string
  }>
  paperBlocks?: Array<{
    name: string
    objectId: string
    layoutId?: string
  }>
}) {
  let modelSpaceLayoutId = options.modelSpaceLayoutId ?? ''
  const modelLayout =
    options.modelLayout === null
      ? undefined
      : options.modelLayout
        ? {
            objectId: options.modelLayout.objectId,
            blockTableRecordId: options.modelLayout.blockTableRecordId
          }
        : undefined
  const paperLayouts = (options.paperLayouts ?? []).map(layout => ({
    layoutName: layout.name,
    objectId: layout.objectId,
    blockTableRecordId: layout.blockTableRecordId
  }))
  const paperBlocks = (options.paperBlocks ?? []).map(block => ({
    name: block.name,
    objectId: block.objectId,
    layoutId: block.layoutId ?? '',
    isPaperSapce: true
  }))

  return {
    tables: {
      blockTable: {
        modelSpace: {
          objectId: options.modelSpaceId,
          get layoutId() {
            return modelSpaceLayoutId
          },
          set layoutId(value: string) {
            modelSpaceLayoutId = value
          }
        },
        getAt(name: string) {
          return paperBlocks.find(
            block => block.name.toLowerCase() === name.toLowerCase()
          )
        },
        getIdAt(id: string) {
          if (id === options.modelSpaceId) {
            return { objectId: id, name: '*Model_Space', isPaperSapce: false }
          }
          return paperBlocks.find(block => block.objectId === id)
        },
        *newIterator() {
          for (const block of paperBlocks) yield block
        }
      }
    },
    objects: {
      layout: {
        getAt(name: string) {
          if (name === 'Model') return modelLayout
          return paperLayouts.find(layout => layout.layoutName === name)
        },
        *newIterator() {
          if (modelLayout) {
            yield {
              layoutName: 'Model',
              objectId: modelLayout.objectId,
              blockTableRecordId: modelLayout.blockTableRecordId
            }
          }
          for (const layout of paperLayouts) yield layout
        }
      }
    },
    get modelLayout() {
      return modelLayout
    },
    get modelSpaceLayoutId() {
      return modelSpaceLayoutId
    },
    get paperLayouts() {
      return paperLayouts
    },
    get paperBlocks() {
      return paperBlocks
    }
  }
}

describe('acapHealModelLayoutLink', () => {
  test('returns model-space id when Model layout is missing', () => {
    const db = createDatabase({
      modelSpaceId: 'ms',
      modelLayout: null
    })

    expect(acapHealModelLayoutLink(db as never)).toBe('ms')
  })

  test('returns model-space id when objects dictionary is missing', () => {
    const db = {
      tables: {
        blockTable: {
          modelSpace: { objectId: 'ms' }
        }
      }
    }

    expect(acapHealModelLayoutLink(db as never)).toBe('ms')
  })

  test('relinks Model layout and *Model_Space when BTR ids diverge', () => {
    const db = createDatabase({
      modelSpaceId: 'ms-live',
      modelSpaceLayoutId: 'stale-layout',
      modelLayout: {
        objectId: 'layout-model',
        blockTableRecordId: 'stale-btr'
      }
    })

    expect(acapHealModelLayoutLink(db as never)).toBe('ms-live')
    expect(db.modelLayout?.blockTableRecordId).toBe('ms-live')
    expect(db.modelSpaceLayoutId).toBe('layout-model')
  })

  test('is a no-op when Model layout already points at *Model_Space', () => {
    const db = createDatabase({
      modelSpaceId: 'ms',
      modelSpaceLayoutId: 'layout-model',
      modelLayout: {
        objectId: 'layout-model',
        blockTableRecordId: 'ms'
      }
    })

    expect(acapHealModelLayoutLink(db as never)).toBe('ms')
    expect(db.modelLayout?.blockTableRecordId).toBe('ms')
    expect(db.modelSpaceLayoutId).toBe('layout-model')
  })

  test('links Layout1 with empty BTR id to unbound *Paper_Space', () => {
    const db = createDatabase({
      modelSpaceId: '18',
      modelSpaceLayoutId: '6D',
      modelLayout: {
        objectId: '6D',
        blockTableRecordId: '18'
      },
      paperLayouts: [
        { name: 'Layout1', objectId: '6E', blockTableRecordId: '' }
      ],
      paperBlocks: [{ name: '*PAPER_SPACE', objectId: '15', layoutId: '' }]
    })

    acapHealPaperLayoutLinks(db as never)

    expect(db.paperLayouts[0].blockTableRecordId).toBe('15')
    expect(db.paperBlocks[0].layoutId).toBe('6E')
  })

  test('does not steal a paper BTR already claimed by another layout', () => {
    const db = createDatabase({
      modelSpaceId: 'ms',
      modelLayout: {
        objectId: 'layout-model',
        blockTableRecordId: 'ms'
      },
      paperLayouts: [
        { name: 'Layout1', objectId: 'L1', blockTableRecordId: 'P1' },
        { name: 'Layout2', objectId: 'L2', blockTableRecordId: '' }
      ],
      paperBlocks: [
        { name: '*Paper_Space', objectId: 'P1', layoutId: 'L1' },
        { name: '*Paper_Space1', objectId: 'P2', layoutId: '' }
      ]
    })

    acapHealPaperLayoutLinks(db as never)

    expect(db.paperLayouts[0].blockTableRecordId).toBe('P1')
    expect(db.paperLayouts[1].blockTableRecordId).toBe('P2')
    expect(db.paperBlocks[1].layoutId).toBe('L2')
  })

  test('relinks Layout1 when BTR id is stale and layoutId points at a non-layout', () => {
    // Entity handle collision can leave Layout1.blockTableRecordId on a LINE
    // handle while *Paper_Space.layoutId still names that same stale id.
    const db = createDatabase({
      modelSpaceId: '1F',
      modelLayout: {
        objectId: '2F',
        blockTableRecordId: '1F'
      },
      paperLayouts: [
        { name: 'Layout1', objectId: '2E', blockTableRecordId: '27' }
      ],
      paperBlocks: [{ name: '*Paper_Space', objectId: '30', layoutId: '28' }]
    })

    acapHealPaperLayoutLinks(db as never)

    expect(db.paperLayouts[0].blockTableRecordId).toBe('30')
    expect(db.paperBlocks[0].layoutId).toBe('2E')
  })

  test('relinks a paper layout that wrongly points at *Model_Space', () => {
    const db = createDatabase({
      modelSpaceId: 'ms',
      modelSpaceLayoutId: 'layout-model',
      modelLayout: {
        objectId: 'layout-model',
        blockTableRecordId: 'ms'
      },
      paperLayouts: [
        { name: 'Layout1', objectId: 'L1', blockTableRecordId: 'ms' }
      ],
      paperBlocks: [{ name: '*Paper_Space', objectId: 'P1', layoutId: '' }]
    })

    acapHealPaperLayoutLinks(db as never)

    expect(db.paperLayouts[0].blockTableRecordId).toBe('P1')
    expect(db.paperBlocks[0].layoutId).toBe('L1')
    expect(db.modelSpaceLayoutId).toBe('layout-model')
  })
})
