<script setup lang="ts">
/**
 * Vertical main toolbar for cad-viewer, backed by shared {@link AcUiToolbar}.
 */
import {
  acapBindToolbarDocState,
  AcApDocManager,
  AcApI18n,
  AcEdOpenMode,
  AcUiToolbar,
  type AcUiToolbarItem,
  ICON_ANNOTATION,
  ICON_ANNOTATION_HIDE,
  ICON_ANNOTATION_SHOW,
  ICON_CLEAR_MARKUPS,
  ICON_CLEAR_MEASUREMENTS,
  ICON_LAYER,
  ICON_MARKUP_ARROW,
  ICON_MARKUP_CALLOUT,
  ICON_MARKUP_EXPORT,
  ICON_MARKUP_IMPORT,
  ICON_MARKUP_PANEL,
  ICON_MARKUP_STAMP,
  ICON_MARKUP_TEXT,
  ICON_MEASURE,
  ICON_MEASURE_ANGLE,
  ICON_MEASURE_ARC,
  ICON_MEASURE_AREA,
  ICON_MEASURE_CONTINUOUS,
  ICON_MEASURE_DISTANCE,
  ICON_MEASURE_POINT,
  ICON_MEASUREMENT_PANEL,
  ICON_PAN,
  ICON_READING_MODE,
  ICON_REV_CIRCLE,
  ICON_REV_CLOUD,
  ICON_REV_RECT,
  ICON_SELECT,
  ICON_SWITCH_BG,
  ICON_ZOOM_EXTENT,
  ICON_ZOOM_WINDOW,
  isMarkupVisible,
  isMeasurementVisible
} from '@mlightcad/cad-simple-viewer'
import {
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch
} from 'vue'

import { useDocument, useSettings } from '../../composable'

const features = useSettings()
const { isDocumentOpening, openMode: docOpenMode } = useDocument()

const hostRef = ref<HTMLElement | null>(null)
let toolbar: AcUiToolbar | undefined
let unbindDoc: (() => void) | undefined

const markupVisible = ref(isMarkupVisible())
const measurementVisible = ref(isMeasurementVisible())
const readingModeEnabled = ref(false)

const syncMarkupVisibility = () => {
  markupVisible.value = isMarkupVisible()
}

const syncMeasurementVisibility = () => {
  measurementVisible.value = isMeasurementVisible()
}

const syncReadingMode = () => {
  try {
    readingModeEnabled.value = AcApDocManager.instance.isReadingModeEnabled()
  } catch {
    readingModeEnabled.value = false
  }
}

/** Prefer AcApI18n; keys are resolved at runtime by AcUiToolbar. */
const i18n = {
  // eslint-disable-next-line @intlify/vue-i18n/no-dynamic-keys -- toolbar label keys are data-driven
  t: (key: string) => AcApI18n.t(key)
}

const handleLocaleChanged = () => {
  // vue-i18n is synced first (listener registered in locale/i18n.ts at module load).
  toolbar?.refreshLocale()
}

const toolbarSeparator = (): AcUiToolbarItem => ({
  id: `separator-${Math.random().toString(36).slice(2, 8)}`,
  type: 'separator'
})

