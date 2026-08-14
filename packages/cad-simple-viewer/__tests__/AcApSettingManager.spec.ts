import { migrateStoredSettings } from '../src/app/AcApSettingManager'

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
})
