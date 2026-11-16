/**
 * Subpath entry for `@mlightcad/cad-simple-viewer/file-open-panel`.
 *
 * Landing-page file open UI and data-source registry helpers that do **not**
 * depend on {@link AcApDocManager}, three.js, or the command/view stack.
 * Import this from demo / host landing pages so the full viewer stays lazy.
 */
import { AcApI18n } from './i18n/AcApI18n.js'
import arMain from './i18n/ar/main.js'
import csMain from './i18n/cs/main.js'
import enMain from './i18n/en/main.js'
import jaMain from './i18n/ja/main.js'
import koMain from './i18n/ko/main.js'
import trMain from './i18n/tr/main.js'
import zhMain from './i18n/zh/main.js'

// Register only `main.*` strings needed by the panel (not command/jig catalogs).
AcApI18n.mergeLocaleMessage('en', { main: enMain })
AcApI18n.mergeLocaleMessage('zh', { main: zhMain })
AcApI18n.mergeLocaleMessage('ja', { main: jaMain })
AcApI18n.mergeLocaleMessage('ko', { main: koMain })
AcApI18n.mergeLocaleMessage('tr', { main: trMain })
AcApI18n.mergeLocaleMessage('cs', { main: csMain })
AcApI18n.mergeLocaleMessage('ar', { main: arMain })

export {
  AcApOpenViewMode,
  type AcApOpenDatabaseOptions
} from './app/AcApOpenDatabaseOptions.js'
export {
  acedIsCompactUiLayout,
  ML_UI_COMPACT_MAX_WIDTH,
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MAX_WIDTH,
  ML_UI_MOBILE_MEDIA_QUERY
} from './editor/global/AcEdUiLayout.js'
export type {
  AcApDataSource,
  AcApDataSourceAccountProfile,
  AcApDataSourceAuthState,
  AcApDataSourceFile
} from './app/dataSource/AcApDataSource.js'
export {
  ACAP_LOCAL_DATA_SOURCE_ID,
  ACAP_URL_DATA_SOURCE_ID
} from './app/dataSource/AcApDataSourceIds.js'
export {
  AcApDataSourceManager,
  type AcApDataSourceManagerEvents
} from './app/dataSource/AcApDataSourceManager.js'
export {
  acapBuildDataSourceMenu,
  acapIsSingleLocalOpen,
  type AcApDataSourceMenuAction,
  type AcApDataSourceMenuItem
} from './app/dataSource/acapBuildDataSourceMenu.js'
export { acapInvokeDataSourceMenuAction } from './app/dataSource/acapInvokeDataSourceMenuAction.js'
export { acapOpenCenteredPopup } from './app/dataSource/acapOpenCenteredPopup.js'
export {
  acedApplyUiTheme,
  acedSubscribeUiTheme,
  type AcEdApplyUiThemeOptions,
  type AcEdUiTheme,
  resolveUiTheme
} from './editor/global/AcEdUiTheme.js'
export { AcEdOpenMode } from './editor/view/AcEdOpenMode.js'
export {
  AcApI18n,
  type AcApLocale,
  type AcApLocaleChangedEventArgs,
  type AcApLocaleMessage,
  type AcApLocaleMessages,
  type AcApTranslateOptions
} from './i18n/AcApI18n.js'
export {
  AcUiFileOpenLanding,
  acuiAttachDataSources,
  type AcUiFileOpenLandingOptions,
  type AcUiFileOpenRequest
} from './ui/AcUiFileOpenLanding.js'
export {
  AcUiFileOpenPanel,
  type AcUiFileOpenPanelCardSize,
  type AcUiFileOpenPanelOptions,
  type AcUiFileOpenPanelResult
} from './ui/AcUiFileOpenPanel.js'
export {
  AcUiFileOpenSession,
  acuiCreateFileOpenSession,
  type AcUiFileOpenDocManager,
  type AcUiFileOpenSessionOptions,
  type AcUiFileOpenSessionResult
} from './ui/AcUiFileOpenSession.js'
