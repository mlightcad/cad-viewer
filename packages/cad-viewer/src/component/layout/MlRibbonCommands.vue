<script setup lang="ts">
import '@mlightcad/ribbon/style.css'

import {
  Delete,
  DocumentCopy,
  Hide,
  RefreshRight,
  View
} from '@element-plus/icons-vue'
import {
  AcApAnnotation,
  AcApConvertToDxfCmd,
  AcApDocManager,
  AcApOpenCmd,
  AcApQNewCmd,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcDbDatabase,
  AcDbSysVarManager,
  AcGiLineWeight
} from '@mlightcad/data-model'
import {
  FileMenuItemModel,
  MlRibbon,
  RibbonGroupModel,
  RibbonItemModel,
  RibbonLocaleTexts,
  RibbonTabModel
} from '@mlightcad/ribbon'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  useDocOpenMode,
  useDocumentOpening,
  useSettings
} from '../../composable'
import { markComponentConfigRaw } from '../../composable/markComponentConfigRaw'
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
  clearMeasurements,
  ellipseArc,
  ellipseCenter,
  hatch,
  layer,
  line,
  measureAngle,
  measureArc,
  measureArea,
  measureDistance,
  move,
  pointstyle1,
  polygon,
  polyline,
  properties,
  rect,
  revCircle,
  revCloud,
  revFreeDraw,
  revRect,
  spline
} from '../../svg'
import {
  MlRibbonPropertyColorDropdown,
  MlRibbonPropertyLineTypeSelect,
  MlRibbonPropertyLineWeightSelect
} from '../common'
import MlRibbonLanguageSelector from './MlRibbonLanguageSelector.vue'

interface Props {
  currentLocale?: LocaleProp
}

/**
 * Subset of the system variable change event used by the ribbon property sync.
 */
interface RibbonSysVarChangeEvent {
  /** Database whose system variable changed. */
  database: AcDbDatabase
  /** Name of the updated system variable. */
  name: string
}

const props = withDefaults(defineProps<Props>(), {
  currentLocale: undefined
})

const features = useSettings()
const { isDocumentOpening } = useDocumentOpening()
const docOpenMode = useDocOpenMode()
const { t, locale } = useI18n()
const isAnnotationVisible = ref(true)
const isRibbonDisabled = computed(() => isDocumentOpening.value)
const ribbonColor = ref<AcCmColor>(new AcCmColor())
const ribbonColorDisplay = ref('#7b8794')
const ribbonLineType = ref('ByLayer')
const ribbonLineWeight = ref<AcGiLineWeight>(AcGiLineWeight.ByLayer)

let observedDatabase: AcDbDatabase | undefined

/**
 * Returns the database currently attached to the active document, if any.
 */
const getCurrentDatabase = () => AcApDocManager.instance?.curDocument?.database

/**
 * Mirrors the active drawing's current property defaults into ribbon-local refs.
 *
 * @param db Database whose `CECOLOR`, `CELTYPE`, and `CELWEIGHT` values should be reflected.
 */
const syncRibbonProperties = (db = getCurrentDatabase()) => {
  if (!db) {
    ribbonColor.value = new AcCmColor()
    ribbonColorDisplay.value = '#7b8794'
    ribbonLineWeight.value = AcGiLineWeight.ByLayer
    ribbonLineType.value = 'ByLayer'
    return
  }

  ribbonColor.value = db.cecolor.clone()
  const currentLayer = db.tables.layerTable.getAt(db.clayer)
  ribbonColorDisplay.value = ribbonColor.value.isByLayer
    ? currentLayer?.color.cssColor || '#7b8794'
    : ribbonColor.value.isByBlock
      ? '#a0a8b8'
      : ribbonColor.value.cssColor || '#7b8794'
  ribbonLineWeight.value = db.celweight
  ribbonLineType.value = db.celtype || 'ByLayer'
}

const syncAnnotationVisibility = () => {
  const db = AcApDocManager.instance?.curDocument?.database
  if (!db) {
    isAnnotationVisible.value = true
    return
  }

  const annotation = new AcApAnnotation(db)
  for (const layer of db.tables.layerTable.newIterator()) {
    if (annotation.hasAnnotationXData(layer)) {
      isAnnotationVisible.value = !layer.isOff
      return
    }
  }

  isAnnotationVisible.value = true
}

