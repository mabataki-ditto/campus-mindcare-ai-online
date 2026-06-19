<template>
  <view class="home-page">
    <view class="greeting-section">
      <text class="greeting">{{ greetingText }}</text>
      <text class="subtitle">今天心情如何？</text>
    </view>
    <view class="quick-actions">
      <view class="action-card" @tap="goConsultation"
        ><view
          class="action-icon-wrap"
          style="background: rgba(74, 144, 217, 0.1)"
          ><text class="action-icon-text" style="color: #4a90d9">AI</text></view
        ><text class="action-text">AI 陪伴</text></view
      >
      <view class="action-card" @tap="goDiary"
        ><view
          class="action-icon-wrap"
          style="background: rgba(103, 194, 58, 0.1)"
          ><text class="action-icon-text" style="color: #67c23a"
            >日记</text
          ></view
        ><text class="action-text">情绪日记</text></view
      >
      <view class="action-card" @tap="goKnowledge"
        ><view
          class="action-icon-wrap"
          style="background: rgba(230, 162, 60, 0.1)"
          ><text class="action-icon-text" style="color: #e6a23c"
            >知识</text
          ></view
        ><text class="action-text">知识库</text></view
      >
    </view>
    <view class="tip-section">
      <view class="tip-card">
        <text class="tip-title">温馨提示</text>
        <text class="tip-content"
          >如果你正在经历困难时刻，请记住：寻求帮助是勇敢的表现。24小时心理援助热线：400-161-9995</text
        >
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import useLoginStore from "@/stores/login";

const loginStore = useLoginStore();
onShow(() => {
  loginStore.loadLocalCache();
  if (!loginStore.token) uni.redirectTo({ url: "/pages/auth/login" });
});

const greetingText = computed(() => {
  const h = new Date().getHours();
  let g: string;
  if (h < 6) g = "夜深了";
  else if (h < 9) g = "早上好";
  else if (h < 12) g = "上午好";
  else if (h < 14) g = "中午好";
  else if (h < 18) g = "下午好";
  else if (h < 22) g = "晚上好";
  else g = "夜深了";
  const n =
    loginStore.userInfo?.nickname || loginStore.userInfo?.username || "";
  return n ? `${g}，${n}` : g;
});
const goConsultation = () =>
  uni.switchTab({ url: "/pages/consultation/index" });
const goDiary = () => uni.switchTab({ url: "/pages/emotion/diary" });
const goKnowledge = () => uni.switchTab({ url: "/pages/knowledge/index" });
</script>

<style lang="scss" scoped>
.home-page {
  padding: 32rpx;
}
.greeting-section {
  padding: 40rpx 0;
  .greeting {
    font-size: 44rpx;
    font-weight: bold;
    color: #303133;
    display: block;
    margin-bottom: 12rpx;
  }
  .subtitle {
    font-size: 30rpx;
    color: #909399;
  }
}
.quick-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40rpx;
  .action-card {
    width: 30%;
    background: #fff;
    border-radius: 20rpx;
    padding: 32rpx 16rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
    .action-icon-wrap {
      width: 96rpx;
      height: 96rpx;
      border-radius: 24rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16rpx;
    }
    .action-icon-text {
      font-size: 28rpx;
      font-weight: bold;
    }
    .action-text {
      font-size: 26rpx;
      color: #303133;
    }
  }
}
.tip-section {
  .tip-card {
    background: linear-gradient(135deg, #4a90d9, #6ba8e8);
    border-radius: 20rpx;
    padding: 36rpx;
    .tip-title {
      font-size: 30rpx;
      font-weight: bold;
      color: #fff;
      display: block;
      margin-bottom: 16rpx;
    }
    .tip-content {
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.6;
    }
  }
}
</style>
