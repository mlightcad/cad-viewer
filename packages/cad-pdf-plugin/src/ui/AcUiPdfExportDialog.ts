import {
  AcApDocManager,
  AcApI18n,
  AcEdCommand,
  AcEdCommandStack,
  AcUiDialog,
  acuiFormButton,
  acuiFormChoiceCards,
  acuiFormSection,
  acuiFormStack,
  acuiFormToggle
} from '@mlightcad/cad-simple-viewer'

import type { AcApPdfExportOptions } from '../AcApPdfExportOptions.js'

function t(key: string): string {
  return AcApI18n.t(`dialog.exportPdfDlg.${key}`)
}

function buttonLabel(key: 'ok' | 'cancel' | 'close'): string {
  if (key === 'close') return AcApI18n.t('main.about.close')
  return AcApI18n.t(`main.textHeight.${key}`)
}

/**
 * Export PDF dialog (`cpdf`).
 *
 * Collects {@link AcApPdfExportOptions} and, on OK, loads the PDF plugin via
 * `-cpdf` then runs {@link AcApPdfConvertor}. Command-line export without this
 * dialog is `-cpdf`.
 */
export class AcUiPdfExportDialog extends AcUiDialog {
  /** The dialog already on screen, so a second `cpdf` does not stack another. */
  private static current: AcUiPdfExportDialog | undefined

  /**
   * Opens the dialog and returns immediately.
   *
   * The command must not stay active while the dialog is open. A running
   * command makes the next command wait in `cancelActive` until this one
   * finishes, and this dialog does not end when that cancellation arrives.
   */
  static open(): void {
    if (this.current) return
    const dialog = new AcUiPdfExportDialog()
    this.current = dialog
    void dialog.show().finally(() => {
      if (this.current === dialog) this.current = undefined
    })
  }

  private modelSpaceFit: 'display' | 'extents' = 'extents'
  private exportLayouts = true
  private exportEmptyLayouts = false
  private textMode: 'text' | 'vector' = 'text'
  private colorMode: 'color' | 'monochrome' = 'color'
  private busy = false

  constructor() {
    const view = AcApDocManager.instance.curView as
      | { container?: HTMLElement }
      | undefined
    super({
      host: view?.container,
      title: t('title'),
      closeLabel: buttonLabel('close'),
      dialogClassName: 'ml-ui-export-dialog ml-pdf-export-dialog',
      layoutWidth: false
    })
    this.build()
  }

  private build(): void {
    const model = acuiFormSection(t('modelSpaceSection'))
    model.body.append(
      acuiFormChoiceCards(
        [
          {
            value: 'display' as const,
            title: t('modelSpaceDisplay'),
            hint: t('modelSpaceDisplayHint')
          },
          {
            value: 'extents' as const,
            title: t('modelSpaceExtents'),
            hint: t('modelSpaceExtentsHint')
          }
        ],
        this.modelSpaceFit,
        value => {
          this.modelSpaceFit = value
        }
      ).root
    )

    const text = acuiFormSection(t('textModeSection'))
    text.body.append(
      acuiFormChoiceCards(
        [
          {
            value: 'text' as const,
            title: t('textModeText'),
            hint: t('textModeTextHint')
          },
          {
            value: 'vector' as const,
            title: t('textModeVector'),
            hint: t('textModeVectorHint')
          }
        ],
        this.textMode,
        value => {
          this.textMode = value
        }
      ).root
    )

    const color = acuiFormSection(t('colorModeSection'))
    color.body.append(
      acuiFormChoiceCards(
        [
          {
            value: 'color' as const,
            title: t('colorModeColor'),
            hint: t('colorModeColorHint')
          },
          {
            value: 'monochrome' as const,
            title: t('colorModeMonochrome'),
            hint: t('colorModeMonochromeHint')
          }
        ],
        this.colorMode,
        value => {
          this.colorMode = value
        }
      ).root
    )

    const paper = acuiFormSection(t('paperSpaceSection'))
    const empty = acuiFormToggle({
      label: t('exportEmptyLayouts'),
      hint: t('exportEmptyLayoutsHint'),
      checked: this.exportEmptyLayouts,
      yes: t('yes'),
      no: t('no'),
      nested: true,
      onChange: checked => {
        this.exportEmptyLayouts = checked
      }
    })
    empty.root.hidden = !this.exportLayouts
    const layouts = acuiFormToggle({
      label: t('exportLayouts'),
      hint: t('exportLayoutsHint'),
      checked: this.exportLayouts,
      yes: t('yes'),
      no: t('no'),
      onChange: checked => {
        this.exportLayouts = checked
        empty.root.hidden = !checked
      }
    })
    paper.body.append(layouts.root, empty.root)

    this.bodyEl.append(
      acuiFormStack(model.root, text.root, color.root, paper.root)
    )
    this.footerEl.append(
      acuiFormButton(buttonLabel('ok'), 'primary', () => {
        void this.confirm()
      }),
      acuiFormButton(buttonLabel('cancel'), 'secondary', () => this.close())
    )
  }

  private async confirm(): Promise<void> {
    if (this.busy) return
    this.busy = true
    const docManager = AcApDocManager.instance
    const options: AcApPdfExportOptions = {
      modelSpaceFit: this.modelSpaceFit,
      exportLayouts: this.exportLayouts,
      exportEmptyLayouts: this.exportLayouts ? this.exportEmptyLayouts : false,
      textMode: this.textMode,
      colorMode: this.colorMode
    }
    try {
      const loaded = await docManager.pluginManager.loadByTrigger('-cpdf')
      if (!loaded) {
        throw new Error(
          'PDF export plugin is not available. Install @mlightcad/cad-pdf-plugin.'
        )
      }
      const { AcApPdfConvertor, resolveAcApPdfExportOptions } =
        await import('@mlightcad/cad-pdf-plugin')
      const converter = new AcApPdfConvertor()
      await converter.convert(
        docManager.context,
        resolveAcApPdfExportOptions(options)
      )
      this.close()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      docManager.editor.showMessage(message, 'error')
      this.close()
    } finally {
      this.busy = false
    }
  }
}

/**
 * Opens {@link AcUiPdfExportDialog}.
 *
 * Registered as `cpdf` from the plugin `/register` module when a DOM exists,
 * so the plugin's command-line `cpdf` is left for Node hosts.
 */
export class AcApExportPdfDlgCmd extends AcEdCommand {
  /** Opening the dialog does not edit the database. */
  recordsUndoStack = false

  async execute(): Promise<void> {
    AcUiPdfExportDialog.open()
  }
}

/**
 * Claims `cpdf` for the dialog when this process has a DOM.
 *
 * A second call is a no-op. Node hosts skip this so `onLoad` can register
 * the prompt command.
 */
export function registerPdfExportDialogCommand(): void {
  if (typeof document === 'undefined') return
  const commandManager = AcApDocManager.instance.commandManager
  if (commandManager.lookupGlobalCmd('cpdf')) return
  commandManager.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'cpdf',
    'cpdf',
    new AcApExportPdfDlgCmd()
  )
}
