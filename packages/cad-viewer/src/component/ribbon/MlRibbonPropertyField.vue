<template>
  <section
    class="ml-ribbon-property-field"
    :class="[
      variant ? `ml-ribbon-property-field--${variant}` : '',
      { 'ml-ribbon-property-field--disabled': disabled }
    ]"
    :aria-disabled="disabled"
  >
    <span class="ml-ribbon-property-field__icon" aria-hidden="true">
      <component :is="icon" />
    </span>
    <div class="ml-ribbon-property-field__control">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Visual variants supported by the shared ribbon property field shell.
 */
type RibbonPropertyFieldVariant = 'color' | 'line-type' | 'line-weight'

/**
 * Props shared by ribbon property field wrappers.
 */
interface RibbonPropertyFieldProps {
  /** Icon rendered beside the embedded control. */
  icon: string | Component
  /** Disables the field while preserving its current value display. */
  disabled?: boolean
  /** Variant-specific styling hook used by the ribbon layout. */
  variant?: RibbonPropertyFieldVariant
}

defineProps<RibbonPropertyFieldProps>()
</script>

<style scoped>
.ml-ribbon-property-field {
  --ml-ribbon-property-scale: var(--ml-rb-scale, 1);
  --ml-ribbon-property-gap: calc(6px * var(--ml-ribbon-property-scale));
  --ml-ribbon-property-icon-size: calc(18px * var(--ml-ribbon-property-scale));
  --ml-ribbon-property-column-width: calc(
    188px * var(--ml-ribbon-property-scale)
  );
  display: inline-flex;
  align-items: center;
  gap: var(--ml-ribbon-property-gap);
  width: 100%;
  min-height: var(--ml-rb-compact-height, 28px);
}

.ml-ribbon-property-field--disabled {
  opacity: 0.7;
}

.ml-ribbon-property-field__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--ml-ribbon-property-icon-size);
  height: var(--ml-ribbon-property-icon-size);
  flex: 0 0 var(--ml-ribbon-property-icon-size);
  color: var(--el-text-color-secondary);
}

.ml-ribbon-property-field__icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.ml-ribbon-property-field--line-type
  .ml-ribbon-property-field__icon
  :deep(path),
.ml-ribbon-property-field--line-weight
  .ml-ribbon-property-field__icon
  :deep(path),
.ml-ribbon-property-field--line-type
  .ml-ribbon-property-field__icon
  :deep(rect),
.ml-ribbon-property-field--line-weight
  .ml-ribbon-property-field__icon
  :deep(rect) {
  fill: currentColor;
  stroke: currentColor;
}

.ml-ribbon-property-field__control {
  flex: 1 1 auto;
  min-width: var(--ml-ribbon-property-column-width);
  width: var(--ml-ribbon-property-column-width);
  max-width: var(--ml-ribbon-property-column-width);
}

.ml-ribbon-property-field__control :deep(.el-select),
.ml-ribbon-property-field__control :deep(.el-dropdown) {
  width: 100%;
}
</style>
