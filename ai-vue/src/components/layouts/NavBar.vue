<template>
  <div class="navbar">
    <div class="flex-box">
      <el-button @click="handleCollapse">
        <el-icon>
          <Expand />
        </el-icon>
      </el-button>
      <!-- <el-breadcrumb separator="/">
        <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.url" :to="{ path: item.url }">
          {{ item.name }}
        </el-breadcrumb-item>
      </el-breadcrumb> -->
    </div>
    <div class="flex-box">
      <el-dropdown @command="handleCommand" class="user-dropdown">
        <div class="flex-box user-info">
          <el-avatar :src="avatarUrl" />
          <p class="user-name">{{ userInfo.username || 'admin' }}</p>
          <el-icon>
            <ArrowDown />
          </el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import useMainStore from '@/stores/main/main'
import useLoginStore from '@/stores/login/login'
import { mapPathToBreadcrumbs } from '@/utils/map-menus'

const route = useRoute()

const mainStore = useMainStore()
const loginStore = useLoginStore()

const avatarUrl = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
const userInfo = computed(() => loginStore.userInfo || { username: '' })
const userMenus = computed(() => loginStore.userMenus || [])
const breadcrumbs = computed(() => mapPathToBreadcrumbs(route.path, userMenus.value))

function handleCommand(command: string) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      loginStore.logout()
    })
  }
}

function handleCollapse() {
  mainStore.toggleCollapse()
}
</script>

<style lang="scss" scoped>
.navbar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  padding: 0 15px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  border-bottom: 1px solid #e5e7eb;
  background-color: white;

  .flex-box {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .user-dropdown {
    outline: none;

    .user-info {
      outline: none;
      border: none;
      cursor: pointer;

      .el-avatar {
        border: none;
      }

      .user-name {
        margin-left: 10px;
        font-size: 14px;
      }
    }
  }
}
</style>