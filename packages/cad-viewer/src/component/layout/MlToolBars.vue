<script setup lang="ts">
import {
  AcApDocManager,
  AcEdOpenMode,
  isMarkupVisible,
  isMeasurementVisible
} from '@mlightcad/cad-simple-viewer'
import { MlButtonData, MlToolBar } from '@mlightcad/ui-components'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDocument, useSettings } from '../../composable'
import { markComponentConfigRaw } from '../../composable/markComponentConfigRaw'
import {
  clearMarkups,
  clearMeasurements,
  exportIcon,
  importIcon,
  layer,
  markupArrow,
  markupCallout,
  markupHide,
  markupPanel,
  markupShow,
  markupStamp,
  markupTools,
  measure,
  measureAngle,
  measureArc,
  measureArea,
  measureContinuous,
  measureDistance,
  measurementPanel,
  measurePoint,
  pan,
  readingMode,
  revCircle,
  revCloud,
  revRect,
  revText,
  select,
  switchBg,
  zoomToBox,
  zoomToExtent
} from '../../svg/toolbarIcons'

const { t } = useI18n()
const features = useSettings()
const { isDocumentOpening, openMode: docOpenMode } = useDocument()
const isToolbarDisabled = computed(() => isDocumentOpening.value)
const markupVisible = ref(isMarkupVisible())
const measurementVisible = ref(isMeasurementVisible())

const syncMarkupVisibility = () => {
  markupVisible.value = isMarkupVisible()
}

const syncMeasurementVisibility = () => {
  measurementVisible.value = isMeasurementVisible()
}

onMounted(() => {
  const docs = AcApDocManager.instance
  docs.editor.events.commandEnded.addEventListener(syncMarkupVisibility)
  docs.editor.events.commandEnded.addEventListener(syncMeasurementVisibility)
  docs.events.documentActivated.addEventListener(syncMarkupVisibility)
  docs.events.documentActivated.addEventListener(syncMeasurementVisibility)
  syncMarkupVisibility()
  syncMeasurementVisibility()
})

onUnmounted(() => {
  const docs = AcApDocManager.instance
  docs.editor.events.commandEnded.removeEventListener(syncMarkupVisibility)
  docs.editor.events.commandEnded.removeEventListener(syncMeasurementVisibility)
  docs.events.documentActivated.removeEventListener(syncMarkupVisibility)
  docs.events.documentActivated.removeEventListener(syncMeasurementVisibility)
})

const toolbarSeparator = { type: 'separator' } as MlButtonData