const handleAnnotationLayerChange = () => {
  syncAnnotationVisibility()
  syncRibbonProperties(observedDatabase)
}

/**
 * Updates ribbon property controls when document default drawing properties change.
 *
 * @param args System variable change payload raised by the CAD runtime.
 */
const handleSysVarChange = (args: RibbonSysVarChangeEvent) => {
  if (args.database !== observedDatabase) return

  switch (args.name.toUpperCase()) {
    case 'CECOLOR':
    case 'CELTYPE':
    case 'CELWEIGHT':
      syncRibbonProperties(args.database)
      break
    default:
      break
  }
}

const bindAnnotationVisibilityEvents = (db?: AcDbDatabase) => {
  if (observedDatabase === db) return

  if (observedDatabase) {
    observedDatabase.events.layerAppended.removeEventListener(
      handleAnnotationLayerChange
    )
    observedDatabase.events.layerModified.removeEventListener(
      handleAnnotationLayerChange
    )
  }

  observedDatabase = db

  if (!observedDatabase) return

  observedDatabase.events.layerAppended.addEventListener(
    handleAnnotationLayerChange
  )
  observedDatabase.events.layerModified.addEventListener(
    handleAnnotationLayerChange
  )
}

const handleDocumentActivated = () => {
  bindAnnotationVisibilityEvents(AcApDocManager.instance?.curDocument?.database)
  syncAnnotationVisibility()
  syncRibbonProperties(AcApDocManager.instance?.curDocument?.database)
}

/**
 * Applies one mutation callback to all currently selected entities.
 *
 * @param mutator Mutation logic executed for each selected entity.
 */
const applyToSelectedEntities = (
  mutator: (
    entity: ReturnType<AcDbDatabase['tables']['blockTable']['getEntityById']>
  ) => void
) => {
  const db = getCurrentDatabase()
  const ids = AcApDocManager.instance?.curView?.selectionSet?.ids
  if (!db || !ids?.length) return

  ids.forEach(id => {
    const entity = db.tables.blockTable.getEntityById(id)
    if (!entity) return
    mutator(entity)
    entity.triggerModifiedEvent()
  })
}

onMounted(() => {
  AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(
    handleSysVarChange
  )
  AcApDocManager.instance.events.documentActivated.addEventListener(
    handleDocumentActivated
  )
  handleDocumentActivated()
})

onUnmounted(() => {
  AcDbSysVarManager.instance().events.sysVarChanged.removeEventListener(
    handleSysVarChange
  )
  AcApDocManager.instance.events.documentActivated.removeEventListener(
    handleDocumentActivated
  )
  bindAnnotationVisibilityEvents(undefined)
})

/**
 * Applies a newly selected ribbon color to the active database defaults.
 *
 * @param value Color chosen from the ribbon property dropdown.
 */
const handleRibbonColorChange = (value?: AcCmColor) => {
  const db = getCurrentDatabase()
  if (!db || !value) return

  db.cecolor = value
  applyToSelectedEntities(entity => {
    if (!entity) return
    entity.color = value
  })
  syncRibbonProperties(db)
}

/**
 * Applies a newly selected ribbon line weight to the active database defaults.
 *
 * @param value Line weight chosen from the ribbon property dropdown.
 */
const handleRibbonLineWeightChange = (value: AcGiLineWeight) => {
  const db = getCurrentDatabase()
  if (!db) return

  db.celweight = value
  applyToSelectedEntities(entity => {
    if (!entity) return
    entity.lineWeight = value
  })
  syncRibbonProperties(db)
}

/**
 * Applies a newly selected ribbon line type to the active database defaults.
 *
 * @param value Line type chosen from the ribbon property dropdown.
 */
const handleRibbonLineTypeChange = (value: string) => {
  const db = getCurrentDatabase()
  if (!db) return

  db.celtype = value
  applyToSelectedEntities(entity => {
    if (!entity) return
    entity.lineType = value
  })
  syncRibbonProperties(db)
}

