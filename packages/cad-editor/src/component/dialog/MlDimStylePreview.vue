<template>
  <svg
    class="ml-dim-preview"
    :viewBox="`0 0 ${DIM_PREVIEW_WIDTH} ${DIM_PREVIEW_HEIGHT}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <line
      v-for="(line, index) in scene.lines"
      :key="`line-${index}`"
      :x1="line.x1"
      :y1="line.y1"
      :x2="line.x2"
      :y2="line.y2"
      :stroke="line.stroke"
      :stroke-width="line.strokeWidth"
      stroke-linecap="butt"
    />
    <path
      v-for="(path, index) in scene.paths"
      :key="`path-${index}`"
      :d="path.d"
      :stroke="path.stroke"
      :stroke-width="path.strokeWidth"
      :fill="path.fill"
      stroke-linejoin="round"
    />
    <circle
      v-for="(circle, index) in scene.circles"
      :key="`circle-${index}`"
      :cx="circle.cx"
      :cy="circle.cy"
      :r="circle.r"
      :stroke="circle.stroke"
      :stroke-width="circle.strokeWidth"
      :fill="circle.fill"
    />
    <g
      v-for="(text, index) in scene.texts"
      :key="`text-${index}`"
      :transform="textTransform(text)"
    >
      <rect
        v-if="text.box"
        :x="text.box.x"
        :y="text.box.y"
        :width="text.box.w"
        :height="text.box.h"
        :fill="text.background || 'none'"
        :stroke="text.frame || 'none'"
        stroke-width="1"
        stroke-linejoin="miter"
      />
      <text
        :x="text.x"
        :y="text.y"
        :font-size="text.fontSize"
        :text-anchor="text.textAnchor"
        :fill="text.fill"
      >
        {{ text.text }}
      </text>
    </g>
  </svg>
</template>

<script lang="ts" setup>
import type { AcDbDimStyleTableRecord } from '@mlightcad/data-model'
import { computed } from 'vue'

import {
  buildDimStylePreview,
  DIM_PREVIEW_HEIGHT,
  DIM_PREVIEW_WIDTH,
  type DimPreviewText
} from './dimStylePreview'

const props = withDefaults(
  defineProps<{
    record?: AcDbDimStyleTableRecord
    /** Bump this value after mutating the record in place to refresh the preview. */
    revision?: number
  }>(),
  { revision: 0 }
)

const scene = computed(() => {
  // `revision` is intentionally read so in-place DIMSTYLE edits invalidate the scene.
  void props.revision
  return buildDimStylePreview(props.record)
})

/**
 * Combined transform for dimension texts: mirrored (right-to-left viewing
 * direction) and rotated (aligned with the dimension line). Geometry is
 * mirrored around the text anchor so both the text and its background frame
 * stay in place.
 */
function textTransform(text: DimPreviewText): string {
  const parts: string[] = []
  if (text.mirror) {
    parts.push(`translate(${2 * text.x} 0)`, 'scale(-1 1)')
  }
  if (text.rotation) {
    parts.push(`rotate(${text.rotation} ${text.x} ${text.y})`)
  }
  return parts.length > 0 ? parts.join(' ') : ''
}
</script>

<style scoped>
.ml-dim-preview {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 420 / 250;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  font-family: inherit;
  user-select: none;
}
</style>
