/**
 * Standalone config-driven toolbar setup entry.
 *
 * Separated from `/toolbar` so HTML item builders can import chrome utils
 * without pulling this module.
 */

export {
  acuiSetupToolbar,
  type AcUiSetupToolbarController,
  type AcUiSetupToolbarOptions
} from './ui/acuiSetupToolbar'
