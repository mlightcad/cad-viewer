<template>
  <div
    class="ml-mleader-preview-wrap"
    :style="{ backgroundColor: backgroundCss }"
  >
    <svg
      class="ml-mleader-preview"
      :viewBox="`0 0 ${MLEADER_PREVIEW_WIDTH} ${MLEADER_PREVIEW_HEIGHT}`"
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
      <g v-for="(text, index) in scene.texts" :key="`text-${index}`">
        <rect
          v-if="text.box"
          :x="text.box.x"
          :y="text.box.y"
          :width="text.box.w"
          :height="text.box.h"
          fill="none"
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
  </div>
</template>

<script lang="ts" setup>
import type { AcDbMLeaderStyle } from '@mlightcad/data-model'
import { computed } from 'vue'

import {
  acuiRgbToCss,
  buildMLeaderStylePreview,
  MLEADER_PREVIEW_HEIGHT,
  MLEADER_PREVIEW_WIDTH
} from './mleaderStylePreview'

const props = withDefaults(
  defineProps<{
    style?: AcDbMLeaderStyle
    /** Packed 24-bit RGB matching the current canvas background. */
    backgroundRgb?: number
    /** Bump after in-place style edits to refresh the preview. */
    revision?: number
  }>(),
  { revision: 0 }
)

const backgroundCss = computed(() => acuiRgbToCss(props.backgroundRgb))

const scene = computed(() => {
  void props.revision
  return buildMLeaderStylePreview(props.style)
})
</script>

<style scoped>
.ml-mleader-preview-wrap {
  display: block;
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 2px;
  overflow: hidden;
}

.ml-mleader-preview {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 280 / 200;
  font-family: inherit;
  user-select: none;
}
</style>
