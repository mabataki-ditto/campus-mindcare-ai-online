<template>
  <div class="backend-layout">
    <el-container class="main-container" style="padding: 0">
      <Sidebar />
      <el-container style="padding: 0">
        <el-header style="padding: 0">
          <NavBar />
        </el-header>
        <el-main class="main-content">
          <router-view class="content-container" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue'
import NavBar from './NavBar.vue'
</script>

<style lang="scss" scoped>
.backend-layout {
  height: 100vh;
  width: 100%;
  background-color: #f5f7fa;

  .el-header {
    height: 74px !important;
  }

  .main-container {
    height: 100%;

    .content-container {
      padding: 20px;
      min-height: calc(100% - 74px);
      background-color: #fff;
    }
  }
}
</style>
