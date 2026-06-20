<template>
  <div class="frontend-layout">
    <div class="navbar-container">
      <div class="brand-section">
        <el-image style="width: 50px; height: 50px" :src="iconUrl" alt="品牌logo" class="brand-logo"></el-image>
        <h1 class="brand-name">校园AI心理陪伴与情绪成长平台</h1>
      </div>
      <!-- 桌面端导航 -->
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
      <!-- 移动端汉堡按钮 -->
      <el-button class="menu-toggle" circle @click="mobileMenuOpen = !mobileMenuOpen">
        <el-icon><component :is="mobileMenuOpen ? 'Close' : 'Menu'" /></el-icon>
      </el-button>
    </div>
    <!-- 移动端下拉菜单 -->
    <div v-show="mobileMenuOpen" class="mobile-menu">
      <router-link to="/" class="mobile-link" @click="mobileMenuOpen = false">首页</router-link>
      <router-link v-if="isLoggedIn" to="/consultation" class="mobile-link" @click="mobileMenuOpen = false"
        >AI心理陪伴</router-link
      >
      <router-link v-if="isLoggedIn" to="/emotion-diary" class="mobile-link" @click="mobileMenuOpen = false"
        >心情记录</router-link
      >
      <router-link to="/knowledge" class="mobile-link" @click="mobileMenuOpen = false">知识库</router-link>
      <template v-if="isLoggedIn">
        <el-button class="mobile-link" @click="handleLogoutMobile">退出登录</el-button>
      </template>
      <template v-else>
        <router-link to="/auth/login" class="mobile-link" @click="mobileMenuOpen = false">登录</router-link>
        <router-link to="/auth/register" class="mobile-link" @click="mobileMenuOpen = false">
          <el-button type="primary">注册</el-button>
        </router-link>
      </template>
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
import { computed, onMounted, ref } from 'vue'
import { logout } from '@/service/admin/admin'
import useLoginStore from '@/stores/login/login'

const loginStore = useLoginStore()

const iconUrl = new URL('@/assets/images/机器人.png', import.meta.url).href

const isLoggedIn = computed(() => {
  return !!loginStore.token
})

const mobileMenuOpen = ref(false)

const handleLogout = () => {
  logout()
    .then(() => loginStore.logout())
    .catch(() => loginStore.logout())
}

const handleLogoutMobile = () => {
  mobileMenuOpen.value = false
  handleLogout()
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
    .menu-toggle {
      display: none;
    }
  }

  .mobile-menu {
    display: none;
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

@media (max-width: 768px) {
  .frontend-layout {
    .navbar-container {
      padding: 10px 15px;
      .brand-section {
        .brand-name {
          font-size: 16px;
        }
      }
      .nav-section {
        display: none;
      }
      .menu-toggle {
        display: inline-flex;
      }
    }
    .mobile-menu {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 15px;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      .mobile-link {
        color: #4b5563;
        font-size: 15px;
        font-weight: 500;
        padding: 10px 12px;
        border-radius: 8px;
        text-align: left;
        &:hover {
          background: #f3f4f6;
          color: #4a90e2;
        }
      }
    }
  }
}
</style>
