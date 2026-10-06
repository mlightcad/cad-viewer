import {
  AcApDataSource,
  AcApDataSourceAuthState,
  AcApDataSourceFile
} from '../src/app/dataSource/AcApDataSource'
import { AcApDataSourceManager } from '../src/app/dataSource/AcApDataSourceManager'
import {
  acapBuildDataSourceMenu,
  acapIsSingleLocalOpen
} from '../src/app/dataSource/acapBuildDataSourceMenu'

function makeSource(
  partial: Partial<AcApDataSource> & Pick<AcApDataSource, 'id' | 'labelKey'>
): AcApDataSource {
  return {
    requiresAuth: false,
    requiresUserGesture: false,
    getAuthState: () => 'none' as AcApDataSourceAuthState,
    signIn: async () => undefined,
    signOut: async () => undefined,
    pick: async () => null as AcApDataSourceFile | null,
    ...partial
  }
}

describe('AcApDataSourceManager', () => {
  it('registers, lists, and unregisters sources', () => {
    const manager = new AcApDataSourceManager()
    const local = makeSource({ id: 'local', labelKey: 'main.dataSource.local' })
    const url = makeSource({ id: 'url', labelKey: 'main.dataSource.url' })

    const changed: string[][] = []
    manager.on('changed', e => {
      changed.push(e.sources.map(s => s.id))
    })

    manager.register(local)
    manager.register(url)
    expect(manager.list().map(s => s.id)).toEqual(['local', 'url'])
    expect(manager.get('url')).toBe(url)

    manager.unregister('local')
    expect(manager.list().map(s => s.id)).toEqual(['url'])
    expect(changed.length).toBeGreaterThanOrEqual(2)
  })

  it('notifies auth-changed listeners', () => {
    const manager = new AcApDataSourceManager()
    const ids: string[] = []
    manager.on('auth-changed', e => ids.push(e.sourceId))
    manager.notifyAuthChanged('onedrive')
    expect(ids).toEqual(['onedrive'])
  })
})

describe('acapBuildDataSourceMenu', () => {
  it('builds pick items for sources without auth', () => {
    const items = acapBuildDataSourceMenu([
      makeSource({ id: 'local', labelKey: 'main.dataSource.local' }),
      makeSource({ id: 'url', labelKey: 'main.dataSource.url' })
    ])
    expect(items).toHaveLength(2)
    expect(items.map(i => i.action)).toEqual(['pick', 'pick'])
    expect(items.map(i => i.sourceId)).toEqual(['local', 'url'])
  })

  it('builds sign-in only when signed out', () => {
    const items = acapBuildDataSourceMenu([
      makeSource({
        id: 'onedrive',
        labelKey: 'main.dataSource.onedrive',
        requiresAuth: true,
        requiresUserGesture: true,
        getAuthState: () => 'signed-out'
      })
    ])
    expect(items).toHaveLength(1)
    expect(items[0].action).toBe('sign-in')
    expect(items[0].id).toBe('onedrive:sign-in')
  })

  it('builds pick and sign-out when signed in', () => {
    const items = acapBuildDataSourceMenu([
      makeSource({
        id: 'onedrive',
        labelKey: 'main.dataSource.onedrive',
        requiresAuth: true,
        requiresUserGesture: true,
        getAuthState: () => 'signed-in',
        getAccountLabel: () => 'user@example.com'
      })
    ])
    expect(items.map(i => i.action)).toEqual(['pick', 'sign-out'])
    expect(items[1].labelKey).toBe('main.dataSource.signOutOfAccount')
    expect(items[1].labelParams).toEqual({
      name: 'main.dataSource.onedrive',
      account: 'user@example.com'
    })
  })
})

describe('acapIsSingleLocalOpen', () => {
  it('is true only for a lone local source', () => {
    expect(
      acapIsSingleLocalOpen([
        makeSource({ id: 'local', labelKey: 'main.dataSource.local' })
      ])
    ).toBe(true)
    expect(
      acapIsSingleLocalOpen([
        makeSource({ id: 'local', labelKey: 'main.dataSource.local' }),
        makeSource({ id: 'url', labelKey: 'main.dataSource.url' })
      ])
    ).toBe(false)
  })
})
