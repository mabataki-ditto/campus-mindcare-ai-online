<template>
  <div class="ai-assistant-info">
    <div class="breathing-circle">
      <el-image :src="iconUrl" style="width: 25px; height: 25px" alt="AI助手" />
    </div>
    <h3 class="assistant-name">曼波AI助手</h3>
    <div class="online-status">
      <div class="status-dot"></div>
      在线服务中
    </div>
  </div>
</template>

<script setup>
defineProps({
  iconUrl: {
    type: String,
    required: true
  }
})
</script>

<style lang="scss" scoped>
.ai-assistant-info {
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 252, 248, 0.95) 100%);
  border-radius: 16px;
  padding: 16px;
  box-shadow:
    0 8px 32px rgba(251, 146, 60, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(251, 146, 60, 0.08);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  .breathing-circle {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    animation: breathing 4s ease-in-out infinite;
    box-shadow: 0 6px 24px rgba(251, 146, 60, 0.25);
    position: relative;
  }

  .assistant-name {
    font-size: 16px;
    font-weight: 700;
    background: linear-gradient(135deg, #fb923c, #f59e0b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
    background-clip: text;
    margin: 0 0 12px;
  }

  .online-status {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #059669;
    font-size: 12px;
    font-weight: 600;

    .status-dot {
      width: 8px;
      height: 8px;
      background: #059669;
      border-radius: 50%;
      margin-right: 8px;
      animation: pulse 2s infinite;
      box-shadow: 0 0 8px rgba(5, 150, 105, 0.4);
    }
  }
}
</style>
