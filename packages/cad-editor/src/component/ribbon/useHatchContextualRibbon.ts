import { CircleClose } from '@element-plus/icons-vue'
import type { AcEdCommandEventArgs } from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'
import type {
  RibbonGalleryCategoryModel,
  RibbonTabModel
} from '@mlightcad/ribbon'
import { type Ref, ref } from 'vue'

import { hatchRibbonCommand, type HatchRibbonStyle } from '../../command'
import { useRibbonContextualTab } from '../../composable'
import { hatch, hatchAssociative, qselect } from '../../svg'
import {
  DEFAULT_HATCH_PATTERN_OPTIONS,
  type HatchPatternOption,
  resolveHatchPatternPreviewSvg
} from '../common/hatchPatternPreview'
import MlRibbonHatchColorRow2 from './MlRibbonHatchColorRow2.vue'
import MlRibbonHatchColorRow3 from './MlRibbonHatchColorRow3.vue'

const HATCH_CONTEXTUAL_TAB_ID = 'hatch-context'
const HATCH_COMMAND_GLOBAL_NAME = 'HATCH'
const hatchPatternOptions: HatchPatternOption[] = [
  ...DEFAULT_HATCH_PATTERN_OPTIONS
]

/**
 * Converts ribbon color payloads into the CAD color model expected by the
 * hatch color controls.
 *
 * The hatch command state can expose colors as existing `AcCmColor` instances,
 * serialized CAD color strings, or CSS hex values. Values that cannot be
 * interpreted as a hatch color are ignored so the custom color rows can render
 * an empty/unchanged selection.
 *
 * @param value Raw color value stored in the hatch command state.
 * @returns A normalized `AcCmColor`, or `undefined` when the value is invalid.
 */
const toColorValue = (value: unknown) => {
  if (value instanceof AcCmColor) return value
  if (typeof value !== 'string') return undefined
  const parsed = AcCmColor.fromString(value)
  if (parsed) return parsed
  if (value.trim().startsWith('#')) {
    return new AcCmColor().setRGBFromCss(value)
  }
  return undefined
}

/**
 * Options required to coordinate the hatch contextual ribbon with the shared
 * ribbon tab state.
 */
interface UseHatchContextualRibbonOptions {
  /** Currently active ribbon tab id shared by the main ribbon shell. */
  activeTabId: Ref<string>
  /**
   * Optional callback used when the close button exits a selection-driven hatch
   * context instead of an active HATCH command.
   */
  clearSelection?: () => void
}

/**
 * Minimal translation callback used while constructing ribbon model labels.
 *
 * @param key Locale message key.
 * @returns Localized string for the active locale.
 */
type Translate = (key: string) => string

/**
 * Builds the gallery category model used by the hatch pattern picker.
 *
 * Pattern ids are emitted with the `hatch-pattern:` prefix because the ribbon
 * item dispatcher routes all pattern selections through a single handler.
 *
 * @param title Display title for the hatch pattern category.
 * @returns A ribbon gallery category containing every supported hatch pattern.
 */
const buildHatchPatternGalleryCategories = (
  title: string
): RibbonGalleryCategoryModel[] => [
  {
    id: 'hatch-patterns',
    title,
    items: hatchPatternOptions.map(option => {
      const patternName = option.value.trim().toUpperCase()
      return {
        id: `hatch-pattern:${patternName}`,
        label: option.label ?? patternName,
        previewSvg: resolveHatchPatternPreviewSvg(patternName)
      }
    })
  }
]

/**
 * Creates the contextual ribbon controller for the HATCH workflow.
 *
 * The controller keeps the hatch contextual tab visible while either the HATCH
 * command is running or the current selection consists of hatch entities. It
 * also translates ribbon item ids into hatch command mutations and rebuilds the
 * tab model from the latest command state.
 *
 * @param options Shared tab state and optional selection clearing hook.
 * @returns Handlers and state consumed by the ribbon command host.
 */
