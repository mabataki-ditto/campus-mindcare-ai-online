<template>
  <div class="consultation-container">
    <ConsultationSidebar
      :assistant-icon="assistantIcon"
      :current-emotion="currentEmotion"
      :get-intensity-class="getIntensityClass"
      :get-risk-text="getRiskText"
      :session-list="sessionList"
      :current-session="currentSession"
      @select-session="handleSelectSession"
      @delete-session="handleDeleteSession"
    />

    <ChatPanel
      :header-icon="headerIcon"
      :ai-icon="assistantIcon"
      :user-icon="userIcon"
      :messages="messages"
      :is-ai-typing="isAiTyping"
      :user-message="userMessage"
      :tool-call-status="toolCallStatus"
      :attached-file="attachedFile"
      @new-session="createNewFrontendSession"
      @send="sendMessage"
      @update:user-message="userMessage = $event"
      @file-select="handleFileSelect"
      @file-remove="handleFileRemove"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import ChatPanel from '@/components/consultation/ChatPanel.vue'
import ConsultationSidebar from '@/components/consultation/ConsultationSidebar.vue'
import { useConsultationEmotion } from '@/composables/useConsultationEmotion'
import { useConsultationSessions } from '@/composables/useConsultationSessions'
import { useConsultationStream } from '@/composables/useConsultationStream'

const assistantIcon = new URL('@/assets/images/robot-fill.png', import.meta.url).href
const headerIcon = new URL('@/assets/images/like.png', import.meta.url).href
const userIcon = new URL('@/assets/images/users.png', import.meta.url).href

const { currentEmotion, loadSessionEmotion, getIntensityClass, getRiskText } = useConsultationEmotion()

const {
  currentSession,
  sessionList,
  messages,
  createNewFrontendSession,
  getSessionPage,
  handleSessionClick,
  handleDeleteSession
} = useConsultationSessions()

const { userMessage, isAiTyping, toolCallStatus, attachedFile, sendMessage, cancelRequest } = useConsultationStream({
  currentSession,
  messages,
  getSessionPage,
  loadSessionEmotion
})

const handleFileSelect = (file) => {
  attachedFile.value = file
}

const handleFileRemove = () => {
  attachedFile.value = null
}

const handleSelectSession = async (session) => {
  await handleSessionClick(session, loadSessionEmotion)
}

onMounted(async () => {
  await getSessionPage()
  createNewFrontendSession()
})

onUnmounted(() => {
  cancelRequest()
})
</script>

<style lang="scss" scoped>
.consultation-container {
  margin: 0 auto;
  width: 1200px;
  display: flex;
  gap: 20px;
  padding: 20px;
}
</style>
