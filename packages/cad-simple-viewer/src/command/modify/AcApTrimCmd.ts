import { AcApTrimExtendCmd } from './AcApTrimExtendCmd.js'

/**
 * TRIM: trims objects to meet the edges of other objects, like the AutoCAD
 * TRIM command. Shift-pick extends instead. See {@link AcApTrimExtendCmd}
 * for modes and options.
 */
export class AcApTrimCmd extends AcApTrimExtendCmd {
  protected readonly primaryOp = 'trim' as const
}
