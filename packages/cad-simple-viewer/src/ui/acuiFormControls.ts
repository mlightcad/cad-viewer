/**
 * Shared form chrome for framework-free dialogs (export PDF/HTML and similar).
 *
 * Styled with `--ml-ui-*` tokens so the controls match {@link AcUiDialog}
 * in both themes. Callers own the values; these helpers only build DOM.
 */

const STYLE_ID = 'ml-ui-form-styles'

let radioGroupSeq = 0

/** One selectable card in {@link acuiFormChoiceCards}. */
export interface AcUiFormChoice<T extends string> {
  value: T
  title: string
  hint?: string
}

/** A group of choice cards sharing one radio name. */
export interface AcUiFormChoiceGroup<T extends string> {
  root: HTMLDivElement
  getValue: () => T
  setValue: (value: T) => void
}

/** Label, optional hint, and a Yes/No switch. */
export interface AcUiFormToggle {
  root: HTMLLabelElement
  input: HTMLInputElement
  setChecked: (checked: boolean) => void
}

/** One option in {@link acuiFormRadios}. `leading` is placed before the label. */
export interface AcUiFormRadio<T extends string> {
  value: T
  label: string
  title?: string
  leading?: HTMLElement
}

/** A compact radio row (background swatches, expiry choices, and similar). */
export interface AcUiFormRadioGroup<T extends string> {
  root: HTMLDivElement
  getValue: () => T
  setValue: (value: T) => void
}

/** Injects shared form CSS once per document. */
export function acuiEnsureFormStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = FORM_CSS
  document.head.appendChild(style)
}

/** Vertical stack with the standard section gap. */
export function acuiFormStack(...children: HTMLElement[]): HTMLDivElement {
  acuiEnsureFormStyles()
  const root = document.createElement('div')
  root.className = 'ml-ui-form-stack'
  root.append(...children)
  return root
}

/** Two equal columns. Stacks on narrow dialogs. */
export function acuiFormSplit(...children: HTMLElement[]): HTMLDivElement {
  acuiEnsureFormStyles()
  const root = document.createElement('div')
  root.className = 'ml-ui-form-split'
  root.append(...children)
  return root
}

/** Fieldset with a legend. Append controls to `body`. */
export function acuiFormSection(title: string): {
  root: HTMLFieldSetElement
  body: HTMLDivElement
} {
  acuiEnsureFormStyles()
  const root = document.createElement('fieldset')
  root.className = 'ml-ui-form-section'
  const legend = document.createElement('legend')
  legend.textContent = title
  const body = document.createElement('div')
  body.className = 'ml-ui-form-section-body'
  root.append(legend, body)
  return { root, body }
}

/** Muted paragraph under a section. */
export function acuiFormHint(text: string): HTMLParagraphElement {
  acuiEnsureFormStyles()
  const hint = document.createElement('p')
  hint.className = 'ml-ui-form-hint'
  hint.textContent = text
  return hint
}

/**
 * Two-column cards. The selected card gets `is-selected`.
 *
 * @param name - Radio group name. A unique suffix is added when omitted.
 */
export function acuiFormChoiceCards<T extends string>(
  choices: AcUiFormChoice<T>[],
  value: T,
  onChange: (value: T) => void,
  name?: string
): AcUiFormChoiceGroup<T> {
  acuiEnsureFormStyles()
  const groupName = name ?? `ml-ui-form-${++radioGroupSeq}`
  const root = document.createElement('div')
  root.className = 'ml-ui-form-cards'
  const inputs: HTMLInputElement[] = []
  let current = value

  const paint = () => {
    for (const input of inputs) {
      input
        .closest('.ml-ui-form-card')
        ?.classList.toggle('is-selected', input.checked)
    }
  }

  for (const choice of choices) {
    const card = document.createElement('label')
    card.className = 'ml-ui-form-card'
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = groupName
    input.value = choice.value
    input.checked = choice.value === value
    input.className = 'ml-ui-form-card-radio'
    input.addEventListener('change', () => {
      if (!input.checked) return
      current = choice.value
      paint()
      onChange(choice.value)
    })
    const body = document.createElement('span')
    body.className = 'ml-ui-form-card-body'
    const title = document.createElement('span')
    title.className = 'ml-ui-form-card-title'
    title.textContent = choice.title
    body.append(title)
    if (choice.hint) {
      const hint = document.createElement('span')
      hint.className = 'ml-ui-form-card-hint'
      hint.textContent = choice.hint
      body.append(hint)
    }
    card.append(input, body)
    root.append(card)
    inputs.push(input)
  }
  paint()

  return {
    root,
    getValue: () => current,
    setValue: next => {
      current = next
      for (const input of inputs) input.checked = input.value === next
      paint()
    }
  }
}

