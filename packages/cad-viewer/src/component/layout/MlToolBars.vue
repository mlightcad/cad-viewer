<script setup lang="ts">
import { ChatDotRound } from '@element-plus/icons-vue'
import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { MlButtonData, MlToolBar } from '@mlightcad/ui-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDocOpenMode, useSettings } from '../../composable'
import {
  layer,
  move,
  revCircle,
  revCloud,
  revFreeDraw,
  revRect,
  select,
  switchBg,
  zoomToBox,
  zoomToExtent
} from '../../svg'

const { t } = useI18n()
const features = useSettings()
const docOpenMode = useDocOpenMode()

const itemsInReviewMode: MlButtonData[] = [
  {
    icon: switchBg,
    text: t('main.verticalToolbar.switchBg.text'),
    command: 'switchbg',
    description: t('main.verticalToolbar.switchBg.description')
  },
  {
    icon: ChatDotRound,
    text: t('main.verticalToolbar.comment.text'),
    command: '',
    description: t('main.verticalToolbar.comment.description'),
    children: [
      {
        icon: revFreeDraw,
        text: t('main.verticalToolbar.revFreehand.text'),
        command: 'sketch',
        description: t('main.verticalToolbar.revFreehand.description')
      },
      {
        icon: revRect,
        text: t('main.verticalToolbar.revRect.text'),
        command: 'rectangle',
        description: t('main.verticalToolbar.revRect.description')
      },
      {
        icon: revCloud,
        text: t('main.verticalToolbar.revCloud.text'),
        command: 'revcloud',
        description: t('main.verticalToolbar.revCloud.description')
      },
      {
        icon: revCircle,
        text: t('main.verticalToolbar.revCircle.text'),
        command: 'circle',
        description: t('main.verticalToolbar.revCircle.description')
      }
    ]
  }
  // {
  //   command: 'revvis',
  //   toggle: {
  //     value: true,
  //     on: {
  //       icon: View,
  //       text: t('main.verticalToolbar.showComment.text'),
  //       description: t('main.verticalToolbar.showComment.description')
  //     },
  //     off: {
  //       icon: Hide,
  //       text: t('main.verticalToolbar.hideComment.text'),
  //       description: t('main.verticalToolbar.showComment.description')
  //     }
  //   }
  // },
]

const verticalToolbarData = computed(() => {
  const items: MlButtonData[] = [
    {
      icon: select,
      text: t('main.verticalToolbar.select.text'),
      command: 'select',
      description: t('main.verticalToolbar.select.description')
    },
    {
      icon: move,
      text: t('main.verticalToolbar.pan.text'),
      command: 'pan',
      description: t('main.verticalToolbar.pan.description')
    },
    {
      icon: zoomToExtent,
      text: t('main.verticalToolbar.zoomToExtent.text'),
      command: 'zoom',
      description: t('main.verticalToolbar.zoomToExtent.description')
    },
    {
      icon: zoomToBox,
      text: t('main.verticalToolbar.zoomToBox.text'),
      command: 'zoomw',
      description: t('main.verticalToolbar.zoomToBox.description')
    },
    {
      icon: layer,
      text: t('main.verticalToolbar.layer.text'),
      command: 'la',
      description: t('main.verticalToolbar.layer.description')
    }
  ]

  // Only show Comment tools in Review mode or higher
  if (docOpenMode.value >= AcEdOpenMode.Review) {
    items.push(...itemsInReviewMode)
  }
  return items
})

const handleCommand = (command: string) => {
  AcApDocManager.instance.sendStringToExecute(command)
}

const handleToggle = (command: string, _value: boolean) => {
  AcApDocManager.instance.sendStringToExecute(command)
}
</script>

<template>
  <div v-if="features.isShowToolbar" class="ml-vertical-toolbar-container">
    <ml-tool-bar
      :items="verticalToolbarData"
      size="small"
      direction="vertical"
      placement="left"
      @click="handleCommand"
      @toggle="handleToggle"
    />
  </div>
</template>

<style>
.ml-vertical-toolbar-container {
  position: fixed;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
