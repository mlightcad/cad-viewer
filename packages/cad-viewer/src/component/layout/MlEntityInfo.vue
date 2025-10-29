<template>
  <el-card v-if="visible" ref="cardRef" class="ml-entity-info">
    <el-row class="ml-entity-info-text">
      <el-col :span="24">
        <el-text size="small" class="ml-entity-info-title">
          {{ info.type }}
        </el-text>
      </el-col>
    </el-row>
    <el-row class="ml-entity-info-text">
      <el-col :span="10">
        <el-text size="small">{{ t('main.entityInfo.color') }}</el-text>
      </el-col>
      <el-col :span="14">
        <el-text size="small">{{ info.color }}</el-text>
      </el-col>
    </el-row>
    <el-row class="ml-entity-info-text">
      <el-col :span="10">
        <el-text size="small">{{ t('main.entityInfo.layer') }}</el-text>
      </el-col>
      <el-col :span="14">
        <el-text size="small">{{ info.layer }}</el-text>
      </el-col>
    </el-row>
    <el-row class="ml-entity-info-text">
      <el-col :span="10">
        <el-text size="small">{{ t('main.entityInfo.lineType') }}</el-text>
      </el-col>
      <el-col :span="14">
        <el-text size="small">{{ info.lineType }}</el-text>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  AcEdViewHoverEventArgs
} from '@mlightcad/cad-simple-viewer'
import { AcDbObjectId } from '@mlightcad/data-model'
import {
  ComponentPublicInstance,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref
} from 'vue'
import { useI18n } from 'vue-i18n'

import { colorName, entityName } from '../../locale'

interface EntityInfo {
  type: string
  color: string
  layer: string
  lineType: string
}

const { t } = useI18n()
const hovered = ref(false)
const x = ref(-1)
const y = ref(-1)
const id = ref<AcDbObjectId | null>(null)
const cardRef = ref<ComponentPublicInstance<{}, HTMLElement> | null>(null)

const cardWidth = ref(180)
const cardHeight = ref(120)

const left = computed(() => `${x.value}px`)
const top = computed(() => `${y.value}px`)

const info = computed<EntityInfo>(() => {
  const db = AcApDocManager.instance.curDocument.database
  if (id.value) {
    const entity = db.tables.blockTable.modelSpace.getIdAt(id.value)
    if (entity) {
      return {
        type: entityName(entity),
        color: colorName(entity.color.toString()),
        layer: entity.layer,
        lineType: entity.lineType
      }
    }
  }
  return { type: '', color: '', layer: '', lineType: '' }
})

const visible = computed(() => hovered.value && info.value.type !== '')

const updateHoverInfo = async (args: AcEdViewHoverEventArgs) => {
  id.value = args.id
  hovered.value = true

  await nextTick()

  // ✅ Element Plus component instance → get DOM element via $el
  const el = cardRef.value?.$el as HTMLElement | undefined
  if (el) {
    cardWidth.value = el.offsetWidth
    cardHeight.value = el.offsetHeight
  }

  const margin = 8
  const maxX = window.innerWidth - cardWidth.value - margin
  const maxY = window.innerHeight - cardHeight.value - margin
  const minX = margin
  const minY = margin

  x.value = Math.min(Math.max(args.x, minX), maxX)
  y.value = Math.min(Math.max(args.y, minY), maxY)
}

const hideHoverInfo = () => {
  hovered.value = false
}

onMounted(() => {
  const events = AcApDocManager.instance.curView.events
  events.hover.addEventListener(updateHoverInfo)
  events.unhover.addEventListener(hideHoverInfo)
})

onUnmounted(() => {
  const events = AcApDocManager.instance.curView.events
  events.hover.removeEventListener(updateHoverInfo)
  events.unhover.removeEventListener(hideHoverInfo)
})
</script>

<style scoped>
.ml-entity-info {
  position: fixed;
  left: v-bind(left);
  top: v-bind(top);
  width: 180px;
  margin: 0;
  transition: none !important;
}
.ml-entity-info-title {
  font-weight: bold;
}
.ml-entity-info-text {
  margin-bottom: 6px;
  margin-top: 6px;
}
</style>