const buildItems = (): AcUiToolbarItem[] => {
  const readingOn = readingModeEnabled.value
  const items: AcUiToolbarItem[] = [
    {
      id: 'select',
      label: 'main.verticalToolbar.select.text',
      icon: ICON_SELECT,
      command: 'select'
    },
    {
      id: 'pan',
      label: 'main.verticalToolbar.pan.text',
      icon: ICON_PAN,
      command: 'pan'
    },
    {
      id: 'zoom-extent',
      label: 'main.verticalToolbar.zoomToExtent.text',
      icon: ICON_ZOOM_EXTENT,
      command: 'zoom\nall'
    },
    {
      id: 'zoom-window',
      label: 'main.verticalToolbar.zoomToBox.text',
      icon: ICON_ZOOM_WINDOW,
      command: 'zoom\nwindow'
    },
    {
      id: 'layer',
      label: 'main.verticalToolbar.layer.text',
      icon: ICON_LAYER,
      command: 'layer'
    },
    {
      id: 'switch-bg',
      label: 'main.verticalToolbar.switchBg.text',
      icon: ICON_SWITCH_BG,
      command: 'switchbg',
      disabled: () => readingModeEnabled.value
    },
    {
      id: 'reading-mode',
      label: 'main.verticalToolbar.readingMode.text',
      icon: ICON_READING_MODE,
      command: 'readingmode',
      toggle: {
        getValue: () => readingModeEnabled.value,
        on: { icon: ICON_READING_MODE },
        off: { icon: ICON_READING_MODE }
      }
    },
    {
      id: 'measure',
      label: 'main.verticalToolbar.measure.text',
      icon: ICON_MEASURE,
      childrenUi: 'sticky-toolbar',
      children: [
        {
          id: 'measure-distance',
          label: 'main.verticalToolbar.measureDistance.text',
          icon: ICON_MEASURE_DISTANCE,
          command: 'measuredistance'
        },
        {
          id: 'measure-continuous',
          label: 'main.verticalToolbar.measureContinuous.text',
          icon: ICON_MEASURE_CONTINUOUS,
          command: 'measurecontinuous'
        },
        {
          id: 'measure-angle',
          label: 'main.verticalToolbar.measureAngle.text',
          icon: ICON_MEASURE_ANGLE,
          command: 'measureangle'
        },
        {
          id: 'measure-area',
          label: 'main.verticalToolbar.measureArea.text',
          icon: ICON_MEASURE_AREA,
          command: 'measurearea'
        },
        {
          id: 'measure-arc',
          label: 'main.verticalToolbar.measureArc.text',
          icon: ICON_MEASURE_ARC,
          command: 'measurearc'
        },
        {
          id: 'measure-point',
          label: 'main.verticalToolbar.measurePoint.text',
          icon: ICON_MEASURE_POINT,
          command: 'measurepoint'
        },
        {
          id: 'measurement-panel',
          label: 'main.verticalToolbar.measurementPanel.text',
          icon: ICON_MEASUREMENT_PANEL,
          command: 'measurementpanel'
        },
        {
          id: 'measurement-vis',
          label: measurementVisible.value
            ? 'main.verticalToolbar.hideMeasurements.text'
            : 'main.verticalToolbar.showMeasurements.text',
          icon: measurementVisible.value
            ? ICON_ANNOTATION_HIDE
            : ICON_ANNOTATION_SHOW,
          command: 'measurementvis',
          toggle: {
            getValue: () => measurementVisible.value,
            on: {
              label: 'main.verticalToolbar.hideMeasurements.text',
              icon: ICON_ANNOTATION_HIDE
            },
            off: {
              label: 'main.verticalToolbar.showMeasurements.text',
              icon: ICON_ANNOTATION_SHOW
            }
          }
        },
        {
          id: 'clear-measurements',
          label: 'main.verticalToolbar.clearMeasurements.text',
          icon: ICON_CLEAR_MEASUREMENTS,
          command: 'clearmeasurements'
        },
        toolbarSeparator(),
        {
          id: 'measurement-import',
          label: 'main.verticalToolbar.measurementImport.text',
          icon: ICON_MARKUP_IMPORT,
          command: 'measurementimport'
        },
        {
          id: 'measurement-export',
          label: 'main.verticalToolbar.measurementExport.text',
          icon: ICON_MARKUP_EXPORT,
          command: 'measurementexport'
        }
      ]
    }
  ]

  items.push({
    id: 'annotation',
    label: 'main.verticalToolbar.annotation.text',
    icon: ICON_ANNOTATION,
    minOpenMode: AcEdOpenMode.Review,
    childrenUi: 'sticky-toolbar',
    children: [
      {
        id: 'markup-cloud',
        label: 'main.verticalToolbar.markupCloud.text',
        icon: ICON_REV_CLOUD,
        command: 'markupcloud'
      },
      {
        id: 'markup-callout',
        label: 'main.verticalToolbar.markupCallout.text',
        icon: ICON_MARKUP_CALLOUT,
        command: 'markupcallout'
      },
      {
        id: 'markup-text',
        label: 'main.verticalToolbar.markupText.text',
        icon: ICON_MARKUP_TEXT,
        command: 'markuptext'
      },
      {
        id: 'markup-rect',
        label: 'main.verticalToolbar.markupRect.text',
        icon: ICON_REV_RECT,
        command: 'markuprect'
      },
      {
        id: 'markup-circle',
        label: 'main.verticalToolbar.markupCircle.text',
        icon: ICON_REV_CIRCLE,
        command: 'markupcircle'
      },
      {
        id: 'markup-arrow',
        label: 'main.verticalToolbar.markupArrow.text',
        icon: ICON_MARKUP_ARROW,
        command: 'markuparrow'
      },
      {
        id: 'markup-stamp',
        label: 'main.verticalToolbar.markupStamp.text',
        icon: ICON_MARKUP_STAMP,
        command: 'markupstamp'
      },
      {
        id: 'markup-panel',
        label: 'main.verticalToolbar.markupPanel.text',
        icon: ICON_MARKUP_PANEL,
        command: 'markuppanel'
      },
      {
        id: 'markup-vis',
        label: markupVisible.value
          ? 'main.verticalToolbar.hideMarkup.text'
          : 'main.verticalToolbar.showMarkup.text',
        icon: markupVisible.value ? ICON_ANNOTATION_HIDE : ICON_ANNOTATION_SHOW,
        command: 'markupvis',
        toggle: {
          getValue: () => markupVisible.value,
          on: {
            label: 'main.verticalToolbar.hideMarkup.text',
            icon: ICON_ANNOTATION_HIDE
          },
          off: {
            label: 'main.verticalToolbar.showMarkup.text',
            icon: ICON_ANNOTATION_SHOW
          }
        }
      },
      {
        id: 'clear-markups',
        label: 'main.verticalToolbar.clearMarkups.text',
        icon: ICON_CLEAR_MARKUPS,
        command: 'clearmarkups'
      },
      toolbarSeparator(),
      {
        id: 'markup-import',
        label: 'main.verticalToolbar.markupImport.text',
        icon: ICON_MARKUP_IMPORT,
        command: 'markupimport'
      },
      {
        id: 'markup-export',
        label: 'main.verticalToolbar.markupExport.text',
        icon: ICON_MARKUP_EXPORT,
        command: 'markupexport'
      }
    ]
  })

  void readingOn
  void docOpenMode
  return items
}

