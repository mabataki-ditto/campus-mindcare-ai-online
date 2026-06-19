<template>
  <div class="frontend-layout">
    <div class="navbar-container">
      <div class="brand-section">
        <el-image style="width: 50px; height: 50px" :src="iconUrl" alt="品牌logo" class="brand-logo"></el-image>
        <h1 class="brand-name">校园AI心理陪伴与情绪成长平台</h1>
      </div>
      <div class="nav-section">
        <router-link to="/" class="nav-link">首页</router-link>
        <router-link v-if="isLoggedIn" to="/consultation" class="nav-link">AI心理陪伴</router-link>
        <router-link v-if="isLoggedIn" to="/emotion-diary" class="nav-link">心情记录</router-link>
        <router-link to="/knowledge" class="nav-link">知识库</router-link>
        <el-button v-if="isLoggedIn" class="logout-btn" @click="handleLogout">退出登录</el-button>
        <template v-else>
          <router-link to="/auth/login" class="nav-link">登录</router-link>
          <router-link to="/auth/register" class="nav-link">
            <el-button type="primary">注册</el-button>
          </router-link>
        </template>
      </div>
    </div>
    <div class="main-content">
      <router-view></router-view>
    </div>
    <div class="footer-container">
      <p class="footer-bottom">&copy; 2026 曼波AI助手, All rights reserved.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { logout } from '@/service/admin/admin'
import useLoginStore from '@/stores/login/login'

const loginStore = useLoginStore()

const iconUrl = new URL('@/assets/images/机器人.png', import.meta.url).href

const isLoggedIn = computed(() => {
  return !!loginStore.token
})

const handleLogout = () => {
  logout()
    .then(() => loginStore.logout())
    .catch(() => loginStore.logout())
}

onMounted(() => {
  if (!loginStore.token) {
    loginStore.loadLocalCache()
  }
})
</script>

<style lang="scss" scoped>
.frontend-layout {
  background-color: #fff;
  .navbar-container {
    max-width: 1200px;
    height: 100%;
    margin: 0 auto;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .brand-section {
      display: flex;
      align-items: center;
      .brand-name {
        margin-left: 10px;
        font-size: 24px;
        font-weight: 600;
        color: #333;
      }
    }
    .nav-section {
      display: flex;
      align-items: center;
      gap: 40px;
      .nav-link {
        color: #4b5563;
        font-size: 16px;
        font-weight: 500;
        &:hover {
          color: #4a90e2;
        }
      }
    }
  }

  .footer-container {
    background: #1f2937;
    color: white;
    padding: 15px 0;
    margin-top: auto;
    .footer-bottom {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 10px;
      text-align: center;
    }
  }
}
</style>
