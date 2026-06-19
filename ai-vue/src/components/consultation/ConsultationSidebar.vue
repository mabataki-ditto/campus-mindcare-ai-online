<template>
  <div class="sidebar">
    <AssistantCard :icon-url="assistantIcon" />
    <EmotionPanel :emotion="currentEmotion" :get-intensity-class="getIntensityClass" :get-risk-text="getRiskText" />
    <SessionList
      :session-list="sessionList"
      :active-session-id="currentSession?.sessionId || ''"
      @select-session="$emit('select-session', $event)"
      @delete-session="$emit('delete-session', $event)"
    />
  </div>
</template>

<script setup>
import AssistantCard from './AssistantCard.vue'
import EmotionPanel from './EmotionPanel.vue'
import SessionList from './SessionList.vue'

defineProps({
  assistantIcon: {
    type: String,
    required: true
  },
  currentEmotion: {
    type: Object,
    required: true
  },
  getIntensityClass: {
    type: Function,
    required: true
  },
  getRiskText: {
    type: Function,
    required: true
  },
  sessionList: {
    type: Array,
    default: () => []
  },
  currentSession: {
    type: Object,
    default: null
  }
})

defineEmits(['select-session', 'delete-session'])
</script>

<style lang="scss" scoped>
.sidebar {
  width: 320px;
}
</style>
