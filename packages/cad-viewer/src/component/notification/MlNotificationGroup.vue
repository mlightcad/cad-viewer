<template>
  <div
    class="ml-notification-group"
    :class="`ml-notification-group--${group.type}`"
  >
    <div
      class="ml-notification-group-header"
      role="button"
      tabindex="0"
      @click="expanded = !expanded"
      @keydown.enter.prevent="expanded = !expanded"
      @keydown.space.prevent="expanded = !expanded"
    >
      <div class="ml-notification-group-icon">
        <el-icon>
          <component :is="typeIcon" />
        </el-icon>
      </div>
      <div class="ml-notification-group-content">
        <div class="ml-notification-group-title-row">
          <h4 class="ml-notification-group-title">{{ title }}</h4>
          <el-button
            text
            size="small"
            class="ml-notification-group-clear"
            @click.stop="$emit('clear')"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <p class="ml-notification-group-summary">{{ summary }}</p>
      </div>
      <el-icon class="ml-notification-group-chevron">
        <ArrowDown v-if="expanded" />
        <ArrowRight v-else />
      </el-icon>
    </div>

    <div v-if="expanded" class="ml-notification-group-items">
      <ml-notification-item
        v-for="notification in group.items"
        :key="notification.id"
        :notification="notification"
        @close="$emit('close-item', notification.id)"
        @action="forwardAction"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  ArrowRight,
  CircleCloseFilled,
  Close,
  InfoFilled,
  SuccessFilled,
  WarningFilled
} from '@element-plus/icons-vue'
import { ElButton, ElIcon } from 'element-plus'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  NotificationAction,
  NotificationGroup,
  NotificationSource
} from '../../composable/useNotificationCenter'
import MlNotificationItem from './MlNotificationItem.vue'

interface Props {
  group: NotificationGroup
  /** When true, the group body starts expanded. Defaults to collapsed. */
  defaultExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpanded: false
})

const emit = defineEmits<{
  clear: []
  'close-item': [id: string]
  action: [action: NotificationAction]
}>()

const { t } = useI18n()
const expanded = ref(props.defaultExpanded)

const forwardAction = (action: NotificationAction) => {
  emit('action', action)
}

const typeIcon = computed(() => {
  switch (props.group.type) {
    case 'info':
      return InfoFilled
    case 'warning':
      return WarningFilled
    case 'error':
      return CircleCloseFilled
    case 'success':
      return SuccessFilled
    default:
      return InfoFilled
  }
})

const sourceTitleKey: Record<NotificationSource, string> = {
  'font-missed': 'main.notification.group.fontMissed',
  'unsupported-entities': 'main.notification.group.unsupportedEntities'
}

const title = computed(() => {
  const source = props.group.source
  if (source && sourceTitleKey[source]) {
    return t(sourceTitleKey[source])
  }
  return props.group.items[0]?.title ?? ''
})

const summary = computed(() => {
  const count = props.group.items.length
  const source = props.group.source
  if (source === 'font-missed') {
    return t('main.notification.group.fontMissedSummary', { count })
  }
  if (source === 'unsupported-entities') {
    return t('main.notification.group.unsupportedEntitiesSummary', { count })
  }
  return t('main.notification.group.genericSummary', { count })
})
</script>

<style scoped>
.ml-notification-group {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ml-notification-group:last-child {
  border-bottom: none;
}

.ml-notification-group-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.ml-notification-group-header:hover {
  background-color: var(--el-fill-color-light);
}

.ml-notification-group-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.ml-notification-group--info .ml-notification-group-icon {
  color: var(--el-color-info);
}

.ml-notification-group--warning .ml-notification-group-icon {
  color: var(--el-color-warning);
}

.ml-notification-group--error .ml-notification-group-icon {
  color: var(--el-color-danger);
}

.ml-notification-group--success .ml-notification-group-icon {
  color: var(--el-color-success);
}

.ml-notification-group-content {
  flex: 1;
  min-width: 0;
}

.ml-notification-group-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.ml-notification-group-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.ml-notification-group-summary {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
}

.ml-notification-group-clear {
  padding: 4px;
  min-width: auto;
  width: 28px;
  height: 28px;
}

.ml-notification-group-chevron {
  flex-shrink: 0;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}

.ml-notification-group-items {
  background: var(--el-fill-color-blank);
  border-top: 1px solid var(--el-border-color-extra-light);
}

.ml-notification-group-items :deep(.ml-notification-item) {
  padding-left: 28px;
  background: transparent;
}

.dark .ml-notification-group-header:hover {
  background-color: var(--el-fill-color-darker);
}
</style>
