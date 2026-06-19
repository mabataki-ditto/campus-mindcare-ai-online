<template>
  <view class="mine-page">
    <view class="user-section">
      <view class="avatar-wrap"
        ><text class="avatar-text">{{ avatarText }}</text></view
      >
      <view class="user-info"
        ><text class="nickname">{{
          userInfo.nickname || userInfo.username || "用户"
        }}</text
        ><text class="username">@{{ userInfo.username }}</text></view
      >
    </view>
    <view class="menu-section">
      <view class="menu-item" @tap="goConsultation"
        ><text class="menu-text">AI 陪伴对话</text></view
      >
      <view class="menu-item" @tap="goDiary"
        ><text class="menu-text">情绪日记</text></view
      >
      <view class="menu-item" @tap="goKnowledge"
        ><text class="menu-text">知识库</text></view
      >
    </view>
    <view class="logout-section"
      ><button class="logout-btn" @tap="handleLogout">退出登录</button></view
    >
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import useLoginStore from "@/stores/login";
const loginStore = useLoginStore();
const userInfo = computed(() => loginStore.userInfo || {});
const avatarText = computed(() =>
  (
    userInfo.value.nickname ||
    userInfo.value.username ||
    "用"
  ).charAt(0),
);
const goConsultation = () =>
  uni.switchTab({ url: "/pages/consultation/index" });
const goDiary = () => uni.switchTab({ url: "/pages/emotion/diary" });
const goKnowledge = () => uni.switchTab({ url: "/pages/knowledge/index" });
const handleLogout = () => {
  uni.showModal({
    title: "确认退出",
    content: "确定要退出登录吗？",
    success: (res: any) => {
      if (res.confirm) loginStore.logout();
    },
  });
};
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  background: #f5f5f5;
}
.user-section {
  display: flex;
  align-items: center;
  padding: 48rpx 32rpx;
  background: linear-gradient(135deg, #4a90d9, #6ba8e8);
  .avatar-wrap {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 28rpx;
    .avatar-text {
      font-size: 48rpx;
      font-weight: bold;
      color: #fff;
    }
  }
  .user-info {
    .nickname {
      font-size: 36rpx;
      font-weight: bold;
      color: #fff;
      display: block;
      margin-bottom: 8rpx;
    }
    .username {
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.8);
    }
  }
}
.menu-section {
  margin: 24rpx 32rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  .menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx;
    border-bottom: 1rpx solid #e4e7ed;
    &:last-child {
      border-bottom: none;
    }
    .menu-text {
      font-size: 30rpx;
      color: #303133;
    }
    .menu-arrow {
      font-size: 28rpx;
      color: #909399;
    }
  }
}
.logout-section {
  padding: 48rpx 32rpx;
  .logout-btn {
    width: 100%;
    height: 88rpx;
    background: #fff;
    color: #f56c6c;
    font-size: 32rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    &::after {
      border: none;
    }
  }
}
</style>
