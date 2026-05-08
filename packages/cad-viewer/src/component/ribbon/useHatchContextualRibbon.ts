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

interface UseHatchContextualRibbonOptions {
  activeTabId: Ref<string>
  clearSelection?: () => void
}

type Translate = (key: string) => string

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

  const refreshContextTabVisibility = () => {
    if (isCommandActive.value || isSelectionContextActive.value) {
      showContextTab()
      return
    }
    hideContextTab()
  }

  const handleCommandEnded = (args: AcEdCommandEventArgs) => {
    if (!isContextCommand(args)) return
    isCommandActive.value = false
    refreshContextTabVisibility()
  }

  const handleSelectionContextChanged = (active: boolean) => {
    isSelectionContextActive.value = active
    refreshContextTabVisibility()
  }

  const parseHatchNumberValue = (itemId: string, prefix: string) => {
    if (!itemId.startsWith(prefix)) return undefined
    const raw = itemId.slice(prefix.length)
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }

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

  const buildContextualTab = (t: Translate): RibbonTabModel => {
    hatchRibbonCommand.syncStateFromSysVars()

    return {
      id: HATCH_CONTEXTUAL_TAB_ID,
      title: t('main.ribbon.tab.hatchContext'),
      contextual: true,
      contextualMode: isCommandActive.value ? 'exclusive' : 'selection',
      contextualColor: '#2a6ebf',
      contextualTitle: t('main.ribbon.hatch.contextTitle'),
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
