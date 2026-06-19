<template>
  <view class="register-page">
    <view class="header"
      ><text class="title">创建账号</text
      ><text class="subtitle">加入校园AI心理陪伴</text></view
    >
    <view class="form-section">
      <view class="input-group"
        ><text class="input-label">用户名</text
        ><input
          v-model="form.username"
          class="input-field"
          placeholder="请输入用户名"
          :maxlength="20"
      /></view>
      <view class="input-group"
        ><text class="input-label">密码</text
        ><input
          v-model="form.password"
          class="input-field"
          placeholder="请输入密码"
          password
          :maxlength="20"
      /></view>
      <view class="input-group"
        ><text class="input-label">确认密码</text
        ><input
          v-model="form.confirmPassword"
          class="input-field"
          placeholder="请再次输入密码"
          password
          :maxlength="20"
      /></view>
      <view class="input-group"
        ><text class="input-label">昵称</text
        ><input
          v-model="form.nickname"
          class="input-field"
          placeholder="请输入昵称（选填）"
          :maxlength="20"
      /></view>
      <button
        class="register-btn"
        @tap="handleRegister"
        :loading="loading"
        :disabled="loading"
      >
        注 册
      </button>
      <view class="link-row"
        ><text class="link" @tap="goLogin">已有账号？返回登录</text></view
      >
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { register } from "@/api/user";
const form = ref({
  username: "",
  password: "",
  confirmPassword: "",
  nickname: "",
});
const loading = ref(false);
const handleRegister = async () => {
  if (!form.value.username.trim()) {
    uni.showToast({ title: "请输入用户名", icon: "none" });
    return;
  }
  if (!form.value.password.trim()) {
    uni.showToast({ title: "请输入密码", icon: "none" });
    return;
  }
  if (form.value.password !== form.value.confirmPassword) {
    uni.showToast({ title: "两次密码不一致", icon: "none" });
    return;
  }
  loading.value = true;
  try {
    await register({
      username: form.value.username,
      password: form.value.password,
      nickname: form.value.nickname || undefined,
    });
    uni.showToast({ title: "注册成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e) {
    console.error("注册失败:", e);
  } finally {
    loading.value = false;
  }
};
const goLogin = () => uni.navigateBack();
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 0 40rpx;
  .header {
    padding: 80rpx 0 48rpx;
    .title {
      font-size: 44rpx;
      font-weight: bold;
      color: #303133;
      display: block;
      margin-bottom: 12rpx;
    }
    .subtitle {
      font-size: 28rpx;
      color: #909399;
    }
  }
  .form-section {
    background: #ffffff;
    border-radius: 24rpx;
    padding: 48rpx 40rpx;
    .input-group {
      margin-bottom: 32rpx;
      .input-label {
        font-size: 28rpx;
        color: #303133;
        margin-bottom: 12rpx;
        display: block;
      }
      .input-field {
        width: 100%;
        height: 88rpx;
        background: #f5f5f5;
        border-radius: 12rpx;
        padding: 0 24rpx;
        font-size: 30rpx;
        box-sizing: border-box;
      }
    }
    .register-btn {
      width: 100%;
      height: 88rpx;
      background: #4a90d9;
      color: #fff;
      font-size: 32rpx;
      font-weight: bold;
      border-radius: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 40rpx;
      border: none;
      &::after {
        border: none;
      }
    }
    .link-row {
      text-align: center;
      margin-top: 32rpx;
      .link {
        font-size: 28rpx;
        color: #4a90d9;
      }
    }
  }
}
</style>