/**
 * Checkbox drawn as a switch. `yes` / `no` are the words inside the track.
 */
export function acuiFormToggle(options: {
  label: string
  hint?: string
  checked: boolean
  yes: string
  no: string
  nested?: boolean
  onChange: (checked: boolean) => void
}): AcUiFormToggle {
  acuiEnsureFormStyles()
  const root = document.createElement('label')
  root.className = options.nested
    ? 'ml-ui-form-toggle ml-ui-form-toggle--nested'
    : 'ml-ui-form-toggle'
  const copy = document.createElement('span')
  copy.className = 'ml-ui-form-toggle-copy'
  const label = document.createElement('span')
  label.className = 'ml-ui-form-toggle-label'
  label.textContent = options.label
  copy.append(label)
  if (options.hint) {
    const hint = document.createElement('span')
    hint.className = 'ml-ui-form-toggle-hint'
    hint.textContent = options.hint
    copy.append(hint)
  }
  const track = document.createElement('span')
  track.className = 'ml-ui-form-switch'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = options.checked
  const ui = document.createElement('span')
  ui.className = 'ml-ui-form-switch-ui'
  const paint = (checked: boolean) => {
    ui.textContent = checked ? options.yes : options.no
    ui.dataset.state = checked ? 'on' : 'off'
  }
  paint(options.checked)
  input.addEventListener('change', () => {
    paint(input.checked)
    options.onChange(input.checked)
  })
  track.append(input, ui)
  root.append(copy, track)
  return {
    root,
    input,
    setChecked: checked => {
      input.checked = checked
      paint(checked)
    }
  }
}

/**
 * Horizontal or wrapping radio group. Use for short choices that are not cards.
 */
export function acuiFormRadios<T extends string>(
  options: AcUiFormRadio<T>[],
  value: T,
  onChange: (value: T) => void,
  layout: 'row' | 'grid' = 'row'
): AcUiFormRadioGroup<T> {
  acuiEnsureFormStyles()
  const groupName = `ml-ui-form-${++radioGroupSeq}`
  const root = document.createElement('div')
  root.className =
    layout === 'grid'
      ? 'ml-ui-form-radios ml-ui-form-radios--grid'
      : 'ml-ui-form-radios'
  const inputs: HTMLInputElement[] = []
  let current = value

  for (const option of options) {
    const label = document.createElement('label')
    label.className = 'ml-ui-form-radio'
    if (option.title) label.title = option.title
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = groupName
    input.value = option.value
    input.checked = option.value === value
    input.addEventListener('change', () => {
      if (!input.checked) return
      current = option.value
      onChange(option.value)
    })
    const text = document.createElement('span')
    text.textContent = option.label
    label.append(input)
    if (option.leading) label.append(option.leading)
    label.append(text)
    root.append(label)
    inputs.push(input)
  }

  return {
    root,
    getValue: () => current,
    setValue: next => {
      current = next
      for (const input of inputs) input.checked = input.value === next
    }
  }
}

/**
 * Label plus a numeric input. Values outside min/max are clamped on change.
 */
export function acuiFormNumber(options: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}): { root: HTMLDivElement; input: HTMLInputElement } {
  acuiEnsureFormStyles()
  const root = document.createElement('div')
  root.className = 'ml-ui-form-number'
  const copy = document.createElement('span')
  copy.className = 'ml-ui-form-toggle-copy'
  const label = document.createElement('span')
  label.className = 'ml-ui-form-toggle-label'
  label.textContent = options.label
  copy.append(label)
  if (options.hint) {
    const hint = document.createElement('span')
    hint.className = 'ml-ui-form-toggle-hint'
    hint.textContent = options.hint
    copy.append(hint)
  }
  const input = document.createElement('input')
  input.type = 'number'
  input.className = 'ml-ui-form-number-input'
  input.min = String(options.min)
  input.max = String(options.max)
  input.step = String(options.step ?? 1)
  input.value = String(options.value)
  const commit = (clamp: boolean) => {
    const parsed = Number(input.value)
    if (!Number.isFinite(parsed)) return
    const next = clamp
      ? Math.min(options.max, Math.max(options.min, parsed))
      : parsed
    if (clamp) input.value = String(next)
    if (next < options.min || next > options.max) return
    options.onChange(next)
  }
  input.addEventListener('input', () => commit(false))
  input.addEventListener('change', () => commit(true))
  root.append(copy, input)
  return { root, input }
}

