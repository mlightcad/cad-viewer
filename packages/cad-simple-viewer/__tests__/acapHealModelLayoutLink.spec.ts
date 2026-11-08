import { acapHealModelLayoutLink } from '../src/app/acapHealModelLayoutLink'

function createDatabase(options: {
  modelSpaceId: string
  modelSpaceLayoutId?: string
  modelLayout?: {
    objectId: string
    blockTableRecordId: string
  } | null
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
        }
      }
    },
    objects: {
      layout: {
        getAt(name: string) {
          if (name !== 'Model') return undefined
          return modelLayout
        }
      }
    },
    get modelLayout() {
      return modelLayout
    },
    get modelSpaceLayoutId() {
      return modelSpaceLayoutId
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
})
