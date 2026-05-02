import { CircleClose } from '@element-plus/icons-vue'
import type { RibbonTabModel } from '@mlightcad/ribbon'
import type { Ref } from 'vue'

import { hatchRibbonCommand, type HatchRibbonStyle } from '../../command'
import { useRibbonContextualTab } from '../../composable'
import { hatch, qselect } from '../../svg'
import {
  DEFAULT_HATCH_PATTERN_OPTIONS,
  type HatchPatternOption
} from '../common/hatchPatternPreview'
import MlRibbonHatchPatternButton from './MlRibbonHatchPatternButton.vue'

const HATCH_CONTEXTUAL_TAB_ID = 'hatch-context'
const HATCH_COMMAND_GLOBAL_NAME = 'HATCH'
const hatchPatternOptions: HatchPatternOption[] = [
  ...DEFAULT_HATCH_PATTERN_OPTIONS
]
const hatchScaleOptions = [0.5, 1, 2, 5, 10]
const hatchAngleOptions = [0, 15, 30, 45, 60, 90]

interface UseHatchContextualRibbonOptions {
  activeTabId: Ref<string>
}

type Translate = (key: string) => string

export function useHatchContextualRibbon({
  activeTabId
}: UseHatchContextualRibbonOptions) {
  const {
    isVisible,
    isCommandActive,
    hideContextTab,
    handleCommandWillStart,
    handleCommandEnded
  } = useRibbonContextualTab({
    activeTabId,
    tabId: HATCH_CONTEXTUAL_TAB_ID,
    commandGlobalNames: HATCH_COMMAND_GLOBAL_NAME
  })
  const hatchState = hatchRibbonCommand.state

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
      hatchRibbonCommand.close()
      hideContextTab()
      return true
    }
    if (itemId.startsWith('hatch-pattern:')) {
      hatchRibbonCommand.setPatternName(itemId.slice('hatch-pattern:'.length))
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

    return false
  }

  const buildContextualTab = (t: Translate): RibbonTabModel => ({
    id: HATCH_CONTEXTUAL_TAB_ID,
    title: t('main.ribbon.tab.hatchContext'),
    contextual: true,
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
                type: 'custom',
                label: t('main.ribbon.hatch.field.pattern'),
                tooltip: t('main.ribbon.hatch.tooltip.pattern'),
                size: 'large',
                props: {
                  component: MlRibbonHatchPatternButton,
                  componentProps: {
                    modelValue: hatchState.patternName,
                    options: hatchPatternOptions,
                    label: t('main.ribbon.hatch.field.pattern')
                  }
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
            id: 'hatch-properties-main',
            layout: 'row',
            items: [
              {
                id: 'hatch-scale',
                type: 'comboBox',
                label: t('main.ribbon.hatch.field.scale'),
                tooltip: t('main.ribbon.hatch.tooltip.scale'),
                size: 'small',
                props: {
                  width: '108px',
                  modelValue: `hatch-scale:${hatchState.patternScale}`,
                  emitValueOnChange: true,
                  options: hatchScaleOptions.map(item => ({
                    label: String(item),
                    value: `hatch-scale:${item}`
                  }))
                }
              },
              {
                id: 'hatch-angle',
                type: 'comboBox',
                label: t('main.ribbon.hatch.field.angle'),
                tooltip: t('main.ribbon.hatch.tooltip.angle'),
                size: 'small',
                props: {
                  width: '108px',
                  modelValue: `hatch-angle:${hatchState.patternAngle}`,
                  emitValueOnChange: true,
                  options: hatchAngleOptions.map(item => ({
                    label: String(item),
                    value: `hatch-angle:${item}`
                  }))
                }
              },
              {
                id: 'hatch-style',
                type: 'comboBox',
                label: t('main.ribbon.hatch.field.style'),
                tooltip: t('main.ribbon.hatch.tooltip.style'),
                size: 'small',
                props: {
                  width: '124px',
                  modelValue: `hatch-style:${hatchState.style}`,
                  emitValueOnChange: true,
                  options: [
                    {
                      label: t('main.ribbon.hatch.style.normal'),
                      value: 'hatch-style:Normal'
                    },
                    {
                      label: t('main.ribbon.hatch.style.outer'),
                      value: 'hatch-style:Outer'
                    },
                    {
                      label: t('main.ribbon.hatch.style.ignore'),
                      value: 'hatch-style:Ignore'
                    }
                  ]
                }
              },
              {
                id: 'hatch-associative',
                type: 'toggle',
                label: t('main.ribbon.hatch.field.associative'),
                tooltip: t('main.ribbon.hatch.tooltip.associative'),
                size: 'small',
                props: {
                  modelValue: hatchState.associative,
                  activeLabel: t('main.ribbon.hatch.associative.on'),
                  inactiveLabel: t('main.ribbon.hatch.associative.off'),
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
  })

  return {
    isVisible,
    isCommandActive,
    handleCommandWillStart,
    handleCommandEnded,
    handleItem,
    buildContextualTab
  }
}
