<template>
  <div class="container">
    <div class="title">
      <div class="title-text">
        <h2>创建您的账户</h2>
        <p>请填写注册信息</p>
      </div>
    </div>
    <div class="form-container">
      <el-form label-position="top" :model="formData" :rules="rules" ref="submitFormRef">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" placeholder="请输入用户名" size="large" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" size="large" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="formData.nickname" placeholder="请输入昵称（可选）" size="large" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号（可选）" size="large" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="formData.password" placeholder="请输入密码" size="large" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="formData.confirmPassword" placeholder="请再次输入确认密码" type="password" size="large" />
        </el-form-item>
        <el-button class="btn" type="primary" size="large" @click="submitForm(submitFormRef)">注册</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { register } from '@/service/frontend/frontend'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()

const formData = reactive({
  username: '',
  email: '',
  nickname: '',
  phone: '',
  password: '',
  confirmPassword: '',
  gender: 0,
  userType: 1
})

const rules = reactive<FormRules>({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请再次输入确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: (err?: Error) => void) => {
        if (value !== formData.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})

const submitFormRef = ref<FormInstance>()

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  formEl.validate(async (valid) => {
    if (!valid) return
    
    console.log('准备注册，数据:', formData)
    register(formData)
      .then((res: any) => {
        console.log('注册响应:', res)
        ElMessage.success('注册成功')
        router.push('/auth/login')
      })
      .catch((err: any) => {
        console.error('注册失败:', err)
        ElMessage.error(err?.msg || err?.message || '注册失败，请重试')
      })
  })
}
</script>

<style lang="scss" scoped>
.container {
  width: 384px;
  .title {
    .title-text {
      text-align: center;
      h2 {
        font-size: 36px;
        margin-bottom: 10px;
      }
      p {
        font-size: 18px;
        color: #6b7280;
      }
    }
  }
  .form-container {
    margin-top: 30px;
    .btn {
      margin-top: 40px;
      width: 100%;
    }
  }
}
</style>