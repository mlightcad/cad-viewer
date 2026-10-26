import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Regression guard: the optional HTML export password field must not accept
 * browser password-manager autofill / auto-generate when left empty. This has
 * regressed multiple times and produces exported HTML that prompts for a
 * password the user never set.
 */
describe('MlExportHtmlDlg password field', () => {
  const source = readFileSync(
    join(__dirname, '../src/component/dialog/MlExportHtmlDlg.vue'),
    'utf8'
  )

  it('blocks password-manager autofill on the optional password input', () => {
    expect(source).toContain('autocomplete="new-password"')
    expect(source).toContain(':readonly="passwordFieldLocked"')
    expect(source).toMatch(/el-tab-pane[\s\S]*?name="security"[\s\S]*?\blazy\b/)
  })
})
