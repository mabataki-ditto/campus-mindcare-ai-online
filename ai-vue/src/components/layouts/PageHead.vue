<template>
  <div class="page-head">
    <p class="page-title">{{ title }}</p>
    <div class="action-btn">
      <slot name="buttons"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string }>(), {
  title: '页面标题'
})

defineSlots<{
  buttons?: () => unknown
}>()
</script>

<style lang="scss" scoped>
.page-head {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .page-title {
    // margin: 0px;
    font-size: 24px;
    color: #2d3748;
  }
}
</style>