const ensureToolbar = () => {
  const host = hostRef.value
  if (!host || toolbar) return
  toolbar = new AcUiToolbar({
    host,
    placement: 'right',
    // Match AcUiShortCutToolbar shell `right: 12px`.
    edgeOffset: 12,
    items: buildItems(),
    i18n,
    collapsible: true,
    onCommand: command => {
      if (isDocumentOpening.value || !command) return
      if (command === 'switchbg' && readingModeEnabled.value) return
      AcApDocManager.instance.sendStringToExecute(command)
    }
  })
  unbindDoc = acapBindToolbarDocState(toolbar)
  // Re-measure after the host has a real canvas-sized box (see host CSS note).
  void nextTick(() => {
    toolbar?.refresh()
  })
}

const destroyToolbar = () => {
  unbindDoc?.()
  unbindDoc = undefined
  toolbar?.destroy()
  toolbar = undefined
}

const refreshToolbarItems = () => {
  toolbar?.updateItems(buildItems())
}

onMounted(() => {
  const docs = AcApDocManager.instance
  docs.editor.events.commandEnded.addEventListener(syncMarkupVisibility)
  docs.editor.events.commandEnded.addEventListener(syncMeasurementVisibility)
  docs.editor.events.commandEnded.addEventListener(syncReadingMode)
  docs.events.documentActivated.addEventListener(syncMarkupVisibility)
  docs.events.documentActivated.addEventListener(syncMeasurementVisibility)
  docs.events.documentActivated.addEventListener(syncReadingMode)
  AcApI18n.events.localeChanged.addEventListener(handleLocaleChanged)
  syncMarkupVisibility()
  syncMeasurementVisibility()
  syncReadingMode()

  if (features.isShowToolbar) {
    ensureToolbar()
  }
})

onUnmounted(() => {
  const docs = AcApDocManager.instance
  docs.editor.events.commandEnded.removeEventListener(syncMarkupVisibility)
  docs.editor.events.commandEnded.removeEventListener(syncMeasurementVisibility)
  docs.editor.events.commandEnded.removeEventListener(syncReadingMode)
  docs.events.documentActivated.removeEventListener(syncMarkupVisibility)
  docs.events.documentActivated.removeEventListener(syncMeasurementVisibility)
  docs.events.documentActivated.removeEventListener(syncReadingMode)
  AcApI18n.events.localeChanged.removeEventListener(handleLocaleChanged)
  destroyToolbar()
})

watch(
  () => features.isShowToolbar,
  show => {
    if (show) {
      ensureToolbar()
      refreshToolbarItems()
    } else {
      destroyToolbar()
    }
  }
)

watch(
  [markupVisible, measurementVisible, readingModeEnabled, docOpenMode],
  () => {
    refreshToolbarItems()
  }
)

watch(isDocumentOpening, opening => {
  toolbar?.setDocState({ isOpening: opening })
})
</script>

<template>
  <div
    ref="hostRef"
    class="ml-vertical-toolbar-host"
    :hidden="!features.isShowToolbar"
    aria-hidden="true"
  />
</template>

<style>
/*
 * Keep the overlay host filling the canvas main area so syncPosition can
 * vertically center the bar on the right edge.
 */
.ml-vertical-toolbar-host,
.ml-vertical-toolbar-host.ml-ex-ui-toolbar-host {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
  z-index: 3;
  pointer-events: none;
}

.ml-vertical-toolbar-host .ml-ex-ui-toolbar,
.ml-vertical-toolbar-host .ml-ex-ui-subtoolbar,
.ml-vertical-toolbar-host .ml-ex-ui-dropdown {
  pointer-events: auto;
}
</style>
