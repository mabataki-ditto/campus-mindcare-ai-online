<template>
  <div class="chat-messages" ref="messagesRef">
    <div v-if="messages.length === 0" class="message-item ai-message">
      <div class="message-avatar">
        <el-image :src="aiIcon" style="width: 18px; height: 18px" alt="AI助手" />
      </div>
      <div class="message-content">
        <div class="message-bubble">
          <p>
            您好！我是曼波，您的AI心理健康助手。很高兴陪伴您，为您提供温暖的心理支持。请告诉我，今天您觉得怎么样？有什么想要分享的吗？
          </p>
        </div>
        <div class="message-time">刚刚</div>
      </div>
    </div>

    <div
      v-for="msg in messages"
      :key="msg.id"
      class="message-item"
      :class="msg.senderType === 1 ? 'user-message' : 'ai-message'"
    >
      <div class="message-avatar">
        <el-image v-if="msg.senderType === 1" style="width: 18px; height: 18px" :src="userIcon" />
        <el-image v-else style="width: 18px; height: 18px" :src="aiIcon" />
      </div>
      <div class="message-content">
        <div class="message-bubble">
          <div v-if="msg.senderType === 2 && isAiTyping && !msg.content" class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
          <div v-else-if="msg.isError" class="error-message">
            <p>{{ msg.content }}</p>
          </div>
          <MarkdownRenderer v-else-if="msg.senderType === 2" :content="msg.content" :is-ai-message="true" />
          <p v-else-if="msg.content" class="user-text">{{ msg.content }}</p>
        </div>
        <div v-if="msg.senderType === 2 && msg.references?.length" class="message-references">
          <div class="references-title">参考来源</div>
          <router-link
            v-for="reference in msg.references"
            :key="`${reference.articleId}-${reference.chunkId}`"
            class="reference-item"
            :to="`/knowledge/article/${reference.articleId}`"
          >
            <span class="reference-index">[{{ reference.index }}]</span>
            <span class="reference-body">
              <span class="reference-title">{{ reference.title }}</span>
              <span class="reference-snippet">{{ reference.snippet }}</span>
            </span>
          </router-link>
        </div>
        <div class="message-time">{{ msg.senderType === 2 && isAiTyping ? '正在输入中...' : formatRelativeTime(msg.createdAt) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import { ref, watch, nextTick } from 'vue'
import { formatRelativeTime } from '@/utils/formatDate'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  isAiTyping: {
    type: Boolean,
    default: false
  },
  aiIcon: {
    type: String,
    required: true
  },
  userIcon: {
    type: String,
    required: true
  }
})

const messagesRef = ref(null)

// 消息变化时自动滚动到底部
watch(
  () => props.messages,
  () => {
    nextTick(() => {
      if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight
      }
    })
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 252, 248, 0.05) 100%);
  min-height: 0;
  max-height: calc(100vh - 200px);
  scrollbar-width: thin;
  scrollbar-color: rgba(251, 146, 60, 0.3) transparent;

  .user-text {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .message-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: white;
      flex-shrink: 0;
    }

    &.ai-message {
      .message-avatar {
        background: linear-gradient(135deg, #fb923c, #f59e0b);
        box-shadow: 0 4px 12px rgba(251, 146, 60, 0.3);
      }
    }

    &.user-message {
      flex-direction: row-reverse;
      align-self: flex-end;

      .message-avatar {
        background: linear-gradient(135deg, #6b7280, #4b5563);
        box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
      }

      .message-content {
        align-items: flex-end;

        .message-bubble {
          background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%);
          border-color: rgba(251, 146, 60, 0.3);
          color: #fff;

          .user-text {
            color: #fff;
          }
        }

        .message-time {
          text-align: right;
        }
      }
    }

    .message-content {
      max-width: 70%;

      .message-bubble {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 252, 248, 0.95) 100%);
        border-radius: 16px;
        padding: 12px 16px;
        position: relative;
        animation: fadeInUp 0.4s ease-out;
        border: 1px solid rgba(251, 146, 60, 0.1);
        box-shadow: 0 4px 16px rgba(251, 146, 60, 0.05);

        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 8px 0;

          .typing-dot {
            width: 8px;
            height: 8px;
            background: #ccc;
            border-radius: 50%;
            animation: typing 1.5s ease-in-out infinite;

            &:nth-child(2) {
              animation-delay: 0.2s;
            }

            &:nth-child(3) {
              animation-delay: 0.4s;
            }
          }
        }

        .error-message {
          background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
          border: 1px solid #f87171;
          border-radius: 12px;
          padding: 12px 16px;
          color: #991b1b;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }

      .message-time {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
      }

      .message-references {
        margin-top: 8px;
        display: grid;
        gap: 6px;

        .references-title {
          font-size: 12px;
          color: #8a5a24;
          font-weight: 600;
        }

        .reference-item {
          display: flex;
          gap: 6px;
          padding: 8px 10px;
          border: 1px solid rgba(251, 146, 60, 0.18);
          border-radius: 8px;
          background: rgba(255, 247, 237, 0.72);
          color: #92400e;
          text-decoration: none;
          line-height: 1.45;

          &:hover {
            border-color: rgba(251, 146, 60, 0.38);
            background: rgba(255, 237, 213, 0.9);
          }
        }

        .reference-index {
          flex: 0 0 auto;
          font-size: 12px;
          font-weight: 700;
        }

        .reference-body {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .reference-title {
          font-size: 12px;
          font-weight: 700;
        }

        .reference-snippet {
          font-size: 12px;
          color: #9a6b35;
          display: -webkit-box;
          overflow: hidden;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      }
    }
  }
}
</style>
