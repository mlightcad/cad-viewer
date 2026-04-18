<script setup lang="ts">
import { ChatDotRound, Hide, View } from '@element-plus/icons-vue'
import { AcApDocManager, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { MlButtonData, MlToolBar } from '@mlightcad/ui-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  useDocOpenMode,
  useDocumentOpening,
  useSettings
} from '../../composable'
import { markComponentConfigRaw } from '../../composable/markComponentConfigRaw'
import {
  clearMeasurements,
  layer,
  measure,
  measureAngle,
  measureArc,
  measureArea,
  measureDistance,
  pan,
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
const { isDocumentOpening } = useDocumentOpening()
const isToolbarDisabled = computed(() => isDocumentOpening.value)

const verticalToolbarData = computed(() => {
  const items: MlButtonData[] = [
    {
      icon: select,
      text: t('main.verticalToolbar.select.text'),
      command: 'select',
      description: t('main.verticalToolbar.select.description')
    },
    {
      icon: pan,
      text: t('main.verticalToolbar.pan.text'),
      command: 'pan',
      description: t('main.verticalToolbar.pan.description')
    },
    {
      icon: zoomToExtent,
      text: t('main.verticalToolbar.zoomToExtent.text'),
      command: 'zoom\\nall',
      description: t('main.verticalToolbar.zoomToExtent.description')
    },
    {
      icon: zoomToBox,
      text: t('main.verticalToolbar.zoomToBox.text'),
      command: 'zoom\\nwindow',
      description: t('main.verticalToolbar.zoomToBox.description')
    },
    {
      icon: layer,
      text: t('main.verticalToolbar.layer.text'),
      command: 'layer',
      description: t('main.verticalToolbar.layer.description')
    },
    {
      icon: measure,
      text: t('main.verticalToolbar.measure.text'),
      command: '',
      description: t('main.verticalToolbar.measure.description'),
      children: [
        {
          icon: measureDistance,
          text: t('main.verticalToolbar.measureDistance.text'),
          command: 'measuredistance',
          description: t('main.verticalToolbar.measureDistance.description')
        },
        {
          icon: measureAngle,
          text: t('main.verticalToolbar.measureAngle.text'),
          command: 'measureangle',
          description: t('main.verticalToolbar.measureAngle.description')
        },
        {
          icon: measureArea,
          text: t('main.verticalToolbar.measureArea.text'),
          command: 'measurearea',
          description: t('main.verticalToolbar.measureArea.description')
        },
        {
          icon: measureArc,
          text: t('main.verticalToolbar.measureArc.text'),
          command: 'measurearc',
          description: t('main.verticalToolbar.measureArc.description')
        },
        {
          icon: clearMeasurements,
          text: t('main.verticalToolbar.clearMeasurements.text'),
          command: 'clearmeasurements',
          description: t('main.verticalToolbar.clearMeasurements.description')
        }
      ]
    }
  ]

  // Only show Comment tools in Review mode or higher
  if (docOpenMode.value >= AcEdOpenMode.Review) {
    items.push(
      {
        icon: switchBg,
        text: t('main.verticalToolbar.switchBg.text'),
        command: 'switchbg',
        description: t('main.verticalToolbar.switchBg.description')
      },
      {
        icon: ChatDotRound,
        text: t('main.verticalToolbar.annotation.text'),
        command: '',
        description: t('main.verticalToolbar.annotation.description'),
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
            command: 'revrect',
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
            command: 'revcircle',
            description: t('main.verticalToolbar.revCircle.description')
          }
        ]
      },
      {
        command: 'revvis',
        toggle: {
          value: true,
          on: {
            icon: View,
            text: t('main.verticalToolbar.showAnnotation.text'),
            description: t('main.verticalToolbar.showAnnotation.description')
          },
          off: {
            icon: Hide,
            text: t('main.verticalToolbar.hideAnnotation.text'),
            description: t('main.verticalToolbar.showAnnotation.description')
          }
        }
      }
    )
  }
  return markComponentConfigRaw(items)
})

const handleCommand = (command: string) => {
  if (isToolbarDisabled.value) return
  AcApDocManager.instance.sendStringToExecute(command)
}

const handleToggle = (command: string, _value: boolean) => {
  if (isToolbarDisabled.value) return
  AcApDocManager.instance.sendStringToExecute(command)
}
</script>

<template>
  <div
    v-if="features.isShowToolbar"
    :class="{ 'is-disabled': isToolbarDisabled }"
    :aria-disabled="isToolbarDisabled"
    class="ml-vertical-toolbar-container"
  >
    <ml-tool-bar
      :items="verticalToolbarData"
      collapsible
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
  z-index: 3;
}

.ml-vertical-toolbar-container.is-disabled {
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
}
</style>
