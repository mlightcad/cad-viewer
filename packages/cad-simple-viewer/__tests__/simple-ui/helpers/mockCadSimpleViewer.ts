/**
 * Shared Jest mock pieces for `@mlightcad/cad-simple-viewer`.
 *
 * After the AcUi toolbar engine moved into cad-simple-viewer, plugin sources
 * re-export toolbar helpers / call `acuiEnsureToolbarStyles` from that package.
 * Incomplete mocks omit those exports and fail with "is not a function", while
 * loading the real package dist hits ESM parse errors — so tests should
 * `requireActual` the TypeScript toolbar (and layout) sources instead.
 *
 * Use inside `jest.mock` factories via `require('./helpers/mockCadSimpleViewer')`
 * (not ESM import — factories are hoisted).
 */

export type CadSimpleViewerMockExtras = Record<string, unknown>

export type CreateCadSimpleViewerMockOptions = {
  /** Spread `AcEdUiLayout` actuals (default true). */
  includeLayout?: boolean
  /** Spread `ui/toolbar` actuals (default true). */
  includeToolbar?: boolean
  /** Spread `ui/dock` actuals (default true). */
  includeDock?: boolean
}

/**
 * Base mock for `@mlightcad/cad-simple-viewer` with toolbar + layout + dock actuals.
 *
 * @param extras - Test-specific stubs (DocManager, I18n, etc.); win over actuals.
 * @param options - Toggle which actual modules to spread.
 */
export function createCadSimpleViewerMock(
  extras: CadSimpleViewerMockExtras = {},
  options: CreateCadSimpleViewerMockOptions = {}
): Record<string, unknown> {
  const includeLayout = options.includeLayout !== false
  const includeToolbar = options.includeToolbar !== false
  const includeDock = options.includeDock !== false

  const layout = includeLayout
    ? (jest.requireActual(
        '../../../src/editor/global/AcEdUiLayout'
      ) as typeof import('../../../src/editor/global/AcEdUiLayout'))
    : {}

  const toolbar = includeToolbar
    ? (jest.requireActual(
        '../../../src/ui/toolbar'
      ) as typeof import('../../../src/ui/toolbar'))
    : {}

  const dock = includeDock
    ? (jest.requireActual(
        '../../../src/ui/dock'
      ) as typeof import('../../../src/ui/dock'))
    : {}

  const openMode = jest.requireActual(
    '../../../src/editor/view/AcEdOpenMode'
  ) as typeof import('../../../src/editor/view/AcEdOpenMode')

  return {
    ...layout,
    ...toolbar,
    ...dock,
    AcEdOpenMode: openMode.AcEdOpenMode,
    ...extras
  }
}

/** Jest mock factory for `src/app` imports in simple-ui tests. */
export function mockAppModule(extras: CadSimpleViewerMockExtras = {}) {
  const paletteActual = jest.requireActual(
    '../../../src/app/AcApPaletteService'
  ) as typeof import('../../../src/app/AcApPaletteService')
  return {
    ACAP_PALETTE_NAMED_TAB: paletteActual.ACAP_PALETTE_NAMED_TAB,
    AcApDocManager: extras.AcApDocManager,
    AcApPaletteService: extras.AcApPaletteService ?? { setHost: jest.fn() },
    AcApSettingManager: extras.AcApSettingManager,
    AcApContext: extras.AcApContext ?? class {}
  }
}

/** Jest mock factory for `src/editor` imports in simple-ui tests. */
export function mockEditorModule(extras: CadSimpleViewerMockExtras = {}) {
  const layout = jest.requireActual(
    '../../../src/editor/global/AcEdUiLayout'
  ) as typeof import('../../../src/editor/global/AcEdUiLayout')
  const openMode = jest.requireActual(
    '../../../src/editor/view/AcEdOpenMode'
  ) as typeof import('../../../src/editor/view/AcEdOpenMode')
  return {
    ...layout,
    AcEdCommand: extras.AcEdCommand ?? class {},
    AcEdCommandStack: extras.AcEdCommandStack,
    AcEdOpenMode: extras.AcEdOpenMode ?? openMode.AcEdOpenMode,
    acedApplyUiTheme: extras.acedApplyUiTheme ?? jest.fn(),
    acedGetUiLayout: extras.acedGetUiLayout ?? layout.acedGetUiLayout,
    acedSubscribeUiLayout:
      extras.acedSubscribeUiLayout ?? layout.acedSubscribeUiLayout,
    eventBus: extras.eventBus ?? { on: jest.fn(), off: jest.fn() },
    isLightColorTheme: extras.isLightColorTheme ?? jest.fn(() => false)
  }
}

/** Jest mock factory for `src/command` barrel imports in palette tests. */
export function mockCommandModule(extras: CadSimpleViewerMockExtras = {}) {
  return {
    clearLayoutMeasurements: extras.clearLayoutMeasurements ?? jest.fn(),
    focusMeasurement: extras.focusMeasurement ?? jest.fn(),
    getMarkupPresenter: extras.getMarkupPresenter,
    getMarkupStore: extras.getMarkupStore,
    getMeasurementValueText: extras.getMeasurementValueText ?? (() => ''),
    getSelectedMeasurementId: extras.getSelectedMeasurementId,
    isMarkupVisible: extras.isMarkupVisible ?? (() => true),
    isMeasurementVisible: extras.isMeasurementVisible ?? (() => true),
    listLayoutMeasurements: extras.listLayoutMeasurements ?? (() => []),
    MARKUP_STATUSES: extras.MARKUP_STATUSES ?? [
      'open',
      'question',
      'answered',
      'closed'
    ],
    removeMeasurement: extras.removeMeasurement ?? jest.fn(),
    runMarkupEdit: extras.runMarkupEdit,
    subscribeMeasurements:
      extras.subscribeMeasurements ?? (() => () => undefined),
    subscribeMeasurementSelection:
      extras.subscribeMeasurementSelection ?? (() => () => undefined)
  }
}

/** Jest mock factory for `src/i18n` imports in simple-ui tests. */
export function mockI18nModule(extras: CadSimpleViewerMockExtras = {}) {
  return {
    AcApI18n: extras.AcApI18n
  }
}

/** Jest mock factory for {@link acapBindToolbarDocState}. */
export function mockToolbarDocBindModule(extras: CadSimpleViewerMockExtras = {}) {
  return {
    acapBindToolbarDocState:
      extras.acapBindToolbarDocState ??
      ((_tb: { setDocState: (s: object) => void }) => () => undefined)
  }
}
