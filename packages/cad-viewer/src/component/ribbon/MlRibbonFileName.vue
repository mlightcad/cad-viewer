<template>
  <div v-if="displayName" class="ml-ribbon-file-name">
    {{ displayName }}
  </div>
</template>

<script setup lang="ts">
import { useDocument } from '../../composable'

const { displayName } = useDocument()
</script>

<style scoped>
.ml-ribbon-file-name {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  max-width: min(40%, 320px);
  height: 40px;
  padding: 0 8px;
  color: var(--el-text-color-regular);
  font-size: var(--el-font-size-small);
  line-height: 1.2;
  text-align: center;
  pointer-events: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transform: translateX(-50%);
}
</style>
