<template>
  <view class="consultation-page">
    <!-- 会话列表 -->
    <view v-if="!currentSession" class="session-view">
      <!-- 状态栏占位 -->
      <view class="status-bar-placeholder"></view>
      <view class="session-header" :style="{ paddingRight: capsuleRight }"
        ><text class="title">AI 心理陪伴</text
        ><view class="new-btn" @tap="handleNewSession"
          ><text>+ 新对话</text></view
        ></view
      >
      <scroll-view scroll-y class="session-list">
        <view
          v-for="s in sessionList"
          :key="s.id"
          class="session-item"
          @tap="handleEnterSession(s)"
        >
          <view class="session-info"
            ><text class="session-title">{{ s.sessionTitle || "对话" }}</text
            ><text class="session-preview">{{
              s.sessionPreview || "暂无消息"
            }}</text></view
          >
          <view class="session-meta"
            ><text class="session-time">{{
              formatTime(s.lastMessageTime || s.createdAt)
            }}</text
            ><view class="delete-btn" @tap.stop="handleDelete(s)"
              ><text class="delete-text">删除</text></view
            ></view
          >
        </view>
        <view v-if="sessionList.length === 0" class="empty-tip"
          ><text>暂无对话记录，点击"新对话"开始聊天</text></view
        >
      </scroll-view>
    </view>
    <!-- 对话界面 -->
    <view v-else class="chat-view">
      <!-- 状态栏占位 -->
      <view class="status-bar-placeholder"></view>
      <view class="chat-header"
        ><view class="back-btn" @tap="handleBack"><text>返回</text></view
        ><text class="chat-title">{{
          currentSession.sessionTitle || "AI 陪伴"
        }}</text></view
      >
      <scroll-view
        scroll-y
        class="message-list"
        :scroll-into-view="scrollToId"
        :scroll-with-animation="true"
      >
        <view
          v-for="(msg, idx) in messages"
          :key="msg.id"
          :id="`msg-${msg.id}`"
        >
          <!-- AI 正在输入时，最后一条 AI 消息由 currentReply 打字动画单独显示，此处跳过 -->
          <template
            v-if="
              !(
                isAiTyping &&
                msg.senderType === 2 &&
                idx === messages.length - 1
              )
            "
          >
            <view v-if="msg.senderType === 1" class="msg-row user">
              <view class="msg-bubble user-bubble">{{ msg.content }}</view>
            </view>
            <view v-else class="msg-row ai">
              <view class="ai-avatar"
                ><text class="ai-avatar-text">曼</text></view
              >
              <view class="msg-bubble ai-bubble"
                ><rich-text :nodes="msg.content"
              /></view>
            </view>
          </template>
        </view>
        <view v-if="isAiTyping && currentReply" class="msg-row ai">
          <view class="ai-avatar"><text class="ai-avatar-text">曼</text></view>
          <view class="msg-bubble ai-bubble"
            ><rich-text :nodes="currentReply" /><text class="typing-indicator"
              >▍</text
            ></view
          >
        </view>
        <view v-if="toolCallStatus" class="tool-status"
          ><text class="tool-status-text">{{ toolCallStatus }}</text></view
        >
        <view id="msg-bottom" style="height: 20rpx"></view>
      </scroll-view>
      <view class="input-bar">
        <input
          v-model="userMessage"
          class="chat-input"
          placeholder="说点什么..."
          confirm-type="send"
          @confirm="handleSend"
          :disabled="isAiTyping"
        />
        <view
          class="send-btn"
          :class="{ disabled: !userMessage.trim() || isAiTyping }"
          @tap="handleSend"
          ><text>发送</text></view
        >
      </view>
      <!-- 预警卡片 -->
      <view v-if="alertState.visible" class="alert-overlay" @tap.stop>
        <view class="alert-card" :class="`alert-level-${alertState.riskLevel}`">
          <text class="alert-title">我们关注到你可能需要帮助</text>
          <text class="alert-reason">{{ alertState.reason }}</text>
          <view class="hotline-list">
            <view class="hotline-item" @tap="callHotline('400-161-9995')"
              ><text class="hotline-name">24小时心理援助热线</text
              ><text class="hotline-number">400-161-9995</text></view
            >
            <view class="hotline-item" @tap="callHotline('010-82951332')"
              ><text class="hotline-name">全国自杀干预热线</text
              ><text class="hotline-number">010-82951332</text></view
            >
          </view>
          <view class="alert-actions">
            <view class="alert-btn" @tap="closeAlert"
              ><text>我已了解</text></view
            >
            <view class="alert-btn primary" @tap="callHotline('400-161-9995')"
              ><text>立即拨打</text></view
            >
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useConsultationSessions } from "@/composables/useConsultationSessions";
import { useConsultationStream } from "@/composables/useConsultationStream";
import { useConsultationEmotion } from "@/composables/useConsultationEmotion";
import { alertState } from "@/composables/useToolCalls";