const buildBaseTabs = (
  openMode: AcEdOpenMode,
  annotationVisible: boolean
): RibbonTabModel[] => {
  const ribbonTooltips = {
    line: t('main.ribbon.tooltip.line'),
    polyline: t('main.ribbon.tooltip.polyline'),
    spline: t('main.ribbon.tooltip.spline'),
    circle: t('main.ribbon.tooltip.circle'),
    arc: t('main.ribbon.tooltip.arc'),
    ellipse: t('main.ribbon.tooltip.ellipse'),
    rect: t('main.ribbon.tooltip.rect'),
    point: t('main.ribbon.tooltip.point'),
    hatch: t('main.ribbon.tooltip.hatch'),
    move: t('main.ribbon.tooltip.move'),
    rotate: t('main.ribbon.tooltip.rotate'),
    copy: t('main.ribbon.tooltip.copy'),
    erase: t('main.ribbon.tooltip.erase'),
    properties: t('main.ribbon.tooltip.properties')
  }
  const verticalToolbarDescriptions = {
    revFreehand: t('main.verticalToolbar.revFreehand.description'),
    revRect: t('main.verticalToolbar.revRect.description'),
    revCloud: t('main.verticalToolbar.revCloud.description'),
    revCircle: t('main.verticalToolbar.revCircle.description'),
    showAnnotation: t('main.verticalToolbar.showAnnotation.description'),
    hideAnnotation: t('main.verticalToolbar.hideAnnotation.description'),
    measureDistance: t('main.verticalToolbar.measureDistance.description'),
    measureAngle: t('main.verticalToolbar.measureAngle.description'),
    measureArea: t('main.verticalToolbar.measureArea.description'),
    measureArc: t('main.verticalToolbar.measureArc.description'),
    clearMeasurements: t('main.verticalToolbar.clearMeasurements.description'),
    layer: t('main.verticalToolbar.layer.description')
  }

  const annotationItems: RibbonItemModel[] = [
    {
      id: 'cmd-tool-rev-freehand',
      type: 'button',
      label: t('main.verticalToolbar.revFreehand.text'),
      tooltip: verticalToolbarDescriptions.revFreehand,
      size: 'large',
      props: { icon: revFreeDraw }
    },
    {
      id: 'cmd-tool-rev-rect',
      type: 'button',
      label: t('main.verticalToolbar.revRect.text'),
      tooltip: verticalToolbarDescriptions.revRect,
      size: 'large',
      props: { icon: revRect }
    },
    {
      id: 'cmd-tool-rev-cloud',
      type: 'button',
      label: t('main.verticalToolbar.revCloud.text'),
      tooltip: verticalToolbarDescriptions.revCloud,
      size: 'large',
      props: { icon: revCloud }
    },
    {
      id: 'cmd-tool-rev-circle',
      type: 'button',
      label: t('main.verticalToolbar.revCircle.text'),
      tooltip: verticalToolbarDescriptions.revCircle,
      size: 'large',
      props: { icon: revCircle }
    },
    {
      id: 'cmd-tool-rev-vis',
      type: 'toggle',
      label: t('main.verticalToolbar.showAnnotation.text'),
      tooltip: annotationVisible
        ? verticalToolbarDescriptions.hideAnnotation
        : verticalToolbarDescriptions.showAnnotation,
      size: 'large',
      props: {
        modelValue: annotationVisible,
        activeIcon: View,
        inactiveIcon: Hide,
        activeLabel: t('main.verticalToolbar.showAnnotation.text'),
        inactiveLabel: t('main.verticalToolbar.hideAnnotation.text'),
        activeValue: 'cmd-tool-rev-vis',
        inactiveValue: 'cmd-tool-rev-vis'
      }
    }
  ]

  const measureItems: RibbonItemModel[] = [
    {
      id: 'cmd-tool-measure-distance',
      type: 'button',
      label: t('main.verticalToolbar.measureDistance.text'),
      tooltip: verticalToolbarDescriptions.measureDistance,
      size: 'large',
      props: { icon: measureDistance }
    },
    {
      id: 'cmd-tool-measure-angle',
      type: 'button',
      label: t('main.verticalToolbar.measureAngle.text'),
      tooltip: verticalToolbarDescriptions.measureAngle,
      size: 'large',
      props: { icon: measureAngle }
    },
    {
      id: 'cmd-tool-measure-area',
      type: 'button',
      label: t('main.verticalToolbar.measureArea.text'),
      tooltip: verticalToolbarDescriptions.measureArea,
      size: 'large',
      props: { icon: measureArea }
    },
    {
      id: 'cmd-tool-measure-arc',
      type: 'button',
      label: t('main.verticalToolbar.measureArc.text'),
      tooltip: verticalToolbarDescriptions.measureArc,
      size: 'large',
      props: { icon: measureArc }
    },
    {
      id: 'cmd-tool-clear-measurements',
      type: 'button',
      label: t('main.verticalToolbar.clearMeasurements.text'),
      tooltip: verticalToolbarDescriptions.clearMeasurements,
      size: 'large',
      props: { icon: clearMeasurements }
    }
  ]

  const toolGroups: RibbonGroupModel[] = []

  if (openMode >= AcEdOpenMode.Review) {
    toolGroups.push({
      id: 'tools-annotation',
      title: t('main.ribbon.group.annotation'),
      orientation: 'row',
      collections: [
        {
          id: 'tools-annotation-main',
          layout: 'row',
          items: annotationItems
        }
      ]
    })
  }

  toolGroups.push({
    id: 'tools-measure',
    title: t('main.ribbon.group.measurement'),
    orientation: 'row',
    collections: [
      {
        id: 'tools-measure-main',
        layout: 'row',
        items: measureItems
      }
    ]
  })

  return markComponentConfigRaw([
    {
      id: 'home',
      title: t('main.ribbon.tab.home'),
      groups: [
        {
          id: 'home-draw',
          title: t('main.ribbon.group.draw'),
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
                  tooltip: ribbonTooltips.line,
                  size: 'large',
                  props: { icon: line }
                },
                {
                  id: 'cmd-polyline',
                  type: 'button',
                  label: t('main.ribbon.command.polyline'),
                  tooltip: ribbonTooltips.polyline,
                  size: 'large',
                  props: { icon: polyline }
                },
                {
                  id: 'cmd-spline',
                  type: 'button',
                  label: t('main.ribbon.command.spline'),
                  tooltip: ribbonTooltips.spline,
                  size: 'large',
                  props: { icon: spline }
                },
                {
                  id: 'cmd-circle',
                  type: 'dropdown',
                  label: t('main.ribbon.command.circle'),
                  tooltip: ribbonTooltips.circle,
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
                  tooltip: ribbonTooltips.arc,
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
                  id: 'cmd-ellipse',
                  type: 'dropdown',
                  label: t('main.ribbon.command.ellipse'),
                  tooltip: ribbonTooltips.ellipse,
                  size: 'large',
                  props: {
                    icon: ellipseCenter,
                    options: [
                      {
                        value: 'ellipse',
                        label: t('main.ribbon.ellipse.ellipse'),
                        icon: ellipseCenter
                      },
                      {
                        value: 'ellipse-arc',
                        label: t('main.ribbon.ellipse.arc'),
                        icon: ellipseArc
                      }
                    ]
                  }
                },
                {
                  id: 'cmd-rect',
                  type: 'dropdown',
                  label: t('main.ribbon.command.rect'),
                  tooltip: ribbonTooltips.rect,
                  size: 'large',
                  props: {
                    icon: rect,
                    options: [
                      {
                        value: 'rectang',
                        label: t('main.ribbon.command.rectangle'),
                        icon: rect
                      },
                      {
                        value: 'polygon',
                        label: t('main.ribbon.command.polygon'),
                        icon: polygon
                      }
                    ]
                  }
                },
                {
                  id: 'cmd-point',
                  type: 'button',
                  label: t('main.ribbon.command.point'),
                  tooltip: ribbonTooltips.point,
                  size: 'large',
                  props: {
                    icon: pointstyle1
                  }
                },
                {
                  id: 'cmd-hatch',
                  type: 'button',
                  label: t('main.ribbon.command.hatch'),
                  tooltip: ribbonTooltips.hatch,
                  size: 'large',
                  props: {
                    icon: hatch
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'home-modify',
          title: t('main.ribbon.group.modify'),
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
                  tooltip: ribbonTooltips.move,
                  size: 'large',
                  props: { icon: move }
                },
                {
                  id: 'cmd-rotate',
                  type: 'button',
                  label: t('main.ribbon.command.rotate'),
                  tooltip: ribbonTooltips.rotate,
                  size: 'large',
                  props: { icon: RefreshRight }
                },
                {
                  id: 'cmd-copy',
                  type: 'button',
                  label: t('main.ribbon.command.copy'),
                  tooltip: ribbonTooltips.copy,
                  size: 'large',
                  props: { icon: DocumentCopy }
                },
                {
                  id: 'cmd-erase',
                  type: 'button',
                  label: t('main.ribbon.command.erase'),
                  tooltip: ribbonTooltips.erase,
                  size: 'large',
                  props: { icon: Delete }
                }
              ]
            }
          ]
        },
        {
          id: 'home-properties',
          title: t('main.ribbon.group.properties'),
          orientation: 'row',
          autoWidth: true,
          priority: 20,
          collections: [
            {
              id: 'home-properties-button',
              layout: 'row',
              items: [
                {
                  id: 'cmd-properties',
                  type: 'button',
                  label: t('main.ribbon.command.properties'),
                  tooltip: ribbonTooltips.properties,
                  size: 'large',
                  props: { icon: properties }
                }
              ]
            },
            {
              id: 'home-properties-main',
              layout: 'column',
              rows: 3,
              items: [
                {
                  id: 'entity-color',
                  type: 'custom',
                  size: 'small',
                  tooltip: t('main.ribbon.property.color'),
                  props: {
                    component: MlRibbonPropertyColorDropdown,
                    componentProps: {
                      modelValue: ribbonColor.value,
                      displayColor: ribbonColorDisplay.value,
                      placeholder: t('main.ribbon.property.color'),
                      'onUpdate:modelValue': handleRibbonColorChange
                    }
                  }
                },
                {
                  id: 'entity-line-type',
                  type: 'custom',
                  size: 'small',
                  tooltip: t('main.ribbon.property.lineType'),
                  props: {
                    component: MlRibbonPropertyLineTypeSelect,
                    componentProps: {
                      modelValue: ribbonLineType.value,
                      placeholder: t('main.lineTypeSelect.placeholder'),
                      'onUpdate:modelValue': handleRibbonLineTypeChange
                    }
                  }
                },
                {
                  id: 'entity-line-weight',
                  type: 'custom',
                  size: 'small',
                  tooltip: t('main.ribbon.property.lineWeight'),
                  props: {
                    component: MlRibbonPropertyLineWeightSelect,
                    componentProps: {
                      modelValue: ribbonLineWeight.value,
                      'onUpdate:modelValue': handleRibbonLineWeightChange
                    }
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'home-layer',
          title: t('main.ribbon.group.layer'),
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
                  tooltip: verticalToolbarDescriptions.layer,
                  size: 'large',
                  props: { icon: layer }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'tools',
      title: t('main.ribbon.tab.tools'),
      groups: toolGroups
    }
  ])
}

const ribbonData = computed(() => {
  locale.value
  const openMode = docOpenMode.value
  const annotationVisible = isAnnotationVisible.value
  const commandByItemId = new Map<string, string>()
  commandByItemId.set('cmd-line', 'line')
  commandByItemId.set('cmd-polyline', 'pline')
  commandByItemId.set('cmd-spline', 'spline')
  commandByItemId.set('cmd-circle', 'circle')
  commandByItemId.set('circle-center-radius', 'circle')
  commandByItemId.set('circle-center-diameter', 'circle\\nDiameter')
  commandByItemId.set('circle-2-point', 'circle\\n2P')
  commandByItemId.set('circle-3-point', 'circle\\n3P')
  commandByItemId.set('circle-tan-tan-radius', 'circle')
  commandByItemId.set('circle-tan-tan-tan', 'circle')
  commandByItemId.set('cmd-arc', 'arc')
  commandByItemId.set('arc-3-point', 'arc\\n3 Point')
  commandByItemId.set('arc-start-center-end', 'arc\\nStart Center End')
  commandByItemId.set('arc-start-center-angle', 'arc\\nStart Center Angle')
  commandByItemId.set(
    'arc-start-center-length',
    'arc\\nStart Center Chord Length'
  )
  commandByItemId.set('arc-start-end-angle', 'arc\\nStart End Angle')
  commandByItemId.set('arc-start-end-direction', 'arc\\nStart End Direction')
  commandByItemId.set('arc-start-end-radius', 'arc\\nStart End Radius')
  commandByItemId.set('arc-center-start-end', 'arc\\nCenter Start End')
  commandByItemId.set('arc-center-start-angle', 'arc\\nCenter Start Angle')
  commandByItemId.set(
    'arc-center-start-length',
    'arc\\nCenter Start Chord Length'
  )
  commandByItemId.set('cmd-ellipse', 'ellipse')
  commandByItemId.set('ellipse', 'ellipse')
  commandByItemId.set('ellipse-arc', 'ellipse\\nArc')
  commandByItemId.set('cmd-rect', 'rectang')
  commandByItemId.set('rectang', 'rectang')
  commandByItemId.set('polygon', 'polygon')
  commandByItemId.set('cmd-point', 'point')
  commandByItemId.set('cmd-hatch', '-hatch')
  commandByItemId.set('cmd-move', 'move')
  commandByItemId.set('cmd-rotate', 'rotate')
  commandByItemId.set('cmd-copy', 'copy')
  commandByItemId.set('cmd-erase', 'erase')
  commandByItemId.set('cmd-layer', 'layer')
  commandByItemId.set('cmd-properties', 'properties')
  commandByItemId.set('cmd-tool-rev-freehand', 'sketch')
  commandByItemId.set('cmd-tool-rev-rect', 'revrect')
  commandByItemId.set('cmd-tool-rev-cloud', 'revcloud')
  commandByItemId.set('cmd-tool-rev-circle', 'revcircle')
  commandByItemId.set('cmd-tool-rev-vis', 'revvis')
  commandByItemId.set('cmd-tool-measure-distance', 'measuredistance')
  commandByItemId.set('cmd-tool-measure-angle', 'measureangle')
  commandByItemId.set('cmd-tool-measure-area', 'measurearea')
  commandByItemId.set('cmd-tool-measure-arc', 'measurearc')
  commandByItemId.set('cmd-tool-clear-measurements', 'clearmeasurements')

  const tabs: RibbonTabModel[] = buildBaseTabs(openMode, annotationVisible)
  return {
    tabs,
    commandByItemId
  }
})

const fileMenuItems = computed<FileMenuItemModel[]>(() => {
  locale.value
  return [
    {
      id: 'QNew',
      label: t('main.mainMenu.new')
    },
    {
      id: 'Open',
      label: t('main.mainMenu.open')
    },
    {
      id: 'Convert',
      label: t('main.mainMenu.export')
    }
  ]
})

const ribbonTexts = computed<RibbonLocaleTexts>(() => {
  locale.value
  return {
    fileMenuLabel: t('dialog.replacementDlg.file')
  }
})

const handleRibbonItemClick = (payload: {
  tabId: string
  groupId: string
  itemId: string
}) => {
  if (isRibbonDisabled.value) return
  const command = ribbonData.value.commandByItemId.get(payload.itemId)
  if (!command) return
  AcApDocManager.instance.sendStringToExecute(command)
}

const handleFileMenuSelect = (command: string) => {
  if (isRibbonDisabled.value) return
  if (command === 'Convert') {
    const cmd = new AcApConvertToDxfCmd()
    cmd.trigger(AcApDocManager.instance.context)
  } else if (command === 'QNew') {
    const cmd = new AcApQNewCmd()
    cmd.trigger(AcApDocManager.instance.context)
  } else if (command === 'Open') {
    const cmd = new AcApOpenCmd()
    cmd.trigger(AcApDocManager.instance.context)
  }
}
</script>

<template>
  <div
    v-if="features.isShowToolbar"
    :aria-disabled="isRibbonDisabled"
    class="ml-ribbon-toolbar-container"
  >
    <ml-ribbon
      :disabled="isRibbonDisabled"
      :file-menu-items="fileMenuItems"
      :minimized="false"
      :show-file-menu="true"
      :show-open-backstage="false"
      :tabs="ribbonData.tabs"
      :texts="ribbonTexts"
      size="small"
      hide-key-tips-toggle
      hide-layout-switcher
      @file-menu-select="handleFileMenuSelect"
      @item-click="handleRibbonItemClick"
    >
      <template #tabs-extra="{ disabled }">
        <ml-ribbon-language-selector
          v-if="features.isShowLanguageSelector"
          :current-locale="props.currentLocale"
          :disabled="disabled"
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
