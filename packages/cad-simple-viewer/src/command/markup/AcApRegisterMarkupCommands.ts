import type { AcApSystemCommandRegistrar } from '../AcApDrawStyleSession'
import {
  type AcApDrawStyleSessionInstallContext,
  acapInstallDrawStyleSessionAccessory
} from '../AcApDrawStyleSession'
import { AcApClearMarkupsCmd } from './AcApClearMarkupsCmd'
import { AcApMarkupArrowCmd } from './AcApMarkupArrowCmd'
import { AcApMarkupCalloutCmd } from './AcApMarkupCalloutCmd'
import { AcApMarkupCircleCmd } from './AcApMarkupCircleCmd'
import { AcApMarkupCloudCmd } from './AcApMarkupCloudCmd'
import { AcApMarkupExportCmd } from './AcApMarkupImportExportCmd'
import { AcApMarkupHighlightCmd } from './AcApMarkupHighlightCmd'
import { AcApMarkupImportCmd } from './AcApMarkupImportExportCmd'
import { AcApMarkupLineCmd } from './AcApMarkupLineCmd'
import { AcApMarkupRectCmd } from './AcApMarkupRectCmd'
import { AcApMarkupStampCmd } from './AcApMarkupStampCmd'
import { AcApMarkupTextCmd } from './AcApMarkupTextCmd'
import { AcApMarkupVisibilityCmd } from './AcApMarkupVisibilityCmd'

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