const {
  currentSession,
  sessionList,
  messages,
  createNewFrontendSession,
  getSessionPage,
  handleSessionClick,
  handleDeleteSession,
} = useConsultationSessions();
const { currentEmotion, loadSessionEmotion } = useConsultationEmotion();
const { userMessage, isAiTyping, toolCallStatus, sendMessage } =
  useConsultationStream({
    currentSession,
    messages,
    getSessionPage,
    loadSessionEmotion,
  });

const scrollToId = ref("");
const capsuleRight = ref("180rpx"); // 默认值，小程序端动态计算
const currentReply = computed(() => {
  if (!isAiTyping.value) return "";
  const lastMsg = messages.value[messages.value.length - 1];
  return lastMsg?.senderType === 2 ? lastMsg.content : "";
});
watch(
  () => messages.value.length,
  (newLen, oldLen) => {
    // 仅在消息增加时滚动（避免删除消息时也触发）
    if (newLen > oldLen) {
      nextTick(() => {
        scrollToId.value = "msg-bottom";
      });
    }
  },
);
onShow(() => {
  getSessionPage();
  // #ifdef H5
  // H5 端不需要胶囊按钮适配
  // #endif
  // #ifndef H5
  // 小程序端：获取胶囊按钮位置
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect();
    if (menuButton) {
      const sysInfo = uni.getSystemInfoSync();
      const rightSpace = sysInfo.windowWidth - menuButton.right;
      capsuleRight.value = (menuButton.width + rightSpace + 8) * 2 + "rpx";
    }
  } catch (e) {
    /* ignore */
  }
  // #endif
});

const handleNewSession = () => createNewFrontendSession();
const handleEnterSession = (s: any) =>
  handleSessionClick(s, loadSessionEmotion);
const handleDelete = (s: any) => {
  uni.showModal({
    title: "确认删除",
    content: "删除后无法恢复？",
    success: (r: any) => {
      if (r.confirm) handleDeleteSession(s.id);
    },
  });
};
const handleBack = () => {
  currentSession.value = null;
  messages.value = [];
  getSessionPage();
};
const handleSend = () => sendMessage();
const callHotline = (phone: string) =>
  uni.makePhoneCall({ phoneNumber: phone });
