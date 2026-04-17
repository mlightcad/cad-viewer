<script setup lang="ts">
import '@mlightcad/ribbon/style.css'

import {
  CopyDocument,
  Expand,
  Grid,
  Operation,
  RefreshRight,
  ScaleToOriginal,
  Scissor,
  Switch
} from '@element-plus/icons-vue'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { MlRibbon, RibbonTabModel } from '@mlightcad/ribbon'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCommands, useDocOpenMode, useSettings } from '../../composable'
import { LocaleProp } from '../../locale'
import {
  arcCenterStartAngle,
  arcCenterStartEnd,
  arcCenterStartLength,
  arcStartCenterAngle,
  arcStartCenterEnd,
  arcStartCenterLength,
  arcStartEndAngle,
  arcStartEndDirection,
  arcStartEndRadius,
  arcThreePoints,
  circleCenterDiameter,
  circleCenterRadius,
  circleTanTanRadius,
  circleTanTanTan,
  circleThreePoints,
  circleTwoPoints,
  fullScreen,
  hatch,
  layer,
  line,
  move,
  pointstyle1,
  polyline,
  rect,
  setting
} from '../../svg'
import MlRibbonLanguageSelector from './MlRibbonLanguageSelector.vue'

interface Props {
  currentLocale?: LocaleProp
}

const props = withDefaults(defineProps<Props>(), {
  currentLocale: undefined
})

const features = useSettings()
const docOpenMode = useDocOpenMode()
const commands = useCommands()
const { t, locale } = useI18n()

const normalizeIdPart = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')

