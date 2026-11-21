import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Regression guard: the optional HTML export password field must not accept
 * browser password-manager autofill / auto-generate when left empty. This has
 * regressed multiple times and produces exported HTML that prompts for a
 * password the user never set.
 */
describe('AcUiHtmlExportDialog password field', () => {
  const source = readFileSync(
    join(__dirname, '../src/ui/AcUiHtmlExportDialog.ts'),
    'utf8'
  )

  it('keeps the password input out of the DOM until Security is opened', () => {
    expect(source).toContain('autocomplete = \'new-password\'')
    expect(source).toContain('input.readOnly = true')
    expect(source).toContain('input.name = \'mlcad-html-export-password\'')
    expect(source).toMatch(
      /if \(id === 'security'\) this\.ensurePasswordField\(\)/
    )
  })
})