/** Footer button using the dialog button classes. */
export function acuiFormButton(
  label: string,
  kind: 'primary' | 'secondary',
  onClick: () => void
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className =
    kind === 'primary'
      ? 'ml-ui-dialog-btn'
      : 'ml-ui-dialog-btn ml-ui-dialog-btn-secondary'
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

const FORM_CSS = `
.ml-ui-form-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.ml-ui-form-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-width: 0;
}
.ml-ui-form-section {
  margin: 0;
  padding: 8px 10px 10px;
  min-width: 0;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
}
.ml-ui-form-section > legend {
  padding: 0 4px;
  font-size: 12px;
  font-weight: 600;
}
.ml-ui-form-section-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.ml-ui-form-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-ui-form-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ml-ui-form-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 10px 10px 10px 8px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: var(--ml-ui-bg, #ffffff);
  cursor: pointer;
}
.ml-ui-form-card.is-selected {
  border-color: var(--ml-ui-accent, #0b84ff);
  box-shadow: inset 0 0 0 1px var(--ml-ui-accent, #0b84ff);
}
.ml-ui-form-card-radio {
  margin-top: 2px;
}
.ml-ui-form-card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ml-ui-form-card-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}
.ml-ui-form-card-hint {
  font-size: 11px;
  line-height: 1.35;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-ui-form-toggle,
.ml-ui-form-number {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ml-ui-form-toggle--nested {
  margin-top: 2px;
}
.ml-ui-form-toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ml-ui-form-toggle-label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}
.ml-ui-form-toggle-hint {
  font-size: 11px;
  line-height: 1.35;
  color: var(--ml-ui-text-muted, #606266);
}
.ml-ui-form-switch {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  height: 22px;
}
.ml-ui-form-switch input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.ml-ui-form-switch-ui {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  min-width: 52px;
  height: 100%;
  border-radius: 11px;
  background: var(--ml-ui-border, #dcdfe6);
  color: var(--ml-ui-text, #303133);
  font-size: 10px;
  line-height: 1;
  white-space: nowrap;
  padding: 0 8px 0 22px;
  pointer-events: none;
}
.ml-ui-form-switch-ui[data-state='on'] {
  background: var(--ml-ui-accent, #0b84ff);
  color: #fff;
  padding: 0 22px 0 8px;
}
.ml-ui-form-switch-ui::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
}
.ml-ui-form-switch-ui[data-state='on']::after {
  left: auto;
  right: 3px;
}
.ml-ui-form-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}
.ml-ui-form-radios--grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.ml-ui-form-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
}
.ml-ui-form-number-input,
.ml-ui-form-text-input {
  box-sizing: border-box;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  border-radius: 4px;
  background: var(--ml-ui-bg, #ffffff);
  color: var(--ml-ui-text, #303133);
  font-size: 12px;
}
.ml-ui-form-number-input {
  width: 88px;
}
/*
 * Author display rules beat the user-agent [hidden] rule. Nested toggles
 * and conditionally shown sections use the hidden attribute.
 */
.ml-ui-form-stack[hidden],
.ml-ui-form-split[hidden],
.ml-ui-form-toggle[hidden],
.ml-ui-form-number[hidden],
.ml-ui-form-radios[hidden],
.ml-ui-form-hint[hidden],
.ml-ui-form-section[hidden] {
  display: none !important;
}
.ml-ui-dialog.ml-ui-export-dialog {
  width: min(520px, calc(100vw - 32px));
  max-width: none;
}
@media (max-width: 520px) {
  .ml-ui-form-split,
  .ml-ui-form-cards,
  .ml-ui-form-radios--grid {
    grid-template-columns: 1fr;
  }
}
`.trim()
