/**
 * Builds sample dock tab panel content for the example app.
 * Use this as a reference when adding custom UI inside dock panel tabs.
 */
export function createDemoDockTabPanel(tabNumber: number): HTMLElement {
  const root = document.createElement('div')
  root.className = 'demo-dock-tab-panel'

  const header = document.createElement('div')
  header.className = 'demo-dock-tab-header'

  const title = document.createElement('h3')
  title.className = 'demo-dock-tab-title'
  title.textContent = `Demo Panel ${tabNumber}`

  const description = document.createElement('p')
  description.className = 'demo-dock-tab-description'
  description.textContent =
    'Example controls you can copy when building your own dock tab content.'

  header.appendChild(title)
  header.appendChild(description)
  root.appendChild(header)

  const nameField = createField(
    'Name',
    document.createElement('input')
  )
  const nameInput = nameField.control as HTMLInputElement
  nameInput.type = 'text'
  nameInput.placeholder = 'Enter a label'
  nameInput.value = `Widget ${tabNumber}`
  root.appendChild(nameField.field)

  const enabledField = createField(
    'Enabled',
    document.createElement('input')
  )
  const enabledInput = enabledField.control as HTMLInputElement
  enabledInput.type = 'checkbox'
  enabledInput.checked = true
  enabledField.field.classList.add('demo-dock-tab-field-inline')
  root.appendChild(enabledField.field)

  const modeSelect = document.createElement('select')
  ;['Inspect', 'Edit', 'Measure'].forEach(optionValue => {
    const option = document.createElement('option')
    option.value = optionValue.toLowerCase()
    option.textContent = optionValue
    modeSelect.appendChild(option)
  })
  modeSelect.value = 'inspect'
  root.appendChild(createField('Mode', modeSelect).field)

  const opacityRange = document.createElement('input')
  opacityRange.type = 'range'
  opacityRange.min = '0'
  opacityRange.max = '100'
  opacityRange.value = '80'
  const opacityField = createField('Opacity', opacityRange)
  root.appendChild(opacityField.field)

  const opacityValue = document.createElement('span')
  opacityValue.className = 'demo-dock-tab-range-value'
  opacityValue.textContent = `${opacityRange.value}%`
  opacityField.field.appendChild(opacityValue)

  const notesInput = document.createElement('textarea')
  notesInput.rows = 3
  notesInput.placeholder = 'Optional notes for this panel…'
  notesInput.value = 'Replace this block with your own form or tool UI.'
  root.appendChild(createField('Notes', notesInput).field)

  const actions = document.createElement('div')
  actions.className = 'demo-dock-tab-actions'

  const applyButton = document.createElement('button')
  applyButton.type = 'button'
  applyButton.className = 'demo-dock-tab-btn demo-dock-tab-btn-primary'
  applyButton.textContent = 'Apply'

  const resetButton = document.createElement('button')
  resetButton.type = 'button'
  resetButton.className = 'demo-dock-tab-btn'
  resetButton.textContent = 'Reset'

  actions.appendChild(applyButton)
  actions.appendChild(resetButton)
  root.appendChild(actions)

  const status = document.createElement('div')
  status.className = 'demo-dock-tab-status'
  status.textContent = 'Change controls above, then click Apply.'
  root.appendChild(status)

  const updateStatus = (message: string) => {
    status.textContent = message
  }

  opacityRange.addEventListener('input', () => {
    opacityValue.textContent = `${opacityRange.value}%`
  })

  applyButton.addEventListener('click', () => {
    updateStatus(
      `Applied: name="${nameInput.value}", enabled=${enabledInput.checked}, mode="${modeSelect.value}", opacity=${opacityRange.value}%.`
    )
  })

  resetButton.addEventListener('click', () => {
    nameInput.value = `Widget ${tabNumber}`
    enabledInput.checked = true
    modeSelect.value = 'inspect'
    opacityRange.value = '80'
    opacityValue.textContent = '80%'
    notesInput.value = 'Replace this block with your own form or tool UI.'
    updateStatus('Panel values reset.')
  })

  return root
}

function createField(labelText: string, control: HTMLElement) {
  const field = document.createElement('label')
  field.className = 'demo-dock-tab-field'

  const label = document.createElement('span')
  label.className = 'demo-dock-tab-label'
  label.textContent = labelText

  control.classList.add('demo-dock-tab-control')

  field.appendChild(label)
  field.appendChild(control)

  return { field, control }
}
