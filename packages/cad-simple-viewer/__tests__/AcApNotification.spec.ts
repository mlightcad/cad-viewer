import {
  acapAnalyzeUnsupportedDrawing,
  acapIsTianzhengClass,
  acapIsTianzhengClassName
} from '../src/util/AcApAnalyzeUnsupportedDrawing'
import { acapResolveUnsupportedEntitiesMessage } from '../src/util/AcApFormatUnsupportedEntitiesMessage'
import { AcApNotificationStore } from '../src/app/notification/AcApNotificationStore'
import {
  acapGroupNotifications,
  type AcApNotification
} from '../src/app/notification/AcApNotificationTypes'

function makeNotification(
  partial: Partial<AcApNotification> & Pick<AcApNotification, 'id' | 'title'>
): AcApNotification {
  return {
    type: 'warning',
    timestamp: new Date(),
    ...partial
  }
}

describe('AcApNotificationStore (per-session)', () => {
  it('keeps separate lists per session and exposes only the active one', () => {
    const store = new AcApNotificationStore()
    store.setActiveSession('doc-1')
    store.warning('A fonts', undefined, { source: 'font-missed' })
    store.setActiveSession('doc-2')
    store.warning('B unsupported', undefined, { source: 'unsupported-entities' })

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('B unsupported')
    expect(store.notifications[0].sessionId).toBe('doc-2')

    store.setActiveSession('doc-1')
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('A fonts')
  })

  it('clear() only clears the active session', () => {
    const store = new AcApNotificationStore()
    store.setActiveSession('doc-1')
    store.info('one')
    store.setActiveSession('doc-2')
    store.info('two')
    store.clear()

    expect(store.notifications).toHaveLength(0)
    store.setActiveSession('doc-1')
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('one')
  })

  it('clearSession drops a closed document bucket', () => {
    const store = new AcApNotificationStore()
    store.setActiveSession('doc-1')
    store.info('one')
    store.clearSession('doc-1')
    expect(store.notifications).toHaveLength(0)
  })

  it('dispose clears all buckets so remounted session ids start empty', () => {
    const store = new AcApNotificationStore()
    store.setActiveSession('doc-1')
    store.warning('stale')
    store.dispose()

    store.setActiveSession('doc-1')
    expect(store.notifications).toHaveLength(0)
    expect(store.info('fresh')).not.toBe('')
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('fresh')
  })

  it('ignores add when no active session and no sessionId', () => {
    const store = new AcApNotificationStore()
    expect(store.info('orphan')).toBe('')
    expect(store.notifications).toHaveLength(0)
  })
})

describe('acapGroupNotifications', () => {
  it('collapses multiple font-missed notifications into one group', () => {
    const groups = acapGroupNotifications([
      makeNotification({
        id: '1',
        title: 'Font A',
        source: 'font-missed',
        fontNames: ['A']
      }),
      makeNotification({
        id: '2',
        title: 'Other',
        type: 'info'
      }),
      makeNotification({
        id: '3',
        title: 'Font B',
        source: 'font-missed',
        fontNames: ['B'],
        type: 'error'
      })
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0].key).toBe('font-missed')
    expect(groups[0].collapsible).toBe(true)
    expect(groups[0].items).toHaveLength(2)
    expect(groups[0].type).toBe('error')
    expect(groups[1].key).toBe('single:2')
    expect(groups[1].collapsible).toBe(false)
  })

  it('keeps a single groupable notification as a flat item', () => {
    const groups = acapGroupNotifications([
      makeNotification({
        id: '1',
        title: 'Unsupported',
        source: 'unsupported-entities'
      })
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].collapsible).toBe(false)
    expect(groups[0].source).toBe('unsupported-entities')
  })
})

describe('acapIsTianzhengClassName', () => {
  it('detects TCH_ and TH_ prefixes', () => {
    expect(acapIsTianzhengClassName('TCH_Door')).toBe(true)
    expect(acapIsTianzhengClassName('TH_TOLERANCEENT')).toBe(true)
    expect(acapIsTianzhengClassName('th_wall')).toBe(true)
    expect(acapIsTianzhengClassName('ACAD_PROXY_ENTITY')).toBe(false)
    expect(acapIsTianzhengClassName('')).toBe(false)
  })
})

describe('acapIsTianzhengClass', () => {
  it('matches app names containing 天正', () => {
    expect(
      acapIsTianzhengClass({
        name: 'CUSTOM_ENT',
        cppClassName: 'CustomEnt',
        appName: '天正建筑',
        proxyFlag: 0,
        instanceCount: 3,
        wasProxy: true,
        isEntity: true
      })
    ).toBe(true)
  })
})

describe('acapAnalyzeUnsupportedDrawing', () => {
  it('flags 天正 drawings from CLASSES even when unknownEntityCount is 0', () => {
    const analysis = acapAnalyzeUnsupportedDrawing(
      {
        classes: [
          {
            name: 'TH_TOLERANCEENT',
            cppClassName: 'TH_ToleranceEnt',
            appName: 'ObjectDBX Classes',
            proxyFlag: 0,
            instanceCount: 12,
            wasProxy: true,
            isEntity: true
          }
        ],
        tables: {
          blockTable: {
            newIterator: () => [] as Iterable<never>
          }
        }
      } as never,
      0,
      { scanProxies: false }
    )

    expect(analysis.isTianzhengDrawing).toBe(true)
    expect(analysis.tianzhengEntityCount).toBe(12)
    expect(analysis.shouldWarn).toBe(true)
  })

  it('warns for unknownEntityCount alone', () => {
    const analysis = acapAnalyzeUnsupportedDrawing(
      {
        classes: [],
        tables: {
          blockTable: {
            newIterator: () => [] as Iterable<never>
          }
        }
      } as never,
      5,
      { scanProxies: false }
    )

    expect(analysis.unknownEntityCount).toBe(5)
    expect(analysis.shouldWarn).toBe(true)
    expect(analysis.isTianzhengDrawing).toBe(false)
  })
})

describe('acapResolveUnsupportedEntitiesMessage', () => {
  const t = (key: string, params?: Record<string, string | number>) => {
    if (key === 'main.message.tianzhengEntities') {
      return `TZ:${params?.count}`
    }
    if (key === 'main.message.unknownEntities') {
      return `UNK:${params?.count}`
    }
    if (key === 'main.message.emptyProxyEntities') {
      return `PROXY:${params?.count}`
    }
    return key
  }

  it('prefers the 天正 message and can append unknown counts', () => {
    expect(
      acapResolveUnsupportedEntitiesMessage(t, {
        unknownEntityCount: 2,
        tianzhengEntityCount: 10,
        emptyProxyEntityCount: 10,
        isTianzhengDrawing: true,
        shouldWarn: true
      })
    ).toBe('TZ:10 UNK:2')
  })

  it('uses empty-proxy wording when no 天正 / unknown counts', () => {
    expect(
      acapResolveUnsupportedEntitiesMessage(t, {
        unknownEntityCount: 0,
        tianzhengEntityCount: 0,
        emptyProxyEntityCount: 4,
        isTianzhengDrawing: false,
        shouldWarn: true
      })
    ).toBe('PROXY:4')
  })
})

