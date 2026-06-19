<template>
  <el-aside :width="isCollapse ? '64px' : '264px'" style="height: 100%">
    <el-menu :collapse="isCollapse" :collapse-transition="false" :default-active="activeMenu" class="menu-style">
      <div class="brand">
        <el-image style="width: 60px; height: 60px; margin-right: 10px" :src="logoUrl" alt="logo" />
        <div v-show="!isCollapse" class="info-card">
          <h1 class="brand-title"> 曼波AI助手</h1>
          <p class="brand-subtitle">管理后台</p>
        </div>
      </div>

      <template v-for="menu in userMenus" :key="menu.id">
        <el-sub-menu v-if="menu.children && menu.children.length > 0" :index="menu.url">
          <template #title>
            <el-icon>
              <component :is="menu.icon" />
            </el-icon>
            <span>{{ menu.name }}</span>
          </template>
          <el-menu-item v-for="submenu in menu.children" :key="submenu.id" :index="submenu.url" @click="handleMenuClick(submenu.url)">
            <el-icon>
              <component :is="submenu.icon" />
            </el-icon>
            <span>{{ submenu.name }}</span>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item v-else :index="menu.url" @click="handleMenuClick(menu.url)">
          <el-icon>
            <component :is="menu.icon" />
          </el-icon>
          <span>{{ menu.name }}</span>
        </el-menu-item>
      </template>
    </el-menu>
  </el-aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import useMainStore from '@/stores/main/main'
import useLoginStore from '@/stores/login/login'

const router = useRouter()
const route = useRoute()

const logoUrl = new URL('@/assets/images/机器人.png', import.meta.url).href

const mainStore = useMainStore()
const loginStore = useLoginStore()

const isCollapse = computed(() => mainStore.isCollapse)
const userMenus = computed(() => loginStore.userMenus || [])
const activeMenu = computed(() => route.path)

function handleMenuClick(url: string) {
  router.push(url)
}
</script>

<style lang="scss" scoped>
.menu-style {
  height: 100%;
  background-color: #fff;

  .brand {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 74px;
    box-sizing: border-box;
    border-bottom: 1px solid #e5e7eb;
    padding: 0 10px;
    background-color: #fff;

    .info-card {
      .brand-title {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: -5px;
        color: #1f2937;
      }

      .brand-subtitle {
        font-size: 14px;
        color: #6b7280;
      }
    }
  }
}
</style>