const buildBaseTabs = (): RibbonTabModel[] => [
  {
    id: 'home',
    title: 'Home',
    groups: [
      {
        id: 'home-draw',
        title: 'Draw',
        orientation: 'row',
        collections: [
          {
            id: 'home-draw-main',
            layout: 'row',
            items: [
              {
                id: 'cmd-line',
                type: 'button',
                label: t('main.ribbon.command.line'),
                size: 'large',
                props: { icon: line }
              },
              {
                id: 'cmd-polyline',
                type: 'button',
                label: t('main.ribbon.command.polyline'),
                size: 'large',
                props: { icon: polyline }
              },
              {
                id: 'cmd-circle',
                type: 'dropdown',
                label: t('main.ribbon.command.circle'),
                size: 'large',
                props: {
                  icon: circleCenterRadius,
                  options: [
                    {
                      value: 'circle-center-radius',
                      label: t('main.ribbon.circle.centerRadius'),
                      icon: circleCenterRadius
                    },
                    {
                      value: 'circle-center-diameter',
                      label: t('main.ribbon.circle.centerDiameter'),
                      icon: circleCenterDiameter
                    },
                    {
                      value: 'circle-2-point',
                      label: t('main.ribbon.circle.twoPoint'),
                      icon: circleTwoPoints
                    },
                    {
                      value: 'circle-3-point',
                      label: t('main.ribbon.circle.threePoint'),
                      icon: circleThreePoints
                    },
                    {
                      value: 'circle-tan-tan-radius',
                      label: t('main.ribbon.circle.tanTanRadius'),
                      icon: circleTanTanRadius
                    },
                    {
                      value: 'circle-tan-tan-tan',
                      label: t('main.ribbon.circle.tanTanTan'),
                      icon: circleTanTanTan
                    }
                  ]
                }
              },
              {
                id: 'cmd-arc',
                type: 'dropdown',
                label: t('main.ribbon.command.arc'),
                size: 'large',
                props: {
                  icon: arcThreePoints,
                  options: [
                    {
                      value: 'arc-3-point',
                      label: t('main.ribbon.arc.threePoint'),
                      icon: arcThreePoints
                    },
                    {
                      value: 'arc-start-center-end',
                      label: t('main.ribbon.arc.startCenterEnd'),
                      icon: arcStartCenterEnd
                    },
                    {
                      value: 'arc-start-center-angle',
                      label: t('main.ribbon.arc.startCenterAngle'),
                      icon: arcStartCenterAngle
                    },
                    {
                      value: 'arc-start-center-length',
                      label: t('main.ribbon.arc.startCenterLength'),
                      icon: arcStartCenterLength
                    },
                    {
                      value: 'arc-start-end-angle',
                      label: t('main.ribbon.arc.startEndAngle'),
                      icon: arcStartEndAngle
                    },
                    {
                      value: 'arc-start-end-direction',
                      label: t('main.ribbon.arc.startEndDirection'),
                      icon: arcStartEndDirection
                    },
                    {
                      value: 'arc-start-end-radius',
                      label: t('main.ribbon.arc.startEndRadius'),
                      icon: arcStartEndRadius
                    },
                    {
                      value: 'arc-center-start-end',
                      label: t('main.ribbon.arc.centerStartEnd'),
                      icon: arcCenterStartEnd
                    },
                    {
                      value: 'arc-center-start-angle',
                      label: t('main.ribbon.arc.centerStartAngle'),
                      icon: arcCenterStartAngle
                    },
                    {
                      value: 'arc-center-start-length',
                      label: t('main.ribbon.arc.centerStartLength'),
                      icon: arcCenterStartLength
                    }
                  ]
                }
              },
              {
                id: 'cmd-rect',
                type: 'dropdown',
                label: t('main.ribbon.command.rect'),
                size: 'large',
                props: {
                  icon: rect,
                  options: [
                    {
                      value: 'rectang',
                      label: t('main.ribbon.command.rectangle')
                    },
                    {
                      value: 'polygon',
                      label: t('main.ribbon.command.polygon')
                    }
                  ]
                }
              },
              {
                id: 'cmd-point',
                type: 'dropdown',
                label: t('main.ribbon.command.point'),
                size: 'large',
                props: {
                  icon: pointstyle1,
                  options: [
                    { value: 'point', label: t('main.ribbon.command.point') },
                    { value: 'divide', label: t('main.ribbon.command.divide') }
                  ]
                }
              },
              {
                id: 'cmd-hatch',
                type: 'dropdown',
                label: t('main.ribbon.command.hatch'),
                size: 'large',
                props: {
                  icon: hatch,
                  options: [
                    { value: 'hatch', label: t('main.ribbon.command.hatch') },
                    {
                      value: 'gradient',
                      label: t('main.ribbon.command.gradient')
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        id: 'home-modify',
        title: 'Modify',
        orientation: 'row',
        collections: [
          {
            id: 'home-modify-main',
            layout: 'row',
            items: [
              {
                id: 'cmd-move',
                type: 'button',
                label: t('main.ribbon.command.move'),
                size: 'large',
                props: { icon: move }
              },
              {
                id: 'cmd-copy',
                type: 'button',
                label: t('main.ribbon.command.copy'),
                size: 'large',
                props: { icon: CopyDocument }
              },
              {
                id: 'cmd-stretch',
                type: 'button',
                label: t('main.ribbon.command.stretch'),
                size: 'large',
                props: { icon: Expand }
              },
              {
                id: 'cmd-rotate',
                type: 'button',
                label: t('main.ribbon.command.rotate'),
                size: 'large',
                props: { icon: RefreshRight }
              },
              {
                id: 'cmd-mirror',
                type: 'button',
                label: t('main.ribbon.command.mirror'),
                size: 'large',
                props: { icon: Switch }
              },
              {
                id: 'cmd-scale',
                type: 'button',
                label: t('main.ribbon.command.scale'),
                size: 'large',
                props: { icon: ScaleToOriginal }
              },
              {
                id: 'cmd-trim',
                type: 'dropdown',
                label: t('main.ribbon.command.trim'),
                size: 'large',
                props: {
                  icon: Scissor,
                  options: [
                    { value: 'trim', label: t('main.ribbon.command.trim') },
                    { value: 'extend', label: t('main.ribbon.command.extend') }
                  ]
                }
              },
              {
                id: 'cmd-fillet',
                type: 'dropdown',
                label: t('main.ribbon.command.fillet'),
                size: 'large',
                props: {
                  icon: Operation,
                  options: [
                    { value: 'fillet', label: t('main.ribbon.command.fillet') },
                    {
                      value: 'chamfer',
                      label: t('main.ribbon.command.chamfer')
                    }
                  ]
                }
              },
              {
                id: 'cmd-array',
                type: 'dropdown',
                label: t('main.ribbon.command.array'),
                size: 'large',
                props: {
                  icon: Grid,
                  options: [
                    { value: 'array', label: t('main.ribbon.command.array') },
                    {
                      value: 'polararray',
                      label: t('main.ribbon.command.polarArray')
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        id: 'home-layer',
        title: 'Layer',
        orientation: 'row',
        collections: [
          {
            id: 'home-layer-main',
            layout: 'row',
            items: [
              {
                id: 'cmd-layer',
                type: 'button',
                label: t('main.verticalToolbar.layer.text'),
                size: 'large',
                props: { icon: layer }
              },
              {
                id: 'cmd-layer-state',
                type: 'button',
                label: t('main.ribbon.command.layerState'),
                size: 'large',
                props: { icon: setting }
              },
              {
                id: 'cmd-layer-off',
                type: 'button',
                label: t('main.ribbon.command.off'),
                size: 'large',
                props: { icon: fullScreen }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'comment',
    title: 'Comment',
    groups: []
  }
]

const ribbonData = computed(() => {
  locale.value
  const commandByItemId = new Map<string, string>()
  commandByItemId.set('cmd-line', 'line')
  commandByItemId.set('cmd-polyline', 'pline')
  commandByItemId.set('cmd-circle', 'circle')
  commandByItemId.set('circle-center-radius', 'circle')
  commandByItemId.set('circle-center-diameter', 'circle\\nDiameter')
  commandByItemId.set('circle-2-point', 'circle\\n2P')
  commandByItemId.set('circle-3-point', 'circle\\n3P')
  commandByItemId.set('circle-tan-tan-radius', 'circle')
  commandByItemId.set('circle-tan-tan-tan', 'circle')
  commandByItemId.set('cmd-arc', 'arc')
  commandByItemId.set('cmd-rect', 'rectang')
  commandByItemId.set('cmd-point', 'point')
  commandByItemId.set('cmd-hatch', 'hatch')
  commandByItemId.set('cmd-move', 'move')
  commandByItemId.set('cmd-copy', 'copy')
  commandByItemId.set('cmd-stretch', 'stretch')
  commandByItemId.set('cmd-rotate', 'rotate')
  commandByItemId.set('cmd-mirror', 'mirror')
  commandByItemId.set('cmd-scale', 'scale')
  commandByItemId.set('cmd-trim', 'trim')
  commandByItemId.set('cmd-fillet', 'fillet')
  commandByItemId.set('cmd-array', 'array')
  commandByItemId.set('cmd-layer', 'layer')
  commandByItemId.set('cmd-layer-state', '-layer')
  commandByItemId.set('cmd-layer-off', 'layoff')

  const commandsByGroup = new Map<string, typeof commands>()
  for (const cmd of commands) {
    if (cmd.mode > docOpenMode.value) continue
    if (!commandsByGroup.has(cmd.groupName)) {
      commandsByGroup.set(cmd.groupName, [])
    }
    commandsByGroup.get(cmd.groupName)!.push(cmd)
  }

  const groups = [...commandsByGroup.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([groupName, groupCommands], groupIndex) => ({
      id: `group-${normalizeIdPart(groupName)}-${groupIndex}`,
      title: groupName,
      autoWidth: false,
      collections: [
        {
          id: `collection-${normalizeIdPart(groupName)}-${groupIndex}`,
          layout: 'column' as const,
          items: groupCommands
            .slice()
            .sort((a, b) => a.commandName.localeCompare(b.commandName))
            .slice(0, 12)
            .map((cmd, cmdIndex) => {
              const itemId = `cmd-${normalizeIdPart(groupName)}-${normalizeIdPart(cmd.globalName)}-${cmdIndex}`
              commandByItemId.set(itemId, cmd.globalName)
              return {
                id: itemId,
                type: 'button' as const,
                label: cmd.commandName,
                size: 'small' as const
              }
            })
        }
      ]
    }))

  const tabs: RibbonTabModel[] = [
    ...buildBaseTabs(),
    {
      id: 'system-commands',
      title: 'Commands',
      groups
    }
  ]

  return {
    tabs,
    commandByItemId
  }
})

const handleRibbonItemClick = (payload: {
  tabId: string
  groupId: string
  itemId: string
}) => {
  const command = ribbonData.value.commandByItemId.get(payload.itemId)
  if (!command) return
  AcApDocManager.instance.sendStringToExecute(command)
}
</script>

<template>
  <div v-if="features.isShowToolbar" class="ml-ribbon-toolbar-container">
    <ml-ribbon
      :minimized="false"
      :tabs="ribbonData.tabs"
      :show-file-menu="false"
      size="small"
      hide-key-tips-toggle
      hide-layout-switcher
      @item-click="handleRibbonItemClick"
    >
      <template #tabs-extra>
        <ml-ribbon-language-selector
          v-if="features.isShowLanguageSelector"
          :current-locale="props.currentLocale"
        />
      </template>
    </ml-ribbon>
  </div>
</template>

<style>
.ml-ribbon-toolbar-container {
  width: 100%;
  box-sizing: border-box;
  z-index: 6;
}
</style>
