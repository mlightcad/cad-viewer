<template>
  <el-tooltip
    :content="t('main.statusBar.notification.tooltip')"
    :hide-after="0"
  >
    <el-button
      class="ml-notification-button"
      :icon="Bell"
      @click="toggleNotificationCenter"
    >
      <el-badge
        v-if="unreadCount > 0"
        :value="unreadCount"
        :max="99"
        class="ml-notification-badge"
      />
    </el-button>
  </el-tooltip>
</template>

<script setup lang="ts">
import { Bell } from '@element-plus/icons-vue'
import { ElBadge, ElButton, ElTooltip } from 'element-plus'
import { useI18n } from 'vue-i18n'

import { useNotificationCenter } from '../../composable/useNotificationCenter'

const { t } = useI18n()
const { unreadCount } = useNotificationCenter()

const emit = defineEmits<{
  click: []
}>()

const toggleNotificationCenter = () => {
  emit('click')
}
</script>

<style scoped>
.ml-notification-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: 30px;
  position: relative;
}

.ml-notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
}

.ml-notification-badge :deep(.el-badge__content) {
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
}
</style>
