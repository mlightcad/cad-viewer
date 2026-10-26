<template>
  <!-- Dynamically render all registered dialogs -->
  <div v-for="dialog in dialogs" :key="dialog.name">
    <component
      :is="dialog.component"
      v-model="dialog.visible"
      v-bind="dialog.props"
    />
  </div>
</template>

<script lang="ts" setup>
import { useDialogManager } from '../../composable'

const { dialogs, toggleDialog, registerDialog } = useDialogManager()

defineExpose({
  toggleDialog,
  registerDialog
})
</script>
