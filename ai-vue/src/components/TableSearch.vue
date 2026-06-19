<template>
  <el-form ref="ruleFormRef" :model="formData">
    <el-row :gutter="24">
      <template v-for="item in formItemAttrs" :key="item.prop">
        <el-col v-bind="item.col">
          <el-form-item :label="item.label" :prop="item.prop">
            <el-input v-if="item.comp === 'input'" v-model="formData[item.prop]" :placeholder="item.placeholder" clearable />
            <el-select v-else-if="item.comp === 'select'" v-model="formData[item.prop]" :placeholder="item.placeholder" clearable>
              <el-option label="全部" value="" />
              <el-option v-for="opt in item.options" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </template>
    </el-row>
    <el-row>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset(ruleFormRef)">重置</el-button>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

interface IFormItem {
  comp: string
  prop: string
  label: string
  placeholder?: string
  options?: { label: string; value: any }[]
  col?: any
}

const props = defineProps<{
  formItem: IFormItem[]
}>()

const emit = defineEmits(['search'])

const formItemAttrs = computed(() => {
  const { formItem } = props
  formItem.forEach((item) => {
    item.col = { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 }
  })
  return formItem
})

const ruleFormRef = ref()
const formData = reactive<Record<string, any>>({})

const handleSearch = () => {
  emit('search', formData)
}

const handleReset = (formEl: any) => {
  if (!formEl) return
  formEl.resetFields()
  emit('search', formData)
}
</script>