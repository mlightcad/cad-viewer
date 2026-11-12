/**
 * Shared stubs for {@link AcApSimpleUiChrome} unit tests (used from Jest mock factories).
 */

export const mockCommands = new Map<string, unknown>()
export const mockCurView: { container?: HTMLElement } = {}

/** @returns Stable extras object wired to {@link mockCommands} / {@link mockCurView}. */
export function getChromeMockExtras() {
  return {
    mockCommands,
    mockCurView,
    extras: {
      acedIsMobileUiLayout: () => false,
      acedIsCompactUiLayout: () => false,
      AcApDocManager: {
        instance: {
          get curView() {
            return mockCurView.container
              ? { container: mockCurView.container }
              : undefined
          },
          get curDocument() {
            return { database: {} }
          },
          events: {
            documentActivated: {
              addEventListener: jest.fn(),
              removeEventListener: jest.fn()
            },
            documentToBeOpened: {
              addEventListener: jest.fn(),
              removeEventListener: jest.fn()
            }
          },
          sendStringToExecute: jest.fn()
        }
      },
      AcApI18n: {
        t: (_key: string, opts?: { fallback?: string }) => opts?.fallback ?? _key,
        mergeLocaleMessage: jest.fn(),
        events: {
          localeChanged: {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
          }
        },
        currentLocale: 'en',
        setCurrentLocale: jest.fn()
      },
      AcApPaletteService: { setHost: jest.fn() },
      AcApSettingManager: {
        instance: {
          set: jest.fn(),
          clearSessionOverride: jest.fn()
        }
      },
      isMarkupVisible: () => true,
      isMeasurementVisible: () => true,
      AcEdCommand: class {},
      AcEdCommandStack: class {
        static SYSTEMT_COMMAND_GROUP_NAME = 'SYSTEM'
        addCommand(
          group: string,
          name: string,
          _globalName: string,
          command: unknown
        ) {
          mockCommands.set(`${group}:${name}`, command)
        }
        removeCmd(group: string, name: string) {
          mockCommands.delete(`${group}:${name}`)
        }
      },
      acapBindToolbarDocState: (tb: { setDocState: (s: object) => void }) => {
        tb.setDocState({
          hasDocument: true,
          isOpening: false,
          openMode: 8
        })
        return () => undefined
      },
      acedApplyUiTheme: jest.fn(),
      isLightColorTheme: jest.fn(() => false),
      eventBus: {
        on: jest.fn(),
        off: jest.fn()
      },
      getMarkupStore: () => ({
        list: () => [],
        selectedId: undefined,
        subscribe: () => () => undefined,
        updateMeta: jest.fn()
      }),
      getMarkupPresenter: () => ({
        select: jest.fn(),
        focus: jest.fn(),
        unpublish: jest.fn(),
        publish: jest.fn(),
        clearVisuals: jest.fn()
      }),
      runMarkupEdit: (_view: unknown, _label: string, mutate: () => void) => {
        mutate()
      },
      MARKUP_STATUSES: ['open', 'question', 'answered', 'closed'],
      listLayoutMeasurements: () => [],
      getMeasurementValueText: () => '',
      getSelectedMeasurementId: () => undefined,
      subscribeMeasurements: () => () => undefined,
      subscribeMeasurementSelection: () => () => undefined,
      focusMeasurement: jest.fn(),
      removeMeasurement: jest.fn(),
      clearLayoutMeasurements: jest.fn()
    }
  }
}
