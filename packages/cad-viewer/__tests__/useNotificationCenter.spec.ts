jest.mock('@mlightcad/cad-simple-viewer', () => ({
  ...jest.requireActual(
    '../../cad-simple-viewer/src/app/notification/AcApNotificationStore'
  ),
  ...jest.requireActual(
    '../../cad-simple-viewer/src/app/notification/AcApNotificationTypes'
  )
}))

import { useNotificationCenter } from '../src/composable/useNotificationCenter'

describe('Vue notification ownership', () => {
  afterEach(() => useNotificationCenter().dispose())

  it('reacts to shared fonts and document changes through the native store', () => {
    const center = useNotificationCenter()
    center.setActiveSession('A')
    center.warning('Shared font', undefined, { sessionId: null })
    center.warning('A object')
    expect(center.unreadCount.value).toBe(2)
    center.setActiveSession('B')
    center.clearSession('A')
    expect(center.notifications.value.map(n => n.title)).toEqual([
      'Shared font'
    ])
    center.clear()
    expect(center.hasNotifications.value).toBe(false)
  })

  it('clears stale data and keeps subscriptions working after viewer remount', () => {
    const center = useNotificationCenter()
    center.warning('Old runtime', undefined, { sessionId: null })
    expect(center.unreadCount.value).toBe(1)
    center.dispose()
    expect(center.unreadCount.value).toBe(0)
    center.setActiveSession('A')
    center.info('New document')
    expect(center.notifications.value.map(n => n.title)).toEqual([
      'New document'
    ])
  })
})
