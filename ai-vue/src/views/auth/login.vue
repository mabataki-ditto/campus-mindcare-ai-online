<template>
  <div class="container">
    <div class="title">
      <div class="back-home" @click="router.push('/')">
        <el-icon>
          <Back />
        </el-icon>
        <span>返回首页</span>
      </div>
      <div class="title-text">
        <h2>登录您的账户</h2>
        <p>请输入您的登录信息</p>
      </div>
    </div>
    <div class="form-container">
      <el-form ref="ruleFormRef" :model="formData" :rules="rules" label-position="top">
        <el-form-item label="用户名或邮箱" prop="username">
          <el-input v-model="formData.username" size="large" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="formData.password" size="large" placeholder="请输入密码" type="password" show-password />
        </el-form-item>
        <el-button class="btn" size="large" type="primary" @click="submitForm(ruleFormRef)">登录</el-button>
      </el-form>
      <div class="footer">
        <p>还没有账户？<router-link to="/auth/register">去注册</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import useLoginStore from '@/stores/login/login'
import { login } from '@/service/admin/admin'

const router = useRouter()
const loginStore = useLoginStore()

const ruleFormRef = ref<FormInstance>()

const formData = reactive({
  username: '',
  password: ''
})

const rules = reactive<FormRules>({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
})

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid) => {
    if (valid) {
      login(formData)
        .then((data: any) => {
          const token = data?.token || ''
          const userInfo = data?.userInfo || {}
          
          if (token) {
            ElMessage.success('登录成功')
            loginStore.loginAction(token, userInfo)
          } else {
            ElMessage.warning('无法获取登录数据')
          }
        })
        .catch((err: any) => {
          ElMessage.error(err?.msg || err?.message || '登录失败')
        })
    }
  })
}
</script>

<style lang="scss" scoped>
.container {
  width: 384px;

  .title {
    .back-home {
      margin-bottom: 60px;
      cursor: pointer;
    }

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
      width: 100%;
      margin-bottom: 40px;
    }

    .footer {
      padding: 30px;
      text-align: center;
    }
  }
}
</style>