import type { AcApSystemCommandRegistrar } from '../AcApDrawStyleSession.js'
import {
  type AcApDrawStyleSessionInstallContext,
  acapInstallDrawStyleSessionAccessory
} from '../AcApDrawStyleSession.js'
import { AcApClearMarkupsCmd } from './AcApClearMarkupsCmd.js'
import { AcApMarkupArrowCmd } from './AcApMarkupArrowCmd.js'
import { AcApMarkupCalloutCmd } from './AcApMarkupCalloutCmd.js'
import { AcApMarkupCircleCmd } from './AcApMarkupCircleCmd.js'
import { AcApMarkupCloudCmd } from './AcApMarkupCloudCmd.js'
import { AcApMarkupHighlightCmd } from './AcApMarkupHighlightCmd.js'
import { AcApMarkupExportCmd } from './AcApMarkupImportExportCmd.js'
import { AcApMarkupImportCmd } from './AcApMarkupImportExportCmd.js'
import { AcApMarkupLineCmd } from './AcApMarkupLineCmd.js'
import { AcApMarkupRectCmd } from './AcApMarkupRectCmd.js'
import { AcApMarkupStampCmd } from './AcApMarkupStampCmd.js'
import { AcApMarkupTextCmd } from './AcApMarkupTextCmd.js'
import { AcApMarkupVisibilityCmd } from './AcApMarkupVisibilityCmd.js'

/**
 * Registers markup commands and installs the shared draw-style session
 * accessory for the view (idempotent).
 */
export function registerMarkupCommands(
  addSystemCommand: AcApSystemCommandRegistrar,
  installCtx: AcApDrawStyleSessionInstallContext
): void {
  acapInstallDrawStyleSessionAccessory(installCtx)

  addSystemCommand('markuptext', 'markuptext', new AcApMarkupTextCmd())
  addSystemCommand('markupline', 'markupline', new AcApMarkupLineCmd())
  addSystemCommand('markuparrow', 'markuparrow', new AcApMarkupArrowCmd())
  addSystemCommand('markupcloud', 'markupcloud', new AcApMarkupCloudCmd())
  addSystemCommand('markuprect', 'markuprect', new AcApMarkupRectCmd())
  addSystemCommand('markupcircle', 'markupcircle', new AcApMarkupCircleCmd())
  addSystemCommand(
    'markuphighlight',
    'markuphighlight',
    new AcApMarkupHighlightCmd()
  )
  addSystemCommand(
    'markupcallout',
    'markupcallout',
    new AcApMarkupCalloutCmd()
  )
  addSystemCommand('markupstamp', 'markupstamp', new AcApMarkupStampCmd())
  addSystemCommand('markupvis', 'markupvis', new AcApMarkupVisibilityCmd())
  addSystemCommand('clearmarkups', 'clearmarkups', new AcApClearMarkupsCmd())
  addSystemCommand('markupexport', 'markupexport', new AcApMarkupExportCmd())
  addSystemCommand('markupimport', 'markupimport', new AcApMarkupImportCmd())
}
