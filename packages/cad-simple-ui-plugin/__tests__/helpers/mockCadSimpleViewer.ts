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
}

/**
 * Base mock for `@mlightcad/cad-simple-viewer` with toolbar + layout actuals.
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

  const layout = includeLayout
    ? (jest.requireActual(
        '../../../cad-simple-viewer/src/editor/global/AcEdUiLayout'
      ) as typeof import('../../../cad-simple-viewer/src/editor/global/AcEdUiLayout'))
    : {}

  const toolbar = includeToolbar
    ? (jest.requireActual(
        '../../../cad-simple-viewer/src/ui/toolbar'
      ) as typeof import('../../../cad-simple-viewer/src/ui/toolbar'))
    : {}

  return {
    ...layout,
    ...toolbar,
    ...extras
  }
}
