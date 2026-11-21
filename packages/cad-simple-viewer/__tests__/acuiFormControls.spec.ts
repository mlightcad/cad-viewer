/**
 * @jest-environment jsdom
 */
import { acuiFormToggle } from '../src/ui/acuiFormControls'

describe('acuiFormControls', () => {
  it('hides a toggle when its hidden flag is set', () => {
    const toggle = acuiFormToggle({
      label: 'Empty',
      checked: false,
      yes: 'Yes',
      no: 'No',
      onChange: () => undefined
    })
    document.body.append(toggle.root)
    toggle.root.hidden = true
    expect(getComputedStyle(toggle.root).display).toBe('none')
    toggle.root.remove()
  })
})