const closeAlert = () => {
  alertState.visible = false;
};
const formatTime = (time: string) => {
  if (!time) return "";
  const d = new Date(time),
    now = new Date();
  if (d.toDateString() === now.toDateString())
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
</script>

<style lang="scss" scoped>
.consultation-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}
.session-view {
  --session-horizontal-gap: 28rpx;
  flex: 1;
  display: flex;
  flex-direction: column;
  .status-bar-placeholder {
    height: var(--status-bar-height, 44px);
    background: #fff;
    flex-shrink: 0;
  }
  .session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx var(--session-horizontal-gap);
    background: #fff;
    .title {
      font-size: 36rpx;
      font-weight: bold;
      color: #303133;
    }
    .new-btn {
      background: #4a90d9;
      color: #fff;
      padding: 12rpx 28rpx;
      border-radius: 32rpx;
      font-size: 26rpx;
    }
  }
  .session-list {
    flex: 1;
    height: 0; /* 让 scroll-view 正确计算高度 */
    padding: 0;
    overflow-x: hidden; /* 防止横向滚动条挤压内容 */
    box-sizing: border-box;
    .session-item {
      background: #fff;
      border-radius: 16rpx;
      padding: 24rpx 20rpx;
      margin: 0 var(--session-horizontal-gap) 16rpx;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      box-sizing: border-box;
      .session-info {
        flex: 1;
        min-width: 0;
        margin-right: 12rpx;
        text-align: left; /* 强制左对齐 */
        .session-title {
          font-size: 30rpx;
          color: #303133;
          font-weight: 500;
          display: block;
          margin-bottom: 8rpx;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
        }
        .session-preview {
          font-size: 24rpx;
          color: #909399;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: block;
          max-width: 100%;
          text-align: left;
        }
      }
      .session-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        flex-shrink: 0;
        padding-top: 4rpx;
        .session-time {
          font-size: 20rpx;
          color: #909399;
          margin-bottom: 8rpx;
          padding: 4rpx 12rpx;
          white-space: nowrap;
        }
        .delete-btn {
          padding: 4rpx 12rpx;
        }
        .delete-text {
          font-size: 20rpx;
          color: #f56c6c;
          white-space: nowrap;
        }
      }
    }
    .empty-tip {
      text-align: center;
      padding: 120rpx 0;
      color: #909399;
      font-size: 28rpx;
    }
  }
}
.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 0; /* 关键：让 flex: 1 正确计算高度 */
  .status-bar-placeholder {
    height: var(--status-bar-height, 44px);
    background: #fff;
    flex-shrink: 0;
  }
  .chat-header {
    display: flex;
    align-items: center;
    padding: 24rpx 32rpx;
    background: #fff;
    border-bottom: 1rpx solid #e4e7ed;
    flex-shrink: 0;
    .back-btn {
      font-size: 28rpx;
      color: #4a90d9;
      margin-right: 24rpx;
    }
    .chat-title {
      font-size: 32rpx;
      font-weight: 500;
      color: #303133;
    }
  }
  .message-list {
    flex: 1;
    height: 0; /* 让 scroll-view 正确计算高度 */
    padding: 24rpx 32rpx;
    box-sizing: border-box;
  }
  .msg-row {
    display: flex;
    margin-bottom: 24rpx;
    &.user {
      justify-content: flex-end;
    }
    &.ai {
      justify-content: flex-start;
      align-items: flex-start;
    }
  }
  .ai-avatar {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: #4a90d9;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
    flex-shrink: 0;
    .ai-avatar-text {
      color: #fff;
      font-size: 28rpx;
      font-weight: bold;
    }
  }
  .msg-bubble {
    max-width: 70%;
    padding: 20rpx 28rpx;
    border-radius: 16rpx;
    font-size: 28rpx;
    line-height: 1.6;
    word-break: break-all;
    &.user-bubble {
      background: #4a90d9;
      color: #fff;
      border-top-right-radius: 4rpx;
    }
    &.ai-bubble {
      background: #fff;
      color: #303133;
      border-top-left-radius: 4rpx;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
    }
  }
  .typing-indicator {
    color: #4a90d9;
    animation: blink 1s infinite;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
  .tool-status {
    text-align: center;
    padding: 16rpx 0;
    .tool-status-text {
      font-size: 24rpx;
      color: #909399;
    }
  }
  .input-bar {
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
    background: #fff;
    border-top: 1rpx solid #e4e7ed;
    gap: 16rpx;
    flex-shrink: 0;
    .chat-input {
      flex: 1;
      height: 72rpx;
      background: #f5f5f5;
      border-radius: 36rpx;
      padding: 0 28rpx;
      font-size: 28rpx;
    }
    .send-btn {
      background: #4a90d9;
      color: #fff;
      padding: 16rpx 32rpx;
      border-radius: 36rpx;
      font-size: 28rpx;
      flex-shrink: 0;
      &.disabled {
        opacity: 0.3;
      }
    }
  }
}
.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 48rpx;
  .alert-card {
    width: 100%;
    background: #fff;
    border-radius: 24rpx;
    padding: 48rpx 36rpx;
    &.alert-level-2 {
      border-top: 6rpx solid #e6a23c;
    }
    &.alert-level-3 {
      border-top: 6rpx solid #f56c6c;
    }
    .alert-title {
      font-size: 34rpx;
      font-weight: bold;
      color: #303133;
      display: block;
      text-align: center;
      margin-bottom: 16rpx;
    }
    .alert-reason {
      font-size: 26rpx;
      color: #909399;
      display: block;
      text-align: center;
      margin-bottom: 32rpx;
    }
    .hotline-list {
      margin-bottom: 32rpx;
      .hotline-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20rpx 0;
        border-bottom: 1rpx solid #e4e7ed;
        .hotline-name {
          font-size: 26rpx;
          color: #303133;
        }
        .hotline-number {
          font-size: 28rpx;
          color: #4a90d9;
          font-weight: bold;
        }
      }
    }
    .alert-actions {
      display: flex;
      gap: 24rpx;
      .alert-btn {
        flex: 1;
        height: 80rpx;
        border-radius: 40rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28rpx;
        border: 2rpx solid #e4e7ed;
        color: #303133;
        &.primary {
          background: #4a90d9;
          color: #fff;
          border: none;
        }
      }
    }
  }
}
</style>
