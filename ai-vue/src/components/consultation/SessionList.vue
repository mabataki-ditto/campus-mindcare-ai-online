<template>
  <div class="session-history">
    <h4 class="section-title">会话列表</h4>
    <div class="session-list">
      <div
        v-for="session in sessionList"
        :key="session.id"
        class="session-item"
        :class="{ active: activeSessionId === `session_${session.id}` }"
        @click="$emit('select-session', session)"
      >
        <div class="session-info">
          <div class="session-title">
            <span>{{ session.sessionTitle }}</span>
            <div class="session-meta">
              <span class="session-time">{{ formatRelativeTime(session.startedAt) }}</span>
            </div>
            <div class="session-preview">{{ session.lastMessageContent }}</div>
            <div class="session-stats">
              <span>
                <el-icon><ChatRound /></el-icon>
                {{ session.messageCount || 0 }}
              </span>
              <span>
                <el-icon><Clock /></el-icon>
                {{ session.durationMinutes || 0 }} 分钟
              </span>
            </div>
          </div>
          <div class="session-actions">
            <el-button text type="danger" size="small" @click.stop="$emit('delete-session', session.id)">
              <el-icon><DeleteFilled /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      <div v-if="!sessionList.length" class="no-sessions-text">暂无会话记录</div>
    </div>
  </div>
</template>

<script setup>
import { formatRelativeTime } from '@/utils/formatDate'

defineProps({
  sessionList: {
    type: Array,
    default: () => []
  },
  activeSessionId: {
    type: String,
    default: ''
  }
})

defineEmits(['select-session', 'delete-session'])
</script>

<style lang="scss" scoped>
.session-history {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  min-height: 250px;
  display: flex;
  flex-direction: column;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .session-list {
    overflow-y: auto;
    max-height: 200px;
    scrollbar-width: thin;
    scrollbar-color: rgba(64, 150, 255, 0.3) transparent;

    .session-item {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid transparent;

      &:hover {
        background: #f8f9ff;
        border-color: #e6f0ff;
      }

      &.active {
        background: #e6f0ff;
        border-color: #4096ff;
      }

      .session-info {
        flex: 1;

        .session-title {
          font-weight: 500;
          font-size: 14px;
          color: #333;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          .session-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;

            .session-time {
              font-size: 12px;
              color: #999;
            }
          }

          .session-preview {
            width: 200px;
            font-size: 12px;
            color: #666;
            margin-bottom: 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .session-stats {
            display: flex;
            align-items: center;
            gap: 12px;

            span {
              font-size: 12px;
              color: #999;
              display: flex;
              align-items: center;
              gap: 4px;
            }
          }
        }

        .session-actions {
          position: absolute;
          top: 10px;
          right: 12px;
        }
      }
    }

    .no-sessions-text {
      text-align: center;
      font-size: 14px;
      color: #999;
    }
  }
}
</style>
