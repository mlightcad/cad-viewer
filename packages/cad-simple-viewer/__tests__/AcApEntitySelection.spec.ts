jest.mock('../src/app', () => ({
  AcApAnnotation: jest.fn().mockImplementation(() => ({
    filterAnnotationEntities: (ids: string[]) =>
      ids.filter(id => id !== 'annotation')
  })),
  AcApDocManager: {
    instance: {
      editor: {
        getSelection: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => ({
  AcEdOpenMode: { Review: 'Review', Write: 'Write' },
  AcEdPromptSelectionOptions: class {
    constructor(readonly message: string) {}
  },
  AcEdPromptStatus: { OK: 'OK', Cancel: 'Cancel' }
}))

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    sysCmdPrompt: (key: string) => key
  }
}))

import { AcApDocManager } from '../src/app'
import { AcEdOpenMode, AcEdPromptStatus } from '../src/editor'
import {
  resolveSelectedEntities,
  resolveSelectedIds
} from '../src/service/AcApEntitySelection'

interface TestContextOptions {
  selectionIds?: string[]
  openMode?: typeof AcEdOpenMode.Review | typeof AcEdOpenMode.Write
  entities?: Map<string, { objectId: string }>
}

const createContext = ({
  selectionIds = [],
  openMode = AcEdOpenMode.Write,
  entities = new Map()
}: TestContextOptions = {}) => {
  const clear = jest.fn()

  return {
    clear,
    context: {
      doc: {
        openMode,
        database: {
          tables: {
            blockTable: {
              getEntityById: jest.fn((objectId: string) =>
                entities.get(objectId)
              )
            }
          }
        }
      },
      view: {
        selectionSet: {
          count: selectionIds.length,
          ids: selectionIds,
          clear
        }
      }
    }
  }
}

describe('AcApEntitySelection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('resolveSelectedEntities', () => {
    test('returns entities from preselection without prompting', async () => {
      const line = { objectId: 'line' }
      const { clear, context } = createContext({
        selectionIds: ['line'],
        entities: new Map([['line', line]])
      })

      const result = await resolveSelectedEntities(context as never)

      expect(result).toEqual({ entities: [line], ids: ['line'] })
      expect(AcApDocManager.instance.editor.getSelection).not.toHaveBeenCalled()
      expect(clear).not.toHaveBeenCalled()
    })

    test('prompts for selection when nothing is preselected', async () => {
      const line = { objectId: 'line' }
      const { context } = createContext({
        entities: new Map([['line', line]])
      })
      const getSelection = jest.mocked(
        AcApDocManager.instance.editor.getSelection
      )
      getSelection.mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        value: { count: 1, ids: ['line'] } as never
      })

      const result = await resolveSelectedEntities(context as never, {
        promptKey: 'move'
      })

      expect(getSelection).toHaveBeenCalledTimes(1)
      expect(getSelection.mock.calls[0][0].message).toBe('move')
      expect(result).toEqual({ entities: [line], ids: ['line'] })
    })

    test('returns undefined when the selection prompt is cancelled', async () => {
      const { clear, context } = createContext()
      const getSelection = jest.mocked(
        AcApDocManager.instance.editor.getSelection
      )
      getSelection.mockResolvedValueOnce({
        status: AcEdPromptStatus.Cancel,
        value: undefined
      } as never)

      const result = await resolveSelectedEntities(context as never, {
        promptKey: 'move'
      })

      expect(result).toBeUndefined()
      expect(clear).not.toHaveBeenCalled()
    })

    test('filters annotation entities in review mode', async () => {
      const line = { objectId: 'line' }
      const { clear, context } = createContext({
        selectionIds: ['line', 'annotation'],
        openMode: AcEdOpenMode.Review,
        entities: new Map([['line', line]])
      })

      const result = await resolveSelectedEntities(context as never)

      expect(result).toEqual({ entities: [line], ids: ['line'] })
      expect(clear).not.toHaveBeenCalled()
    })

    test('clears selection when review filtering removes all ids by default', async () => {
      const { clear, context } = createContext({
        selectionIds: ['annotation'],
        openMode: AcEdOpenMode.Review
      })

      const result = await resolveSelectedEntities(context as never)

      expect(result).toBeUndefined()
      expect(clear).toHaveBeenCalledTimes(1)
    })

    test('does not clear selection when clearOnEmpty is false', async () => {
      const { clear, context } = createContext({
        selectionIds: ['annotation'],
        openMode: AcEdOpenMode.Review
      })

      const result = await resolveSelectedEntities(context as never, {
        clearOnEmpty: false
      })

      expect(result).toBeUndefined()
      expect(clear).not.toHaveBeenCalled()
    })

    test('clears selection when ids do not resolve to entities by default', async () => {
      const { clear, context } = createContext({
        selectionIds: ['missing']
      })

      const result = await resolveSelectedEntities(context as never)

      expect(result).toBeUndefined()
      expect(clear).toHaveBeenCalledTimes(1)
    })
  })

  describe('resolveSelectedIds', () => {
    test('returns ids from preselection without prompting', async () => {
      const { context } = createContext({
        selectionIds: ['line', 'arc']
      })

      const ids = await resolveSelectedIds(context as never, 'erase')

      expect(ids).toEqual(['line', 'arc'])
      expect(AcApDocManager.instance.editor.getSelection).not.toHaveBeenCalled()
    })

    test('prompts for selection when nothing is preselected', async () => {
      const { context } = createContext()
      const getSelection = jest.mocked(
        AcApDocManager.instance.editor.getSelection
      )
      getSelection.mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        value: { count: 1, ids: ['line'] } as never
      })

      const ids = await resolveSelectedIds(context as never, 'erase')

      expect(getSelection).toHaveBeenCalledTimes(1)
      expect(getSelection.mock.calls[0][0].message).toBe('erase')
      expect(ids).toEqual(['line'])
    })

    test('returns undefined when the selection prompt is cancelled', async () => {
      const { context } = createContext()
      const getSelection = jest.mocked(
        AcApDocManager.instance.editor.getSelection
      )
      getSelection.mockResolvedValueOnce({
        status: AcEdPromptStatus.Cancel,
        value: undefined
      } as never)

      const ids = await resolveSelectedIds(context as never, 'erase')

      expect(ids).toBeUndefined()
    })

    test('filters annotation entities in review mode', async () => {
      const { context } = createContext({
        selectionIds: ['line', 'annotation'],
        openMode: AcEdOpenMode.Review
      })

      const ids = await resolveSelectedIds(context as never, 'erase')

      expect(ids).toEqual(['line'])
    })

    test('returns undefined when review filtering removes all ids', async () => {
      const { context } = createContext({
        selectionIds: ['annotation'],
        openMode: AcEdOpenMode.Review
      })

      const ids = await resolveSelectedIds(context as never, 'erase')

      expect(ids).toBeUndefined()
    })
  })
})
