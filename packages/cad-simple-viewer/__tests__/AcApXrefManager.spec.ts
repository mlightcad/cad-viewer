import type { AcDbDatabase } from '@mlightcad/data-model'
import type { AcApPreparedOverlay } from '../src/app/AcApDocManager'

const mockManager = {
  activeSessionId: 'doc-1',
  curView: {},
  prepareOverlayDatabase: jest.fn(),
  prepareOverlay: jest.fn(),
  getOverlayLayout: jest.fn(() => ({})),
  removeOverlay: jest.fn(),
  setOverlayVisible: jest.fn(() => true)
}

jest.mock('../src/app/AcApDocManager', () => ({
  AcApDocManager: {
    get instance() {
      return mockManager
    }
  }
}))

import { AcApXrefManager } from '../src/app/AcApXrefManager'

const input = () => ({
  blockName: 'survey',
  fileName: 'survey.dxf',
  sourcePath: 'survey.dxf',
  sourceDb: {} as AcDbDatabase
})

function prepared(id: string) {
  return { commit: jest.fn(() => id), dispose: jest.fn() }
}

describe('xref attachment ownership', () => {
  beforeEach(() => {
    ;(AcApXrefManager as unknown as { _instance: unknown })._instance =
      undefined
    mockManager.activeSessionId = 'doc-1'
    mockManager.prepareOverlayDatabase
      .mockReset()
      .mockResolvedValue(prepared('overlay-1'))
    mockManager.prepareOverlay.mockReset()
    mockManager.removeOverlay.mockClear()
    mockManager.setOverlayVisible.mockClear()
    mockManager.getOverlayLayout.mockReset().mockReturnValue({})
  })

  it('forwards transform and replacement to native publication and keeps old session on failure', async () => {
    const manager = AcApXrefManager.instance
    const old = await manager.attachOverlay(input())
    mockManager.prepareOverlayDatabase.mockRejectedValueOnce(
      new Error('failed')
    )
    const transform = {
      position: { x: 10, y: 20, z: 0 },
      scale: 2,
      rotationRad: 1
    }
    await expect(
      manager.attachOverlay({ ...input(), transform })
    ).rejects.toThrow('failed')
    expect(manager.getSession(old.id)).toBe(old)
    expect(mockManager.removeOverlay).not.toHaveBeenCalled()
    expect(mockManager.prepareOverlayDatabase).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ replaceOverlayId: 'overlay-1', transform })
    )
  })

  it('keeps identical source block names independent in separate host documents', async () => {
    const manager = AcApXrefManager.instance
    const a = await manager.attachOverlay(input())
    mockManager.activeSessionId = 'doc-2'
    mockManager.prepareOverlayDatabase.mockResolvedValueOnce(
      prepared('overlay-2')
    )
    const b = await manager.attachOverlay(input())
    expect(a.id).not.toBe(b.id)
    expect(a.documentId).toBe('doc-1')
    expect(b.documentId).toBe('doc-2')
    expect(manager.getSessionByBlockName('survey')).toBe(b)
    expect(mockManager.prepareOverlayDatabase).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ replaceOverlayId: undefined })
    )
    mockManager.activeSessionId = 'doc-1'
    expect(manager.getSessionByBlockName('survey')).toBe(a)
  })

  it('clears one document and its pending replacement while preserving another', async () => {
    const manager = AcApXrefManager.instance
    const first = await manager.attachOverlay(input())
    mockManager.activeSessionId = 'doc-2'
    mockManager.prepareOverlayDatabase.mockResolvedValueOnce(
      prepared('overlay-2')
    )
    const second = await manager.attachOverlay(input())
    mockManager.activeSessionId = 'doc-1'
    mockManager.prepareOverlayDatabase.mockImplementationOnce(
      (_db, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('cancelled', 'AbortError'))
          )
        })
    )
    const pending = manager.attachOverlay(input())
    manager.clearDocument('doc-1')
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(manager.getSession(first.id)).toBeUndefined()
    expect(manager.getSession(second.id)).toBe(second)
    expect(manager.sessions).toEqual([second])
    expect(mockManager.removeOverlay).toHaveBeenCalledWith('overlay-1')
    expect(mockManager.removeOverlay).not.toHaveBeenCalledWith('overlay-2')
  })

  it('forgets directly removed native geometry without recursively removing it', async () => {
    const manager = AcApXrefManager.instance
    const session = await manager.attachOverlay(input())
    manager.forgetOverlay(session.overlayId)
    expect(manager.sessions).toHaveLength(0)
    expect(mockManager.removeOverlay).not.toHaveBeenCalled()
  })

  it('cancels pending attachment on clear without inventing a loaded session', async () => {
    const manager = AcApXrefManager.instance
    mockManager.prepareOverlayDatabase.mockImplementationOnce(
      (_db, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('cancelled', 'AbortError'))
          )
        })
    )
    const pending = manager.attachOverlay(input())
    manager.clearAll()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(manager.sessions).toHaveLength(0)
  })

  it('does not supersede valid pending work with an already-cancelled request', async () => {
    let complete!: (handle: AcApPreparedOverlay) => void
    let activeSignal!: AbortSignal
    mockManager.prepareOverlayDatabase.mockImplementationOnce(
      (_db, options) => {
        activeSignal = options.signal
        return new Promise<AcApPreparedOverlay>(resolve => {
          complete = resolve
        })
      }
    )
    const manager = AcApXrefManager.instance
    const active = manager.attachOverlay(input())
    const cancelled = new AbortController()
    cancelled.abort()
    await expect(
      manager.attachOverlay({ ...input(), signal: cancelled.signal })
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(activeSignal.aborted).toBe(false)
    complete(prepared('active'))
    await expect(active).resolves.toMatchObject({ overlayId: 'active' })
  })

  it('disposes preparation delivered after clear without publishing it', async () => {
    let complete!: (handle: AcApPreparedOverlay) => void
    mockManager.prepareOverlayDatabase.mockImplementationOnce(
      () =>
        new Promise<AcApPreparedOverlay>(resolve => {
          complete = resolve
        })
    )
    const manager = AcApXrefManager.instance
    const pending = manager.attachOverlay(input())
    manager.clearAll()
    const ready = prepared('late-overlay')
    complete(ready)
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(ready.commit).not.toHaveBeenCalled()
    expect(ready.dispose).toHaveBeenCalledTimes(1)
    expect(manager.sessions).toHaveLength(0)
  })

  it('keeps an existing reference while overlapping replacement preparation is superseded', async () => {
    const manager = AcApXrefManager.instance
    const old = await manager.attachOverlay(input())
    let finishFirst!: (handle: AcApPreparedOverlay) => void
    let finishSecond!: (handle: AcApPreparedOverlay) => void
    mockManager.prepareOverlayDatabase
      .mockImplementationOnce(
        () =>
          new Promise<AcApPreparedOverlay>(resolve => {
            finishFirst = resolve
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<AcApPreparedOverlay>(resolve => {
            finishSecond = resolve
          })
      )
    const first = manager.attachOverlay(input())
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    const a = prepared('first-replacement')
    // A resolved preparation still has no scene side effects. A newer request
    // can supersede it before its continuation commits and adopts metadata.
    finishFirst(a)
    const second = manager.attachOverlay(input())
    await rejected
    expect(a.commit).not.toHaveBeenCalled()
    expect(a.dispose).toHaveBeenCalledTimes(1)
    expect(manager.getSession(old.id)).toBe(old)
    expect(mockManager.removeOverlay).not.toHaveBeenCalled()
    expect(mockManager.prepareOverlayDatabase).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ replaceOverlayId: 'overlay-1' })
    )
    const b = prepared('second-replacement')
    finishSecond(b)
    const current = await second
    expect(b.commit).toHaveBeenCalledTimes(1)
    expect(manager.sessions).toEqual([current])
    expect(current.overlayId).toBe('second-replacement')
    expect(current.id).toBe(old.id)

    // Once commit succeeds, the next preparation receives the new native id.
    mockManager.prepareOverlayDatabase.mockResolvedValueOnce(
      prepared('third-replacement')
    )
    await manager.attachOverlay(input())
    expect(mockManager.prepareOverlayDatabase).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ replaceOverlayId: 'second-replacement' })
    )
  })
})
