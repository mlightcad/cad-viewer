/**
 * Subpath entry for `@mlightcad/cad-simple-viewer/file-open-panel`.
 *
 * Landing-page file open UI and data-source registry helpers that do **not**
 * depend on {@link AcApDocManager}, three.js, or the command/view stack.
 * Import this from demo / host landing pages so the full viewer stays lazy.
 */
import { AcApI18n } from './i18n/AcApI18n'
import arMain from './i18n/ar/main'
import csMain from './i18n/cs/main'
import enMain from './i18n/en/main'
import trMain from './i18n/tr/main'
import zhMain from './i18n/zh/main'

// Register only `main.*` strings needed by the panel (not command/jig catalogs).
AcApI18n.mergeLocaleMessage('en', { main: enMain })
AcApI18n.mergeLocaleMessage('zh', { main: zhMain })
AcApI18n.mergeLocaleMessage('tr', { main: trMain })
AcApI18n.mergeLocaleMessage('cs', { main: csMain })
AcApI18n.mergeLocaleMessage('ar', { main: arMain })

export {
  AcApOpenViewMode,
  type AcApOpenDatabaseOptions
} from './app/AcApOpenDatabaseOptions'
export {
  acedIsCompactUiLayout,
  ML_UI_COMPACT_MAX_WIDTH,
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MAX_WIDTH,
  ML_UI_MOBILE_MEDIA_QUERY
} from './editor/global/AcEdUiLayout'
export type {
  AcApDataSource,
  AcApDataSourceAccountProfile,
  AcApDataSourceAuthState,
  AcApDataSourceFile
} from './app/dataSource/AcApDataSource'
export {
  ACAP_LOCAL_DATA_SOURCE_ID,
  ACAP_URL_DATA_SOURCE_ID
} from './app/dataSource/AcApDataSourceIds'
export {
  AcApDataSourceManager,
  type AcApDataSourceManagerEvents
} from './app/dataSource/AcApDataSourceManager'
export {
  acapBuildDataSourceMenu,
  acapIsSingleLocalOpen,
  type AcApDataSourceMenuAction,
  type AcApDataSourceMenuItem
} from './app/dataSource/acapBuildDataSourceMenu'
export { acapInvokeDataSourceMenuAction } from './app/dataSource/acapInvokeDataSourceMenuAction'
export { acapOpenCenteredPopup } from './app/dataSource/acapOpenCenteredPopup'
export {
  acedApplyUiTheme,
  acedSubscribeUiTheme,
  type AcEdApplyUiThemeOptions,
  type AcEdUiTheme,
  resolveUiTheme
} from './editor/global/AcEdUiTheme'
export { AcEdOpenMode } from './editor/view/AcEdOpenMode'
export {
  AcApI18n,
  type AcApLocale,
  type AcApLocaleChangedEventArgs,
  type AcApLocaleMessage,
  type AcApLocaleMessages,
  type AcApTranslateOptions
} from './i18n/AcApI18n'
export {
  AcUiFileOpenLanding,
  acuiAttachDataSources,
  type AcUiFileOpenLandingOptions,
  type AcUiFileOpenRequest
} from './ui/AcUiFileOpenLanding'
export {
  AcUiFileOpenPanel,
  type AcUiFileOpenPanelCardSize,
  type AcUiFileOpenPanelOptions,
  type AcUiFileOpenPanelResult
} from './ui/AcUiFileOpenPanel'
export {
  AcUiFileOpenSession,
  acuiCreateFileOpenSession,
  type AcUiFileOpenDocManager,
  type AcUiFileOpenSessionOptions,
  type AcUiFileOpenSessionResult
} from './ui/AcUiFileOpenSession'
