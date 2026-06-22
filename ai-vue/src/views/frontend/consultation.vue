<template>
  <div class="consultation-container">
    <!-- 移动端遮罩 -->
    <div v-show="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>
    <!-- 侧边栏容器（移动端为抽屉） -->
    <div class="sidebar-wrapper" :class="{ open: sidebarOpen }">
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
    </div>

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
    >
      <template #mobile-toggle>
        <el-button class="mobile-sidebar-btn" circle @click="sidebarOpen = true">
          <el-icon><Menu /></el-icon>
        </el-button>
      </template>
    </ChatPanel>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
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

const sidebarOpen = ref(false)

const handleFileSelect = (file) => {
  attachedFile.value = file
}

const handleFileRemove = () => {
  attachedFile.value = null
}

const handleSelectSession = async (session) => {
  await handleSessionClick(session, loadSessionEmotion)
  sidebarOpen.value = false
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
  max-width: 1200px;
  width: 100%;
  display: flex;
  gap: 20px;
  padding: 20px;
  position: relative;
}

.sidebar-overlay {
  display: none;
}

.mobile-sidebar-btn {
  display: none;
}

@media (max-width: 768px) {
  .consultation-container {
    padding: 10px;
    gap: 10px;
    height: calc(100dvh - 120px);
  }
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 999;
  }
  .sidebar-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    z-index: 1000;
    overflow-y: auto;
    background: #fff;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
    :deep(.sidebar) {
      width: 280px;
    }
    &.open {
      transform: translateX(0);
    }
  }
  .mobile-sidebar-btn {
    display: inline-flex;
  }
}
</style>
