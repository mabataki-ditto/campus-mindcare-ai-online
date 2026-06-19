<template>
  <view class="login-page">
    <view class="logo-section">
      <image src="/static/images/logo.png" class="logo" mode="aspectFit" />
      <text class="title">校园AI心理陪伴</text>
      <text class="subtitle">温暖陪伴，守护心灵</text>
    </view>
    <view class="form-section">
      <view class="input-group">
        <text class="input-label">用户名</text>
        <input
          v-model="form.username"
          class="input-field"
          placeholder="请输入用户名"
          :maxlength="20"
        />
      </view>
      <view class="input-group">
        <text class="input-label">密码</text>
        <input
          v-model="form.password"
          class="input-field"
          placeholder="请输入密码"
          password
          :maxlength="20"
        />
      </view>
      <button
        class="login-btn"
        @tap="handleLogin"
        :loading="loading"
        :disabled="loading"
      >
        登 录
      </button>
      <view class="link-row"
        ><text class="link" @tap="goRegister">没有账号？立即注册</text></view
      >
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { login } from "@/api/user";
import useLoginStore from "@/stores/login";

const loginStore = useLoginStore();
const form = ref({ username: "", password: "" });
const loading = ref(false);

const handleLogin = async () => {
  if (!form.value.username.trim()) {
    uni.showToast({ title: "请输入用户名", icon: "none" });
    return;
  }
  if (!form.value.password.trim()) {
    uni.showToast({ title: "请输入密码", icon: "none" });
    return;
  }
  loading.value = true;
  try {
    const res: any = await login({
      username: form.value.username,
      password: form.value.password,
    });
    loginStore.loginAction(res.token, res.userInfo);
    uni.showToast({ title: "登录成功", icon: "success" });
  } catch (e) {
    console.error("登录失败:", e);
  } finally {
    loading.value = false;
  }
};
const goRegister = () => {
  uni.navigateTo({ url: "/pages/auth/register" });
};
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, #4a90d9 0%, #ffffff 60%);
  padding: 0 40rpx;
}
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 160rpx;
  margin-bottom: 80rpx;
  .logo {
    width: 160rpx;
    height: 160rpx;
    margin-bottom: 24rpx;
  }
  .title {
    font-size: 44rpx;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 12rpx;
  }
  .subtitle {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}
.form-section {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
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
  .login-btn {
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
</style>
