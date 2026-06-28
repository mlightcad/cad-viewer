import type { AcApAnnotationServices } from '../AcApAnnotationServices'
import type { AcExAnnotationI18n } from '../i18n'
import { ensureAnnotationStyles } from './styles'

export class AcExAnnotationPropertyBar {
  private root: HTMLDivElement

  constructor(
    host: HTMLElement,
    private i18n: AcExAnnotationI18n,
    private services: AcApAnnotationServices
  ) {
    ensureAnnotationStyles()
    this.root = document.createElement('div')
    this.root.className = 'ml-ann-property-bar'
    host.appendChild(this.root)
    this.render()
  }

  refresh() {
    this.render()
  }

  destroy() {
    this.root.remove()
  }

  private render() {
    this.root.replaceChildren()
    const style = this.services.currentStyle

    const textColor = this.colorField(
      this.i18n.t('panel.textColor'),
      style.textColor,
      v => {
        style.textColor = v
      }
    )
    const fillColor = this.colorField(
      this.i18n.t('panel.fillColor'),
      style.fillColor === 'transparent' ? '#ffffff' : style.fillColor,
      v => {
        style.fillColor = v
      }
    )
    const lineColor = this.colorField(
      this.i18n.t('panel.lineColor'),
      style.lineColor,
      v => {
        style.lineColor = v
      }
    )
    const weight = document.createElement('label')
    weight.textContent = this.i18n.t('panel.lineWeight')
    const weightInput = document.createElement('input')
    weightInput.type = 'number'
    weightInput.min = '1'
    weightInput.max = '50'
    weightInput.value = String(style.lineWeight)
    weightInput.onchange = () => {
      style.lineWeight = Number(weightInput.value) as typeof style.lineWeight
    }
    weight.append(weightInput)

    this.root.append(textColor, fillColor, lineColor, weight)
  }

  private colorField(
    label: string,
    value: string,
    onChange: (v: string) => void
  ) {
    const wrap = document.createElement('label')
    wrap.textContent = label
    const input = document.createElement('input')
    input.type = 'color'
    input.className = 'ml-ann-color-input'
    input.value = value.startsWith('#') ? value : '#ff0000'
    input.oninput = () => onChange(input.value)
    wrap.append(input)
    return wrap
  }
}