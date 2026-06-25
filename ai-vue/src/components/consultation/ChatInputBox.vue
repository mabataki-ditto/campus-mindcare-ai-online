<template>
  <div class="chat-input">
    <div class="input-container">
      <!-- 文件预览标签 -->
      <div v-if="attachedFile" class="file-preview">
        <el-icon><Document /></el-icon>
        <span class="file-name">{{ attachedFile.name }}</span>
        <el-icon class="file-remove" @click="removeFile"><Close /></el-icon>
      </div>
      <el-input
        :model-value="modelValue"
        placeholder="请输入您想分享的内容..."
        type="textarea"
        :rows="3"
        :disabled="disabled"
        class="message-input"
        clearable
        @update:model-value="$emit('update:modelValue', $event)"
        @keydown="handleKeyDown"
      />
      <div class="input-footer">
        <span>按Enter发送，Shift+Enter换行</span>
        <span>{{ modelValue.length }}/500</span>
      </div>
    </div>
    <!-- 附件按钮 -->
    <el-button
      :disabled="disabled"
      class="attach-btn"
      circle
      title="上传报告（支持 PDF）"
      @click="triggerFileInput"
    >
      <el-icon><Upload /></el-icon>
    </el-button>
    <input
      ref="fileInputRef"
      type="file"
      accept=".pdf"
      style="display: none"
      @change="handleFileSelect"
    />
    <el-button :disabled="!canSend" type="primary" class="send-btn" @click="$emit('send')">
      <el-icon>
        <Promotion />
      </el-icon>
    </el-button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  attachedFile: {
    type: [File, null],
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'send', 'file-select', 'file-remove'])

const fileInputRef = ref(null)

const canSend = computed(() => {
  return props.modelValue.trim().length > 0 && props.modelValue.length <= 500
})

const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('send')
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  // 文件大小限制 5MB
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过5MB')
    return
  }

  emit('file-select', file)
  // 重置 input 以便再次选择同一文件
  e.target.value = ''
}

const removeFile = () => {
  emit('file-remove')
}
</script>

<style lang="scss" scoped>
.chat-input {
  border-top: 1px solid rgba(251, 146, 60, 0.1);
  padding: 20px 24px;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 252, 248, 0.7) 100%);
  backdrop-filter: blur(10px);
  flex-shrink: 0;

  .input-container {
    flex: 1;
  }

  .file-preview {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    margin-bottom: 8px;
    background: rgba(251, 146, 60, 0.08);
    border-radius: 8px;
    font-size: 13px;
    color: #fb923c;

    .file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-remove {
      cursor: pointer;
      color: #909399;
      &:hover {
        color: #f56c6c;
      }
    }
  }

  .input-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #78716c;
    font-weight: 500;
  }

  .attach-btn {
    height: 40px;
    width: 40px;
    border-radius: 10px;
    border: 1px dashed #fb923c;
    color: #fb923c;
    background: #fff;
    font-size: 18px;
    transition: all 0.2s;

    &:hover {
      background: #fb923c;
      color: #fff;
      border-style: solid;
    }
  }

  .send-btn {
    height: 60px;
    width: 60px;
    border-radius: 16px;
    background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%) !important;
    border: none !important;
    box-shadow: 0 6px 20px rgba(251, 146, 60, 0.25);
    transition: all 0.3s ease;
  }
}

@media (max-width: 768px) {
  .chat-input {
    padding: 12px 15px;
    gap: 8px;
    .send-btn {
      height: 48px;
      width: 48px;
      border-radius: 12px;
    }
    .attach-btn {
      height: 36px;
      width: 36px;
    }
  }
}
</style>
