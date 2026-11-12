/**
 * Single import surface for simple-ui → core, so Jest can mock one module.
 * Production code still tree-shakes through these re-exports.
 */
export {
  ACAP_PALETTE_NAMED_TAB,
  AcApContext,
  AcApDocManager,
  type AcApPaletteHost,
  type AcApPaletteNamedTabId,
  AcApPaletteService,
  AcApSettingManager
} from '../app'
export {
  acapBuildDataSourceMenu,
  acapIsSingleLocalOpen
} from '../app/dataSource/acapBuildDataSourceMenu'
export { acapRunDataSourceMenuAction } from '../app/dataSource/acapRunDataSourceMenuAction'
export type { AcApLayerInfo } from '../service'
export { AcApLayerStore } from '../service'
export {
  type AcApMeasurementRecord,
  type AcApMeasurementType,
  type AcApMarkupRecord,
  type AcApMarkupStatus,
  type AcApMarkupType,
  clearLayoutMeasurements,
  focusMeasurement,
  getMarkupPresenter,
  getMarkupStore,
  getMeasurementValueText,
  getSelectedMeasurementId,
  isMarkupVisible,
  isMeasurementVisible,
  listLayoutMeasurements,
  MARKUP_STATUSES,
  removeMeasurement,
  runMarkupEdit,
  subscribeMeasurements,
  subscribeMeasurementSelection
} from '../command'
export {
  AcEdCommand,
  AcEdCommandStack,
  AcEdOpenMode,
  type AcEdUiLayoutKind,
  type AcEdUiTheme,
  acedApplyUiTheme,
  acedGetUiLayout,
  acedSubscribeUiLayout,
  eventBus,
  isLightColorTheme
} from '../editor'
export { AcApI18n, type AcApLocale } from '../i18n'
export type { AcApPlugin } from '../plugin'
export type { AcApPluginManager } from '../plugin'
export {
  type AcApFindNavigateResult,
  type AcApFindViewInsets,
  acapNavigateToFindHit
} from '../find/AcApFindNavigator'
export { acapBindToolbarDocState } from '../command'
export {
  AcUiDockPanel,
  type AcUiDockPanelTab,
  AcUiToolbar,
  type AcUiToolbarMountOptions,
  type AcUiAciIndexPicker,
  acuiCreateAciIndexPicker,
  acuiCopyDynamicToolbarChildren,
  acuiCreateToolbarSeparator,
  acuiEnsureToolbarStyles,
  acuiExpandToolbarItemConfigs,
  acuiFilterVisibleToolbarItems,
  acuiIndexToolbarItems,
  acuiIsDynamicToolbarChildren,
  acuiIsToolbarChildrenStrip,
  acuiIsToolbarItemDisabled,
  acuiIsToolbarItemVisible,
  acuiIsToolbarPresetRef,
  acuiIsToolbarSeparatorItem,
  acuiItemRequiresDocument,
  acuiPreserveDynamicToolbarChildren,
  acuiRemoveToolbarStylesIfUnused,
  acuiResolveEffectiveToolbarItem,
  acuiResolveParentToolbarDisplay,
  acuiResolveSelectedChildItem,
  acuiResolveToolbarChildrenUi,
  acuiResolveToolbarChrome,
  type AcUiResolvedToolbarChrome,
  acuiToolbarItemsIncludeItem,
  acuiToolbarPreset,
  type AcUiDockPanelSide,
  type AcUiSubToolbarOptions,
  type AcUiSubToolbarPosition,
  type AcUiToolbarChildIconMode,
  type AcUiToolbarChildrenUi,
  type AcUiToolbarChromeOptions,
  type AcUiToolbarDocState,
  type AcUiToolbarI18n,
  type AcUiToolbarItem,
  type AcUiToolbarItemConfig,
  type AcUiToolbarOptions,
  type AcUiToolbarOverflow,
  type AcUiToolbarPlacement,
  type AcUiToolbarPresetRef,
  type AcUiToolbarSeparator,
  type AcUiToolbarSize
} from '../ui'
