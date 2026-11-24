import { AcApTrimExtendCmd } from './AcApTrimExtendCmd.js'

/**
 * EXTEND: extends objects to meet the edges of other objects, like the
 * AutoCAD EXTEND command. Shift-pick trims instead. See
 * {@link AcApTrimExtendCmd} for modes and options.
 */
export class AcApExtendCmd extends AcApTrimExtendCmd {
  protected readonly primaryOp = 'extend' as const
}
