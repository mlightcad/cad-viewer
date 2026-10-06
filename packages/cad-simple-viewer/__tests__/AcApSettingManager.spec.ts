import {
  AcApSettingManager,
  migrateStoredSettings
} from '../src/app/AcApSettingManager'

function installLocalStorageMock() {
  const store = new Map<string, string>()
  const localStorageMock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    }
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true
  })
  return localStorageMock
}

describe('migrateStoredSettings', () => {
  it('copies isShowMainMenu onto isShowRibbon when the new key is missing', () => {
    expect(
      migrateStoredSettings({ isShowMainMenu: false, isShowToolbar: true })
    ).toEqual({
      settings: { isShowRibbon: false, isShowToolbar: true },
      migrated: true
    })
  })

  it('keeps an existing isShowRibbon and drops the old key', () => {
    expect(
      migrateStoredSettings({ isShowMainMenu: false, isShowRibbon: true })
    ).toEqual({
      settings: { isShowRibbon: true },
      migrated: true
    })
  })

  it('leaves already-migrated settings unchanged', () => {
    expect(migrateStoredSettings({ isShowRibbon: false })).toEqual({
      settings: { isShowRibbon: false },
      migrated: false
    })
  })

  it('drops the obsolete isShowFileName key', () => {
    expect(
      migrateStoredSettings({ isShowFileName: true, isShowRibbon: true })
    ).toEqual({
      settings: { isShowRibbon: true },
      migrated: true
    })
  })
})

describe('AcApSettingManager layers', () => {
  const originalLocalStorage = globalThis.localStorage
  let ls: ReturnType<typeof installLocalStorageMock>

  beforeEach(() => {
    ls = installLocalStorageMock()
    AcApSettingManager.resetInstanceForTesting()
  })

  afterEach(() => {
    AcApSettingManager.resetInstanceForTesting()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage
    })
  })

  it('loads defaults when localStorage is empty', () => {
    const settings = AcApSettingManager.instance
    expect(settings.isShowCommandLine).toBe(true)
    expect(settings.isShowToolbar).toBe(true)
    expect(settings.isShowShortCutToolbar).toBe(true)
    expect(ls.getItem('settings')).toBeNull()
  })

  it('persist:false does not write localStorage', () => {
    const settings = AcApSettingManager.instance
    settings.set('isShowCommandLine', false, { persist: false })
    expect(settings.isShowCommandLine).toBe(false)
    expect(ls.getItem('settings')).toBeNull()
  })

  it('clearSessionOverride restores user prefs without touching localStorage', () => {
    ls.setItem('settings', JSON.stringify({ isShowRibbon: true }))
    AcApSettingManager.resetInstanceForTesting()
    const settings = AcApSettingManager.instance
    settings.set('isShowRibbon', false, { persist: false })
    expect(settings.isShowRibbon).toBe(false)

    settings.clearSessionOverride('isShowRibbon')
    expect(settings.isShowRibbon).toBe(true)
    expect(JSON.parse(ls.getItem('settings')!).isShowRibbon).toBe(true)
  })

  it('persist:true writes only the user layer, not session overrides', () => {
    const settings = AcApSettingManager.instance
    settings.set('isShowCommandLine', false, { persist: false })
    settings.set('isShowToolbar', false)

    const stored = JSON.parse(ls.getItem('settings')!) as Record<
      string,
      unknown
    >
    expect(stored.isShowToolbar).toBe(false)
    expect(stored.isShowCommandLine).toBeUndefined()
    expect(settings.isShowCommandLine).toBe(false)
    expect(settings.isShowToolbar).toBe(false)
  })

  it('session override wins over stored user preference', () => {
    ls.setItem('settings', JSON.stringify({ isShowCommandLine: true }))
    AcApSettingManager.resetInstanceForTesting()
    const settings = AcApSettingManager.instance
    expect(settings.isShowCommandLine).toBe(true)

    settings.apply({ isShowCommandLine: false }, { persist: false })
    expect(settings.isShowCommandLine).toBe(false)
    expect(JSON.parse(ls.getItem('settings')!).isShowCommandLine).toBe(true)
  })

  it('apply fires modified for each key', () => {
    const settings = AcApSettingManager.instance
    const keys: string[] = []
    settings.events.modified.addEventListener(args => {
      keys.push(String(args.key))
    })
    settings.apply(
      { isShowCommandLine: false, isShowCoordinate: false },
      { persist: false }
    )
    expect(keys).toEqual(['isShowCommandLine', 'isShowCoordinate'])
  })

  it('configure isolates products via storageKey', () => {
    AcApSettingManager.configure({
      storageKey: 'mlightcad.settings.product-a'
    })
    AcApSettingManager.instance.set('isShowToolbar', false)

    AcApSettingManager.resetInstanceForTesting()
    AcApSettingManager.configure({
      storageKey: 'mlightcad.settings.product-b'
    })
    expect(AcApSettingManager.instance.isShowToolbar).toBe(true)

    AcApSettingManager.resetInstanceForTesting()
    AcApSettingManager.configure({
      storageKey: 'mlightcad.settings.product-a'
    })
    expect(AcApSettingManager.instance.isShowToolbar).toBe(false)
  })

  it('migrates isShowMainMenu on load and rewrites storage', () => {
    ls.setItem(
      'settings',
      JSON.stringify({ isShowMainMenu: false, isShowStats: true })
    )
    const settings = AcApSettingManager.instance
    expect(settings.isShowRibbon).toBe(false)
    expect(settings.isShowStats).toBe(true)

    const stored = JSON.parse(ls.getItem('settings')!) as Record<
      string,
      unknown
    >
    expect(stored.isShowRibbon).toBe(false)
    expect(stored.isShowMainMenu).toBeUndefined()
    expect(stored.isShowStats).toBe(true)
  })

  it('property setters persist by default', () => {
    AcApSettingManager.instance.isShowCommandLine = false
    expect(JSON.parse(ls.getItem('settings')!).isShowCommandLine).toBe(false)
  })
})