const visibilityToggle = (
  command: string,
  visible: boolean,
  show: { text: string; description: string },
  hide: { text: string; description: string }
): MlButtonData => ({
  command,
  toggle: {
    value: visible,
    on: {
      icon: markupShow,
      text: show.text,
      description: show.description
    },
    off: {
      icon: markupHide,
      text: hide.text,
      description: hide.description
    }
  }
})

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
      icon: switchBg,
      text: t('main.verticalToolbar.switchBg.text'),
      command: 'switchbg',
      description: t('main.verticalToolbar.switchBg.description')
    },
    {
      icon: readingMode,
      text: t('main.verticalToolbar.readingMode.text'),
      command: 'readingmode',
      description: t('main.verticalToolbar.readingMode.description')
    },
    {
      icon: measure,
      text: t('main.verticalToolbar.measure.text'),
      command: '',
      description: t('main.verticalToolbar.measure.description'),
      childrenType: 'sticky',
      children: [
        {
          icon: measureDistance,
          text: t('main.verticalToolbar.measureDistance.text'),
          command: 'measuredistance',
          description: t('main.verticalToolbar.measureDistance.description')
        },
        {
          icon: measureContinuous,
          text: t('main.verticalToolbar.measureContinuous.text'),
          command: 'measurecontinuous',
          description: t('main.verticalToolbar.measureContinuous.description')
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
          icon: measurePoint,
          text: t('main.verticalToolbar.measurePoint.text'),
          command: 'measurepoint',
          description: t('main.verticalToolbar.measurePoint.description')
        },
        {
          icon: measurementPanel,
          text: t('main.verticalToolbar.measurementPanel.text'),
          command: 'measurementpanel',
          description: t('main.verticalToolbar.measurementPanel.description')
        },
        visibilityToggle(
          'measurementvis',
          measurementVisible.value,
          {
            text: t('main.verticalToolbar.showMeasurements.text'),
            description: t('main.verticalToolbar.showMeasurements.description')
          },
          {
            text: t('main.verticalToolbar.hideMeasurements.text'),
            description: t('main.verticalToolbar.hideMeasurements.description')
          }
        ),
        {
          icon: clearMeasurements,
          text: t('main.verticalToolbar.clearMeasurements.text'),
          command: 'clearmeasurements',
          description: t('main.verticalToolbar.clearMeasurements.description')
        },
        toolbarSeparator,
        {
          icon: importIcon,
          text: t('main.verticalToolbar.measurementImport.text'),
          command: 'measurementimport',
          description: t('main.verticalToolbar.measurementImport.description')
        },
        {
          icon: exportIcon,
          text: t('main.verticalToolbar.measurementExport.text'),
          command: 'measurementexport',
          description: t('main.verticalToolbar.measurementExport.description')
        }
      ]
    }
  ]

  // Only show review markup tools in Review mode or higher
  if (docOpenMode.value >= AcEdOpenMode.Review) {
    items.push({
      icon: markupTools,
      text: t('main.verticalToolbar.annotation.text'),
      command: '',
      description: t('main.verticalToolbar.annotation.description'),
      childrenType: 'sticky',
      children: [
        {
          icon: revCloud,
          text: t('main.verticalToolbar.markupCloud.text'),
          command: 'markupcloud',
          description: t('main.verticalToolbar.markupCloud.description')
        },
        {
          icon: markupCallout,
          text: t('main.verticalToolbar.markupCallout.text'),
          command: 'markupcallout',
          description: t('main.verticalToolbar.markupCallout.description')
        },
        {
          icon: revText,
          text: t('main.verticalToolbar.markupText.text'),
          command: 'markuptext',
          description: t('main.verticalToolbar.markupText.description')
        },
        {
          icon: revRect,
          text: t('main.verticalToolbar.markupRect.text'),
          command: 'markuprect',
          description: t('main.verticalToolbar.markupRect.description')
        },
        {
          icon: revCircle,
          text: t('main.verticalToolbar.markupCircle.text'),
          command: 'markupcircle',
          description: t('main.verticalToolbar.markupCircle.description')
        },
        {
          icon: markupArrow,
          text: t('main.verticalToolbar.markupArrow.text'),
          command: 'markuparrow',
          description: t('main.verticalToolbar.markupArrow.description')
        },
        {
          icon: markupStamp,
          text: t('main.verticalToolbar.markupStamp.text'),
          command: 'markupstamp',
          description: t('main.verticalToolbar.markupStamp.description')
        },
        {
          icon: markupPanel,
          text: t('main.verticalToolbar.markupPanel.text'),
          command: 'markuppanel',
          description: t('main.verticalToolbar.markupPanel.description')
        },
        visibilityToggle(
          'markupvis',
          markupVisible.value,
          {
            text: t('main.verticalToolbar.showMarkup.text'),
            description: t('main.verticalToolbar.showMarkup.description')
          },
          {
            text: t('main.verticalToolbar.hideMarkup.text'),
            description: t('main.verticalToolbar.hideMarkup.description')
          }
        ),
        {
          icon: clearMarkups,
          text: t('main.verticalToolbar.clearMarkups.text'),
          command: 'clearmarkups',
          description: t('main.verticalToolbar.clearMarkups.description')
        },
        toolbarSeparator,
        {
          icon: importIcon,
          text: t('main.verticalToolbar.markupImport.text'),
          command: 'markupimport',
          description: t('main.verticalToolbar.markupImport.description')
        },
        {
          icon: exportIcon,
          text: t('main.verticalToolbar.markupExport.text'),
          command: 'markupexport',
          description: t('main.verticalToolbar.markupExport.description')
        }
      ]
    })
  }
  return markComponentConfigRaw(items)
})

const handleCommand = (command?: string) => {
  if (isToolbarDisabled.value || !command) return
  AcApDocManager.instance.sendStringToExecute(command)
}

const handleToggle = (command: string) => {
  handleCommand(command)
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

.acap-svg-icon {
  display: inline-flex;
  width: 1em;
  height: 1em;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.acap-svg-icon svg {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
