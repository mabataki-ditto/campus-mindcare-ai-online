<template>
  <view class="consultation-page">
    <!-- 浼氳瘽鍒楄〃 -->
    <view v-if="!currentSession" class="session-view">
      <!-- 鐘舵�佹爮鍗犱綅 -->
      <view class="status-bar-placeholder"></view>
      <view class="session-header" :style="{ paddingRight: capsuleRight }"
        ><text class="title">AI 蹇冪悊闄即</text
        ><view class="new-btn" @tap="handleNewSession"
          ><text>+ 鏂板璇?/text></view
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
            ><text class="session-title">{{ s.sessionTitle || "瀵硅瘽" }}</text
            ><text class="session-preview">{{
              s.sessionPreview || "鏆傛棤娑堟伅"
            }}</text></view
          >
          <view class="session-meta"
            ><text class="session-time">{{
              formatTime(s.lastMessageTime || s.createdAt)
            }}</text
            ><view class="delete-btn" @tap.stop="handleDelete(s)"
              ><text class="delete-text">鍒犻櫎</text></view
            ></view
          >
        </view>
        <view v-if="sessionList.length === 0" class="empty-tip"
          ><text>鏆傛棤瀵硅瘽璁板綍锛岀偣鍑?鏂板璇?寮�濮嬭亰澶?/text></view
        >
      </scroll-view>
    </view>
    <!-- 瀵硅瘽鐣岄潰 -->
    <view v-else class="chat-view">
      <!-- 鐘舵�佹爮鍗犱綅 -->
      <view class="status-bar-placeholder"></view>
      <view class="chat-header"
        ><view class="back-btn" @tap="handleBack"><text>杩斿洖</text></view
        ><text class="chat-title">{{
          currentSession.sessionTitle || "AI 闄即"
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
          <!-- AI 姝ｅ湪杈撳叆鏃讹紝鏈�鍚庝竴鏉?AI 娑堟伅鐢?currentReply 鎵撳瓧鍔ㄧ敾鍗曠嫭鏄剧ず锛屾澶勮烦杩?-->
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
                ><text class="ai-avatar-text">鏇?/text></view
              >
              <view class="msg-bubble ai-bubble"
                ><rich-text :nodes="msg.content"
              /></view>
            </view>
          </template>
        </view>
        <view v-if="isAiTyping && currentReply" class="msg-row ai">
          <view class="ai-avatar"><text class="ai-avatar-text">鏇?/text></view>
          <view class="msg-bubble ai-bubble"
            ><rich-text :nodes="currentReply" /><text class="typing-indicator"
              >鈻?/text
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
          placeholder="璇寸偣浠�涔?.."
          confirm-type="send"
          @confirm="handleSend"
          :disabled="isAiTyping"
        />
        <view
          class="send-btn"
          :class="{ disabled: !userMessage.trim() || isAiTyping }"
          @tap="handleSend"
          ><text>鍙戦�?/text></view
        >
      </view>
      <!-- 棰勮鍗＄墖 -->
      <view v-if="alertState.visible" class="alert-overlay" @tap.stop>
        <view class="alert-card" :class="`alert-level-${alertState.riskLevel}`">
          <text class="alert-title">鎴戜滑鍏虫敞鍒颁綘鍙兘闇�瑕佸府鍔?/text>
          <text class="alert-reason">{{ alertState.reason }}</text>
          <view class="hotline-list">
            <view class="hotline-item" @tap="callHotline('400-161-9995')"
              ><text class="hotline-name">24灏忔椂蹇冪悊鎻村姪鐑嚎</text
              ><text class="hotline-number">400-161-9995</text></view
            >
            <view class="hotline-item" @tap="callHotline('010-82951332')"
              ><text class="hotline-name">鍏ㄥ浗鑷潃骞查鐑嚎</text
              ><text class="hotline-number">010-82951332</text></view
            >
          </view>
          <view class="alert-actions">
            <view class="alert-btn" @tap="closeAlert"
              ><text>鎴戝凡浜嗚В</text></view
            >
            <view class="alert-btn primary" @tap="callHotline('400-161-9995')"
              ><text>绔嬪嵆鎷ㄦ墦</text></view
            >
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 页面逻辑拆成多个 composable：会话列表、流式输出、情绪分析，各自负责一块职责。
import { ref, computed, nextTick, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useConsultationSessions } from "@/composables/useConsultationSessions";
import { useConsultationStream } from "@/composables/useConsultationStream";
import { useConsultationEmotion } from "@/composables/useConsultationEmotion";
import { alertState } from "@/composables/useToolCalls";

// 会话列表相关能力：新建会话、拉取分页、切换会话、删除会话。
const {
  currentSession,
  sessionList,
  messages,
  createNewFrontendSession,
  getSessionPage,
  handleSessionClick,
  handleDeleteSession,
} = useConsultationSessions();

// 当前会话的情绪信息单独管理，切换会话时复用同一套加载逻辑。
const { currentEmotion, loadSessionEmotion } = useConsultationEmotion();

// 用户输入、AI 输出状态、工具调用状态都交给流式输出 composable 统一管理。
const { userMessage, isAiTyping, toolCallStatus, sendMessage } =
  useConsultationStream({
    currentSession,
    messages,
    getSessionPage,
    loadSessionEmotion,
  });

// 控制消息列表自动滚动到底部。
const scrollToId = ref("");

// 小程序端根据胶囊按钮的位置动态计算右侧留白，H5 用默认值即可。
const capsuleRight = ref("180rpx");

// AI 正在输出时，最后一条 AI 消息单独提取出来，方便展示打字动画。
const currentReply = computed(() => {
  if (!isAiTyping.value) return "";
  const lastMsg = messages.value[messages.value.length - 1];
  return lastMsg?.senderType === 2 ? lastMsg.content : "";
});

// 只有消息变多时才滚动，避免删除消息或刷新页面时误触发。
watch(
  () => messages.value.length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      nextTick(() => {
        scrollToId.value = "msg-bottom";
      });
    }
  },
);

// 页面每次显示时重新拉取会话列表；小程序端顺便重新计算胶囊按钮避让距离。
onShow(() => {
  getSessionPage();
  // #ifdef H5
  // H5 没有右上角系统胶囊按钮，不需要额外避让。
  // #endif
  // #ifndef H5
  // 小程序端：读取系统胶囊按钮位置，动态计算标题栏右侧 padding。
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

// 下面这些方法主要用于模板事件绑定，保持模板里写法直接、清晰。
const handleNewSession = () => createNewFrontendSession();
const handleEnterSession = (s: any) =>
  handleSessionClick(s, loadSessionEmotion);
const handleDelete = (s: any) => {
  uni.showModal({
    title: "纭鍒犻櫎",
    content: "鍒犻櫎鍚庢棤娉曟仮澶嶏紵",
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
    height: 0; /* 璁?scroll-view 姝ｇ‘璁＄畻楂樺害 */
    padding: 0;
    overflow-x: hidden; /* 闃叉妯悜婊氬姩鏉℃尋鍘嬪唴瀹?*/
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
        text-align: left; /* 寮哄埗宸﹀榻?*/
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
  height: 0; /* 鍏抽敭锛氳 flex: 1 姝ｇ‘璁＄畻楂樺害 */
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
    height: 0; /* 璁?scroll-view 姝ｇ‘璁＄畻楂樺害 */
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
