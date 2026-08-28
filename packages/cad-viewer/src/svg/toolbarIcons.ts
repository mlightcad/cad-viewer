/**
 * Vue wrappers around shared toolbar SVG strings.
 *
 * Drawing-command glyphs unique to the Vue editor stay as local `.svg` files.
 */

import {
  ICON_ANNOTATION,
  ICON_ANNOTATION_HIDE,
  ICON_ANNOTATION_SHOW,
  ICON_CLEAR_MARKUPS,
  ICON_CLEAR_MEASUREMENTS,
  ICON_LAYER,
  ICON_MARKUP_ARROW,
  ICON_MARKUP_CALLOUT,
  ICON_MARKUP_CIRCLE,
  ICON_MARKUP_CLOUD,
  ICON_MARKUP_EXPORT,
  ICON_MARKUP_IMPORT,
  ICON_MARKUP_LINE,
  ICON_MARKUP_PANEL,
  ICON_MARKUP_RECT,
  ICON_MARKUP_STAMP,
  ICON_MARKUP_TEXT,
  ICON_MEASURE,
  ICON_MEASURE_ANGLE,
  ICON_MEASURE_ARC,
  ICON_MEASURE_AREA,
  ICON_MEASURE_DISTANCE,
  ICON_MEASURE_POINT,
  ICON_PAN,
  ICON_READING_MODE,
  ICON_SELECT,
  ICON_SWITCH_BG,
  ICON_ZOOM_EXTENT,
  ICON_ZOOM_WINDOW
} from '@mlightcad/cad-simple-viewer/icons'

import { acapSvgIcon } from './acapSvgIcon'

export const select = acapSvgIcon(ICON_SELECT, 'IconSelect')
export const pan = acapSvgIcon(ICON_PAN, 'IconPan')
export const zoomToExtent = acapSvgIcon(ICON_ZOOM_EXTENT, 'IconZoomToExtent')
export const zoomToBox = acapSvgIcon(ICON_ZOOM_WINDOW, 'IconZoomToBox')
export const layer = acapSvgIcon(ICON_LAYER, 'IconLayer')
export const switchBg = acapSvgIcon(ICON_SWITCH_BG, 'IconSwitchBg')
export const readingMode = acapSvgIcon(ICON_READING_MODE, 'IconReadingMode')
export const measure = acapSvgIcon(ICON_MEASURE, 'IconMeasure')
export const measureDistance = acapSvgIcon(
  ICON_MEASURE_DISTANCE,
  'IconMeasureDistance'
)
export const measureAngle = acapSvgIcon(ICON_MEASURE_ANGLE, 'IconMeasureAngle')
export const measureArea = acapSvgIcon(ICON_MEASURE_AREA, 'IconMeasureArea')
export const measureArc = acapSvgIcon(ICON_MEASURE_ARC, 'IconMeasureArc')
export const measurePoint = acapSvgIcon(ICON_MEASURE_POINT, 'IconMeasurePoint')
export const clearMeasurements = acapSvgIcon(
  ICON_CLEAR_MEASUREMENTS,
  'IconClearMeasurements'
)
export const importIcon = acapSvgIcon(ICON_MARKUP_IMPORT, 'IconImport')
export const exportIcon = acapSvgIcon(ICON_MARKUP_EXPORT, 'IconExport')
export const markupTools = acapSvgIcon(ICON_ANNOTATION, 'IconMarkupTools')
export const revCloud = acapSvgIcon(ICON_MARKUP_CLOUD, 'IconRevCloud')
export const markupCallout = acapSvgIcon(ICON_MARKUP_CALLOUT, 'IconMarkupCallout')
export const revText = acapSvgIcon(ICON_MARKUP_TEXT, 'IconRevText')
export const revRect = acapSvgIcon(ICON_MARKUP_RECT, 'IconRevRect')
export const revCircle = acapSvgIcon(ICON_MARKUP_CIRCLE, 'IconRevCircle')
export const markupArrow = acapSvgIcon(ICON_MARKUP_ARROW, 'IconMarkupArrow')
export const markupLine = acapSvgIcon(ICON_MARKUP_LINE, 'IconMarkupLine')
export const markupStamp = acapSvgIcon(ICON_MARKUP_STAMP, 'IconMarkupStamp')
export const markupPanel = acapSvgIcon(ICON_MARKUP_PANEL, 'IconMarkupPanel')
export const markupShow = acapSvgIcon(ICON_ANNOTATION_SHOW, 'IconMarkupShow')
export const markupHide = acapSvgIcon(ICON_ANNOTATION_HIDE, 'IconMarkupHide')
export const clearMarkups = acapSvgIcon(ICON_CLEAR_MARKUPS, 'IconClearMarkups')
