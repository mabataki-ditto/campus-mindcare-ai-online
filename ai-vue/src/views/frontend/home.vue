<template>
  <div class="home-container">
    <div class="content">
      <div class="text">
        <h2 class="title">
          一次温暖的对话<br />
          <span class="highlight-text">化孤单为慰藉</span>
        </h2>
        <p class="description">每个深夜，每个焦虑的时刻，我们都在这里。不必独自承受，让心与心的连接温暖您的每一天</p>
        <div class="hero-actions">
          <button type="button" class="hero-button" @click="handleNavigate('/consultation')">开始倾诉，获得陪伴</button>
          <button type="button" class="hero-button btn-secondary" @click="handleNavigate('/emotion-diary')">
            记录心情，释放情感
          </button>
        </div>
      </div>
      <div class="robot">
        <el-image style="width: 150px; height: 150px" :src="iconUrl" alt="机器人" class="robot-image" />
      </div>
    </div>
  </div>
</template>

<script setup>
import router from '@/router'
import useLoginStore from '@/stores/login/login'

const iconUrl = new URL('@/assets/images/robot-fill.png', import.meta.url).href

const loginStore = useLoginStore()

const handleNavigate = (path) => {
  if (!loginStore.token) {
    loginStore.loadLocalCache()
  }

  router.push(loginStore.token ? path : '/auth/login')
}
</script>

<style lang="scss" scoped>
.home-container {
  background: linear-gradient(90deg, rgb(74, 156, 140) 0%, rgb(61, 138, 122) 100%) rgba(74, 156, 140, 0.95);
  color: white;
  padding: 5rem 0;
  height: calc(100vh - 285px);
  height: calc(100dvh - 285px);
  display: flex;
  align-items: center;
  justify-content: center;
  .content {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 30px;
    .text {
      width: 500px;
      .title {
        font-size: 45px;
        font-weight: bold;
        margin-bottom: 15px;
        .highlight-text {
          color: #ffd700;
        }
      }
      .hero-actions {
        margin-top: 30px;
        display: flex;
        gap: 16px;
        .hero-button {
          min-width: 180px;
          height: 40px;
          padding: 0 19px;
          border: 1px solid #dcdfe6;
          border-radius: 4px;
          background: #fff;
          color: #606266;
          font-size: 14px;
          font-weight: 500;
          line-height: 1;
          cursor: pointer;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          &:active {
            opacity: 0.85;
          }
        }
        .btn-secondary {
          background-color: transparent;
          border-color: #fff;
          color: #fff;
          &:hover,
          &:focus {
            background-color: rgba(255, 255, 255, 0.1);
            border-color: #fff;
            color: #fff;
          }
        }
      }
    }
    .robot {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 260px;
      height: 260px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.2);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
      box-shadow:
        0 15px 35px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
  }
}

@media (max-width: 768px) {
  .home-container {
    padding: 2rem 15px;
    height: auto;
    min-height: calc(100dvh - 200px);
    .content {
      flex-direction: column-reverse;
      gap: 20px;
      .text {
        width: 100%;
        .title {
          font-size: 28px;
          margin-bottom: 10px;
        }
        .description {
          font-size: 14px;
        }
        .hero-actions {
          margin-top: 20px;
          flex-direction: column;
          gap: 10px;
        }
      }
      .robot {
        width: 180px;
        height: 180px;
      }
    }
  }
}
</style>
