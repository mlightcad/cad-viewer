/**
 * @jest-environment jsdom
 */

import type { AcApDataSourceManager } from '../src/app/dataSource/AcApDataSourceManager'
import { AcApDataSourceManager as DataSourceManager } from '../src/app/dataSource/AcApDataSourceManager'
import {
  acuiCreateFileOpenSession,
  type AcUiFileOpenDocManager
} from '../src/ui/AcUiFileOpenSession'

function makeDocManager(): AcUiFileOpenDocManager & {
  opens: string[]
  dataSourceManager: AcApDataSourceManager
} {
  const dataSourceManager = new DataSourceManager()
  const opens: string[] = []
  return {
    dataSourceManager,
    opens,
    openDocument: async (name: string) => {
      opens.push(`file:${name}`)
      return true
    },
    openUrl: async (url: string) => {
      opens.push(`url:${url}`)
      return true
    },
    newDocument: async () => {
      opens.push('new')
      return true
    }
  }
}

describe('AcUiFileOpenSession', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('creates DocManager once, attaches sources, and opens requests', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const dm = makeDocManager()
    let createCount = 0

    const session = acuiCreateFileOpenSession({
      host,
      showNewDrawing: true,
      createDocManager: async () => {
        createCount += 1
        return dm
      }
    })

    const cloud = {
      id: 'cloud',
      labelKey: 'main.dataSource.onedrive',
      requiresAuth: false,
      requiresUserGesture: false,
      getAuthState: () => 'none' as const,
      signIn: async () => undefined,
      signOut: async () => undefined,
      pick: async () => null
    }
    session.registerSource(cloud)

    const file = new File([new Uint8Array([1])], 'a.dwg')
    const result = await session.open({ kind: 'file', file })
    expect(result).toEqual({ ok: true })
    expect(createCount).toBe(1)
    expect(dm.opens).toEqual(['file:a.dwg'])
    expect(dm.dataSourceManager.get('cloud')).toBe(cloud)

    await session.open({ kind: 'url', url: 'https://example.com/b.dxf' })
    await session.open({ kind: 'new' })
    expect(createCount).toBe(1)
    expect(dm.opens).toEqual([
      'file:a.dwg',
      'url:https://example.com/b.dxf',
      'new'
    ])

    session.dispose()
  })

  it('invokes onBeforeOpen / onAfterOpen hooks', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const dm = makeDocManager()
    const hooks: string[] = []

    const session = acuiCreateFileOpenSession({
      host,
      createDocManager: async () => dm,
      onBeforeOpen: async req => {
        hooks.push(`before:${req.kind}`)
      },
      onAfterOpen: async (req, result) => {
        hooks.push(`after:${req.kind}:${result.ok}`)
      }
    })

    await session.open({ kind: 'new' })
    expect(hooks).toEqual(['before:new', 'after:new:true'])
    session.dispose()
  })

  it('panel New Drawing button routes through the session', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const dm = makeDocManager()

    const session = acuiCreateFileOpenSession({
      host,
      showNewDrawing: true,
      createDocManager: async () => dm
    })

    const newBtn = host.querySelector(
      '.ml-ui-file-open-primary'
    ) as HTMLButtonElement
    newBtn.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(dm.opens).toEqual(['new'])
    session.dispose()
  })

  it('syncs sources registered after DocManager exists', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const dm = makeDocManager()

    const session = acuiCreateFileOpenSession({
      host,
      createDocManager: async () => dm
    })

    await session.ensureDocManager()

    const cloud = {
      id: 'late-cloud',
      labelKey: 'main.dataSource.onedrive',
      requiresAuth: false,
      requiresUserGesture: false,
      getAuthState: () => 'none' as const,
      signIn: async () => undefined,
      signOut: async () => undefined,
      pick: async () => null
    }
    session.registerSource(cloud)
    expect(dm.dataSourceManager.get('late-cloud')).toBe(cloud)

    session.unregisterSource('late-cloud')
    expect(dm.dataSourceManager.get('late-cloud')).toBeUndefined()
    session.dispose()
  })

  it('ignores createDocManager results after dispose', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const dm = makeDocManager()
    let release!: (value: AcUiFileOpenDocManager) => void
    const gate = new Promise<AcUiFileOpenDocManager>(resolve => {
      release = resolve
    })

    const session = acuiCreateFileOpenSession({
      host,
      createDocManager: () => gate
    })

    const ensure = session.ensureDocManager()
    session.dispose()
    release(dm)

    await expect(ensure).rejects.toThrow(/disposed/)
    expect(session.docManagerInstance).toBeNull()
    expect(dm.dataSourceManager.list()).toEqual([])
  })

  it('serializes overlapping open calls', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const order: string[] = []
    let releaseFirst!: () => void
    const firstGate = new Promise<void>(resolve => {
      releaseFirst = resolve
    })

    const dm: AcUiFileOpenDocManager = {
      dataSourceManager: new DataSourceManager(),
      openDocument: async () => true,
      openUrl: async url => {
        order.push(`start:${url}`)
        if (url === 'first') await firstGate
        order.push(`end:${url}`)
        return true
      },
      newDocument: async () => true
    }

    const session = acuiCreateFileOpenSession({
      host,
      createDocManager: async () => dm
    })

    const first = session.open({ kind: 'url', url: 'first' })
    const second = session.open({ kind: 'url', url: 'second' })
    // Drain the open chain + ensureDocManager microtasks until the first open starts.
    for (let i = 0; i < 10 && order.length === 0; i++) {
      await Promise.resolve()
    }
    expect(order).toEqual(['start:first'])
    releaseFirst()
    await Promise.all([first, second])
    expect(order).toEqual([
      'start:first',
      'end:first',
      'start:second',
      'end:second'
    ])
    session.dispose()
  })
})
