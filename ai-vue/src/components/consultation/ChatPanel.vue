<template>
  <div class="chat-main">
    <div class="chat-header">
      <div class="header-left">
        <div class="chat-avatar">
          <el-image :src="headerIcon" style="width: 30px; height: 30px" />
        </div>
        <div class="chat-info">
          <h2>曼波AI助手</h2>
          <p>您的贴心AI心理健康助手</p>
        </div>
      </div>
      <div class="header-actions">
        <slot name="mobile-toggle"></slot>
        <el-button circle title="新建会话" @click="$emit('new-session')">
          <el-icon>
            <Plus />
          </el-icon>
        </el-button>
      </div>
    </div>

    <ChatMessageList :messages="messages" :is-ai-typing="isAiTyping" :ai-icon="aiIcon" :user-icon="userIcon" />

    <!-- riskLevel=1 温馨提示条 -->
    <div v-if="alertState.visible && alertState.riskLevel === 1" class="gentle-tip">
      <el-icon><InfoFilled /></el-icon>
      <span>{{ alertState.reason || '如果你感到不适，随时可以寻求帮助，我们一直在你身边。' }}</span>
      <el-icon class="close-tip" @click="handleAlertClose"><Close /></el-icon>
    </div>

    <div v-if="toolCallStatus" class="tool-call-status">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>{{ toolCallStatus }}</span>
    </div>

    <ChatInputBox
      :model-value="userMessage"
      :disabled="isAiTyping"
      :attached-file="attachedFile"
      @update:model-value="$emit('update:userMessage', $event)"
      @send="$emit('send')"
      @file-select="$emit('file-select', $event)"
      @file-remove="$emit('file-remove')"
    />

    <AlertCard
      v-if="alertState.visible && alertState.riskLevel >= 2"
      :risk-level="alertState.riskLevel"
      :reason="alertState.reason"
      @close="handleAlertClose"
    />
  </div>
</template>

<script setup>
import ChatInputBox from './ChatInputBox.vue'
import ChatMessageList from './ChatMessageList.vue'
import AlertCard from './AlertCard.vue'
import { alertState } from '@/composables/useToolCalls'

const handleAlertClose = () => {
  alertState.visible = false
}

defineProps({
  headerIcon: {
    type: String,
    required: true
  },
  aiIcon: {
    type: String,
    required: true
  },
  userIcon: {
    type: String,
    required: true
  },
  messages: {
    type: Array,
    default: () => []
  },
  isAiTyping: {
    type: Boolean,
    default: false
  },
  userMessage: {
    type: String,
    default: ''
  },
  toolCallStatus: {
    type: String,
    default: ''
  },
  attachedFile: {
    type: [File, null],
    default: null
  }
})

defineEmits(['new-session', 'send', 'update:userMessage', 'file-select', 'file-remove'])
</script>

<style lang="scss" scoped>
.chat-main {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 252, 250, 0.98) 100%);
  border-radius: 20px;
  box-shadow:
    0 12px 40px rgba(251, 146, 60, 0.08),
    0 4px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(251, 146, 60, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;

  .chat-header {
    background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%);
    color: white;
    padding: 20px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    flex-shrink: 0;

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-left {
      display: flex;
      align-items: center;

      .chat-avatar {
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        position: relative;
        z-index: 1;
      }

      .chat-info {
        h2 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        p {
          font-size: 14px;
        }
      }
    }
  }
  .tool-call-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 20px;
    background: rgba(251, 146, 60, 0.06);
    color: #fb923c;
    font-size: 13px;
    border-top: 1px solid rgba(251, 146, 60, 0.1);
  }

  .gentle-tip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: rgba(144, 147, 153, 0.06);
    color: #909399;
    font-size: 13px;
    border-top: 1px solid rgba(144, 147, 153, 0.1);

    .close-tip {
      margin-left: auto;
      cursor: pointer;
      &:hover {
        color: #606266;
      }
    }
  }
}

@media (max-width: 768px) {
  .chat-main {
    border-radius: 12px;
    overflow: hidden;

    .chat-header {
      padding: 14px 15px;
      flex-shrink: 0;
    }

    :deep(.chat-messages) {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }
  }
}
</style>
