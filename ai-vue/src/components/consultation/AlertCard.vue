<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <div
      class="alert-overlay"
      :class="{ 'overlay-crisis': riskLevel === 3 }"
      @click="handleOverlayClick"
    >
      <!-- 卡片主体 -->
      <div class="alert-card" :class="[`alert-level-${riskLevel}`]" @click.stop>
        <!-- 脉冲边框（危机等级） -->
        <div v-if="riskLevel === 3" class="pulse-border"></div>

        <!-- 顶部 -->
        <div class="alert-header">
          <div class="alert-icon">
            <el-icon :size="32"><WarningFilled /></el-icon>
          </div>
          <h2 class="alert-title">我们关注到你可能需要帮助</h2>
          <p class="alert-subtitle">你并不孤单，总有人愿意倾听</p>
        </div>

        <!-- 中部：热线信息 -->
        <div class="alert-hotlines">
          <div class="hotline-item" v-for="item in hotlines" :key="item.phone">
            <div class="hotline-label">{{ item.label }}</div>
            <a :href="`tel:${item.phone}`" class="hotline-phone">{{ item.phone }}</a>
          </div>
        </div>

        <!-- 温暖鼓励 -->
        <div class="alert-encouragement">
          <p>无论此刻多么艰难，请相信：这段困难时光终会过去。</p>
          <p>寻求帮助是勇敢的表现，我们一直在你身边。</p>
        </div>

        <!-- 底部操作 -->
        <div class="alert-actions">
          <el-button
            class="btn-understand"
            :disabled="countdown > 0"
            @click="handleClose"
          >
            {{ countdown > 0 ? `请阅读 (${countdown}s)` : '我已了解' }}
          </el-button>
          <a :href="`tel:${hotlines[0].phone}`" class="btn-call">
            <el-icon><Phone /></el-icon>
            立即拨打
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  riskLevel: {
    type: Number,
    default: 1
  },
  reason: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const countdown = ref(0)
let timer = null

const hotlines = [
  { label: '24小时心理援助热线', phone: '400-161-9995' },
  { label: '全国自杀干预热线', phone: '010-82951332' },
  { label: '校园心理咨询中心', phone: '010-58808197' }
]

const handleOverlayClick = () => {
  // 危机等级不允许点击遮罩关闭
  if (props.riskLevel < 3) {
    handleClose()
  }
}

const handleClose = () => {
  if (props.riskLevel === 3 && countdown.value > 0) return
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  emit('close')
}

onMounted(() => {
  // 危机等级需要倒计时10秒才能关闭
  if (props.riskLevel === 3) {
    countdown.value = 10
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  }
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style lang="scss" scoped>
.alert-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;

  &.overlay-crisis {
    background: rgba(0, 0, 0, 0.6);
  }
}

.alert-card {
  position: relative;
  width: 440px;
  max-width: 90vw;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.4s ease;
  overflow: hidden;

  &.alert-level-2 {
    border: 2px solid #e6a23c;
  }

  &.alert-level-3 {
    border: 2px solid #f56c6c;
  }
}

.pulse-border {
  position: absolute;
  inset: -2px;
  border-radius: 22px;
  border: 2px solid #f56c6c;
  animation: pulse 2s ease-in-out infinite;
  pointer-events: none;
}

.alert-header {
  text-align: center;
  margin-bottom: 24px;

  .alert-icon {
    margin: 0 auto 12px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .alert-level-2 & .alert-icon {
    background: rgba(230, 162, 60, 0.1);
    color: #e6a23c;
  }

  .alert-level-3 & .alert-icon {
    background: rgba(245, 108, 108, 0.1);
    color: #f56c6c;
  }

  .alert-level-1 & .alert-icon {
    background: rgba(144, 147, 153, 0.1);
    color: #909399;
  }

  .alert-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 6px;
  }

  .alert-subtitle {
    font-size: 14px;
    color: #909399;
  }
}

.alert-hotlines {
  margin-bottom: 20px;

  .hotline-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 10px;
    margin-bottom: 8px;
    transition: background 0.2s;

    &:hover {
      background: #f0f1f2;
    }

    .hotline-label {
      font-size: 14px;
      color: #606266;
    }

    .hotline-phone {
      font-size: 18px;
      font-weight: 700;
      color: #409eff;
      text-decoration: none;
      letter-spacing: 0.5px;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.alert-encouragement {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, rgba(255, 245, 230, 0.8), rgba(255, 240, 240, 0.8));
  border-radius: 12px;
  margin-bottom: 24px;

  p {
    font-size: 14px;
    color: #606266;
    line-height: 1.8;
    margin: 0;
  }
}

.alert-actions {
  display: flex;
  gap: 12px;
  justify-content: center;

  .btn-understand {
    min-width: 120px;
    border-radius: 10px;
    font-size: 15px;
  }

  .btn-call {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 120px;
    justify-content: center;
    padding: 8px 20px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 500;
    color: white;
    background: linear-gradient(135deg, #f56c6c, #e6a23c);
    text-decoration: none;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