export function useHatchContextualRibbon({
  activeTabId,
  clearSelection
}: UseHatchContextualRibbonOptions) {
  const {
    isVisible,
    isCommandActive,
    hideContextTab,
    showContextTab,
    handleCommandWillStart,
    isContextCommand
  } = useRibbonContextualTab({
    activeTabId,
    tabId: HATCH_CONTEXTUAL_TAB_ID,
    commandGlobalNames: HATCH_COMMAND_GLOBAL_NAME
  })
  const hatchState = hatchRibbonCommand.state
  const isSelectionContextActive = ref(false)

  /**
   * Reconciles contextual tab visibility with the command and selection modes.
   *
   * Command mode takes effect while HATCH is active; selection mode keeps the
   * same tab available for editing hatch entities after command completion.
   */
  const refreshContextTabVisibility = () => {
    if (isCommandActive.value || isSelectionContextActive.value) {
      showContextTab()
      return
    }
    hideContextTab()
  }

  /**
   * Handles CAD command completion events for the HATCH contextual tab.
   *
   * @param args Command event payload raised by the CAD command manager.
   */
  const handleCommandEnded = (args: AcEdCommandEventArgs) => {
    if (!isContextCommand(args)) return
    isCommandActive.value = false
    refreshContextTabVisibility()
  }

  /**
   * Updates whether the contextual tab should stay visible for hatch selection.
   *
   * @param active Whether the current selection should expose hatch editing UI.
   */
  const handleSelectionContextChanged = (active: boolean) => {
    isSelectionContextActive.value = active
    refreshContextTabVisibility()
  }

  /**
   * Extracts a numeric value from a prefixed hatch ribbon item id.
   *
   * Input number controls emit ids such as `hatch-scale:2.5`; this helper keeps
   * the parsing and invalid-value handling consistent for scale, angle, and
   * opacity controls.
   *
   * @param itemId Ribbon item id emitted by a numeric hatch control.
   * @param prefix Item id prefix that identifies the target hatch property.
   * @returns Parsed number, or `undefined` when the id does not match or parse.
   */
  const parseHatchNumberValue = (itemId: string, prefix: string) => {
    if (!itemId.startsWith(prefix)) return undefined
    const raw = itemId.slice(prefix.length)
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  /**
   * Routes hatch contextual ribbon item clicks to the hatch command facade.
   *
   * The ribbon emits string ids rather than calling command APIs directly. This
   * dispatcher owns the id contract for boundary picking, pattern/fill changes,
   * color edits, numeric property edits, associativity, and close behavior.
   *
   * @param itemId Ribbon item id emitted by the hatch contextual tab.
   * @returns `true` when the item id belongs to this contextual tab.
   */
  const handleItem = (itemId: string) => {
    if (itemId === 'hatch-boundary-pick') {
      hatchRibbonCommand.requestPickPoints()
      return true
    }
    if (itemId === 'hatch-boundary-select') {
      hatchRibbonCommand.requestSelectObjects()
      return true
    }
    if (itemId === 'hatch-close') {
      if (isCommandActive.value) {
        hatchRibbonCommand.close()
      } else {
        clearSelection?.()
        handleSelectionContextChanged(false)
      }
      return true
    }
    if (itemId.startsWith('hatch-pattern:')) {
      hatchRibbonCommand.setPatternNameFromGallery(
        itemId.slice('hatch-pattern:'.length)
      )
      return true
    }
    if (itemId.startsWith('hatch-fillType:')) {
      const value = itemId.slice('hatch-fillType:'.length)
      if (value === 'solid' || value === 'pattern' || value === 'gradient') {
        hatchRibbonCommand.setFillType(value)
      }
      return true
    }
    if (itemId.startsWith('hatch-fillColor:')) {
      const value = itemId.slice('hatch-fillColor:'.length)
      hatchRibbonCommand.setFillColor(value)
      return true
    }
    if (itemId.startsWith('hatch-backgroundColor:')) {
      const value = itemId.slice('hatch-backgroundColor:'.length)
      hatchRibbonCommand.setBackgroundColor(value)
      return true
    }
    if (itemId.startsWith('hatch-gradient2Color:')) {
      const value = itemId.slice('hatch-gradient2Color:'.length)
      hatchRibbonCommand.setGradient2Color(value)
      return true
    }
    if (itemId.startsWith('hatch-style:')) {
      const value = itemId.slice('hatch-style:'.length)
      if (value === 'Normal' || value === 'Outer' || value === 'Ignore') {
        hatchRibbonCommand.setStyle(value as HatchRibbonStyle)
      }
      return true
    }
    if (itemId === 'hatch-associative-on') {
      hatchRibbonCommand.setAssociative(true)
      return true
    }
    if (itemId === 'hatch-associative-off') {
      hatchRibbonCommand.setAssociative(false)
      return true
    }

    const scale = parseHatchNumberValue(itemId, 'hatch-scale:')
    if (scale != null && scale > 0) {
      hatchRibbonCommand.setPatternScale(scale)
      return true
    }

    const angle = parseHatchNumberValue(itemId, 'hatch-angle:')
    if (angle != null) {
      hatchRibbonCommand.setPatternAngle(angle)
      return true
    }

    const opacity = parseHatchNumberValue(itemId, 'hatch-opacity:')
    if (opacity != null) {
      hatchRibbonCommand.setOpacity(opacity)
      return true
    }

    return false
  }

  /**
   * Builds the current hatch contextual ribbon tab model.
   *
   * The hatch command state is refreshed from CAD system variables before the
   * model is created so defaults such as pattern, color, scale, and opacity are
   * reflected immediately when the tab is rendered.
   *
   * @param t Translation callback used for all user-facing labels.
   * @returns Ribbon tab model consumed by the ribbon renderer.
   */
  const buildContextualTab = (t: Translate): RibbonTabModel => {
    hatchRibbonCommand.syncStateFromSysVars()

    return {
      id: HATCH_CONTEXTUAL_TAB_ID,
      title: t('main.ribbon.tab.hatchContext'),
      contextual: true,
      contextualMode: isCommandActive.value ? 'exclusive' : 'selection',
      contextualColor: '#2a6ebf',
      visible: isVisible.value,
      groups: [
        {
          id: 'hatch-boundary-group',
          title: t('main.ribbon.hatch.group.boundary'),
          orientation: 'row',
          collections: [
            {
              id: 'hatch-boundary-main',
              layout: 'row',
              items: [
                {
                  id: 'hatch-boundary-pick',
                  type: 'button',
                  label: t('main.ribbon.hatch.command.pickPoints'),
                  tooltip: t('main.ribbon.hatch.tooltip.pickPoints'),
                  size: 'large',
                  props: { icon: hatch }
                },
                {
                  id: 'hatch-boundary-select',
                  type: 'button',
                  label: t('main.ribbon.hatch.command.selectObjects'),
                  tooltip: t('main.ribbon.hatch.tooltip.selectObjects'),
                  size: 'large',
                  props: { icon: qselect }
                }
              ]
            }
          ]
        },
        {
          id: 'hatch-pattern-group',
          title: t('main.ribbon.hatch.group.pattern'),
          orientation: 'row',
          collections: [
            {
              id: 'hatch-pattern-main',
              layout: 'row',
              items: [
                {
                  id: 'hatch-pattern',
                  type: 'gallery',
                  tooltip: t('main.ribbon.hatch.tooltip.pattern'),
                  size: 'large',
                  props: {
                    modelValue: `hatch-pattern:${hatchState.patternName
                      .trim()
                      .toUpperCase()}`,
                    inlineItemLimit: 4,
                    categories: buildHatchPatternGalleryCategories(
                      t('main.ribbon.hatch.field.pattern')
                    )
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'hatch-properties-group',
          title: t('main.ribbon.hatch.group.properties'),
          orientation: 'row',
          collections: [
            {
              id: 'hatch-properties-column1',
              layout: 'column',
              items: [
                {
                  id: 'hatch-fillType',
                  type: 'comboBox',
                  label: t('main.ribbon.hatch.field.fillType'),
                  tooltip: t('main.ribbon.hatch.tooltip.fillType'),
                  size: 'small',
                  props: {
                    width: '132px',
                    modelValue: `hatch-fillType:${hatchState.fillType}`,
                    emitValueOnChange: true,
                    options: [
                      {
                        label: t('main.ribbon.hatch.fillType.solid'),
                        value: 'hatch-fillType:solid'
                      },
                      {
                        label: t('main.ribbon.hatch.fillType.pattern'),
                        value: 'hatch-fillType:pattern'
                      },
                      {
                        label: t('main.ribbon.hatch.fillType.gradient'),
                        value: 'hatch-fillType:gradient'
                      }
                    ]
                  }
                },
                {
                  id: 'hatch-color-row2',
                  type: 'custom',
                  label:
                    hatchState.fillType === 'solid'
                      ? t('main.ribbon.hatch.field.fillColor')
                      : hatchState.fillType === 'pattern'
                        ? t('main.ribbon.hatch.field.patternColor')
                        : t('main.ribbon.hatch.field.gradient1Color'),
                  tooltip:
                    hatchState.fillType === 'solid'
                      ? t('main.ribbon.hatch.tooltip.fillColor')
                      : hatchState.fillType === 'pattern'
                        ? t('main.ribbon.hatch.tooltip.patternColor')
                        : t('main.ribbon.hatch.tooltip.gradient1Color'),
                  size: 'small',
                  props: {
                    component: MlRibbonHatchColorRow2,
                    componentProps: {
                      modelValue: toColorValue(hatchState.fillColor),
                      fillType: hatchState.fillType,
                      controlWidth: '108px'
                    }
                  }
                },
                {
                  id: 'hatch-color-row3',
                  type: 'custom',
                  label:
                    hatchState.fillType === 'solid'
                      ? ''
                      : hatchState.fillType === 'pattern'
                        ? t('main.ribbon.hatch.field.backgroundColor')
                        : t('main.ribbon.hatch.field.gradient2Color'),
                  tooltip:
                    hatchState.fillType === 'solid'
                      ? ''
                      : hatchState.fillType === 'pattern'
                        ? t('main.ribbon.hatch.tooltip.backgroundColor')
                        : t('main.ribbon.hatch.tooltip.gradient2Color'),
                  size: 'small',
                  props: {
                    component: MlRibbonHatchColorRow3,
                    componentProps: {
                      backgroundColorValue: toColorValue(
                        hatchState.backgroundColor
                      ),
                      gradient2ColorValue: toColorValue(
                        hatchState.gradient2Color
                      ),
                      fillType: hatchState.fillType,
                      controlWidth: '108px'
                    }
                  }
                }
              ]
            },
            {
              id: 'hatch-properties-column2',
              layout: 'column',
              items: [
                {
                  id: 'hatch-opacity',
                  type: 'inputNumber',
                  label: t('main.ribbon.hatch.field.opacity'),
                  tooltip: t('main.ribbon.hatch.tooltip.opacity'),
                  size: 'small',
                  props: {
                    width: '108px',
                    modelValue: hatchState.opacity,
                    min: 0,
                    max: 90,
                    step: 10,
                    emitValueOnChange: true,
                    valuePrefix: 'hatch-opacity:'
                  }
                },
                {
                  id: 'hatch-angle',
                  type: 'inputNumber',
                  label: t('main.ribbon.hatch.field.angle'),
                  tooltip: t('main.ribbon.hatch.tooltip.angle'),
                  size: 'small',
                  props: {
                    width: '108px',
                    modelValue: hatchState.patternAngle,
                    step: 15,
                    emitValueOnChange: true,
                    valuePrefix: 'hatch-angle:'
                  }
                },
                {
                  id: 'hatch-scale',
                  type: 'inputNumber',
                  label: t('main.ribbon.hatch.field.scale'),
                  tooltip: t('main.ribbon.hatch.tooltip.scale'),
                  size: 'small',
                  props: {
                    width: '108px',
                    modelValue: hatchState.patternScale,
                    min: 0.1,
                    step: 0.5,
                    emitValueOnChange: true,
                    valuePrefix: 'hatch-scale:'
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'hatch-options-group',
          title: t('main.ribbon.hatch.group.options'),
          orientation: 'row',
          collections: [
            {
              id: 'hatch-options-main',
              layout: 'row',
              items: [
                {
                  id: 'hatch-associative',
                  type: 'toggle',
                  label: t('main.ribbon.hatch.field.associative'),
                  tooltip: t('main.ribbon.hatch.tooltip.associative'),
                  size: 'large',
                  props: {
                    modelValue: hatchState.associative,
                    activeIcon: hatchAssociative,
                    inactiveIcon: hatchAssociative,
                    activeLabel: t('main.ribbon.hatch.field.associative'),
                    inactiveLabel: t('main.ribbon.hatch.field.associative'),
                    activeValue: 'hatch-associative-on',
                    inactiveValue: 'hatch-associative-off'
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'hatch-close-group',
          title: t('main.ribbon.hatch.group.close'),
          orientation: 'row',
          collections: [
            {
              id: 'hatch-close-main',
              layout: 'row',
              items: [
                {
                  id: 'hatch-close',
                  type: 'button',
                  label: t('main.ribbon.hatch.command.close'),
                  tooltip: t('main.ribbon.hatch.tooltip.close'),
                  size: 'large',
                  props: { icon: CircleClose }
                }
              ]
            }
          ]
        }
      ]
    }
  }

  return {
    isVisible,
    isCommandActive,
    handleCommandWillStart,
    handleCommandEnded,
    handleSelectionContextChanged,
    handleItem,
    buildContextualTab
  }
}
