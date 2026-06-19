<template>
  <div>
    <PageHead title="AI陪伴记录" />

    <el-tabs v-model="activeTab">
      <!-- 会话记录 Tab -->
      <el-tab-pane label="会话记录" name="sessions">
        <el-table :data="tableData" style="width: 100%" :row-class-name="riskRowClass">
          <el-table-column label="用户" width="100px">
            <template #default="scope">
              <el-avatar>{{ scope.row.userNickname }}</el-avatar>
            </template>
          </el-table-column>
          <el-table-column label="咨询信息">
            <template #default="scope">
              <div class="session-title">{{ scope.row.sessionTitle }}</div>
              <div class="session-preview">{{ scope.row.sessionPreview }}</div>
            </template>
          </el-table-column>
          <el-table-column label="风险等级" width="100px">
            <template #default="scope">
              <el-tag :type="getRiskTagType(scope.row.riskLevel)" size="small">
                {{ getRiskLabel(scope.row.riskLevel) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="messageCount" label="消息数" width="100px" />
          <el-table-column label="时间" width="180px">
            <template #default="scope">
              {{ formatDate(scope.row.lastMessageTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100px">
            <template #default="scope">
              <el-button type="primary" text @click="viewSessionDetail(scope.row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          style="margin-top: 25px"
          :page-size="pagination.size"
          layout="prev, pager, next"
          :total="pagination.total"
          @current-change="(page) => handleChange(page, handleSearch)"
        />
      </el-tab-pane>

      <!-- 预警记录 Tab -->
      <el-tab-pane label="预警记录" name="alerts">
        <el-table :data="alertList" style="width: 100%">
          <el-table-column label="用户" width="120px">
            <template #default="scope">
              {{ scope.row.user?.nickname || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="风险等级" width="100px">
            <template #default="scope">
              <el-tag :type="getRiskTagType(scope.row.riskLevel)" size="small">
                {{ getRiskLabel(scope.row.riskLevel) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="预警原因" show-overflow-tooltip />
          <el-table-column label="触发时间" width="170px">
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100px">
            <template #default="scope">
              <el-tag :type="scope.row.handled ? 'success' : 'danger'" size="small">
                {{ scope.row.handled ? '已处置' : '待处理' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120px">
            <template #default="scope">
              <el-button v-if="!scope.row.handled" type="warning" text @click="handleAlert(scope.row)">
                处置
              </el-button>
              <span v-else class="handled-text">已处置</span>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          style="margin-top: 25px"
          :page-size="alertPagination.size"
          layout="prev, pager, next"
          :total="alertPagination.total"
          @current-change="(page) => handleAlertPageChange(page)"
        />
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showDetailDialog" title="咨询会话详情" width="70%" :close-on-click-modal="false">
      <div class="session-detail">
        <div class="detail-header">
          <div class="detail-row">
            <div class="detail-label">用户：</div>
            <div class="detail-value">{{ sessionDetail.userNickname }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">开始时间：</div>
            <div class="detail-value">{{ formatDate(sessionDetail.startAt) }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">消息数：</div>
            <div class="detail-value">{{ sessionDetail.messageCount }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">风险等级：</div>
            <div class="detail-value">
              <el-tag :type="getRiskTagType(sessionDetail.riskLevel)" size="small">
                {{ getRiskLabel(sessionDetail.riskLevel) }}
              </el-tag>
            </div>
          </div>
        </div>
        <div class="messages-container">
          <div class="messages-header"><h4>对话记录</h4></div>
          <div class="messages-list" v-loading="loadingMessages">
            <div
              v-for="message in sessionMessages"
              :key="message.id"
              class="message-item"
              :class="message.senderType === 1 ? 'user-message' : 'ai-message'"
            >
              <div class="message-header">
                <span class="sender">{{ message.senderType === 1 ? '用户' : 'AI助手' }}</span>
                <span class="time">{{ formatDate(message.createdAt) }}</span>
              </div>
              <div class="message-content">{{ message.content }}</div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 预警处置弹窗 -->
    <el-dialog v-model="showHandleDialog" title="预警处置" width="500px" :close-on-click-modal="false">
      <el-form :model="handleFormData" label-width="80px">
        <el-form-item label="处置方式">
          <el-select v-model="handleFormData.handleMethod" placeholder="请选择处置方式">
            <el-option label="电话回访" value="phone" />
            <el-option label="面谈" value="interview" />
            <el-option label="转介" value="referral" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="处置备注">
          <el-input v-model="handleFormData.handleNote" type="textarea" :rows="3" placeholder="请输入处置备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showHandleDialog = false">取消</el-button>
        <el-button type="primary" @click="submitHandle">确认处置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { TagProps } from 'element-plus'
import PageHead from '@/components/layouts/PageHead.vue'
import { getConsultationPage, getSessionDetail } from '@/service/admin/admin'
import hyRequest from '@/service'
import { formatDate } from '@/utils/formatDate'
import { usePagination } from '@/composables/usePagination'
import { useTableSearch } from '@/composables/useTableSearch'
import { useDialogForm } from '@/composables/useDialogForm'

const activeTab = ref('sessions')

// 会话记录分页和搜索
const { pagination, handleChange } = usePagination()
const { tableData, handleSearch } = useTableSearch({
  fetchApi: getConsultationPage,
  pagination
})

// 会话详情弹窗
const { dialogVisible: showDetailDialog, currentRow: sessionDetail } = useDialogForm()

interface SessionMessage {
  id: number
  senderType: number
  content: string
  createdAt: string
}

interface AlertRecord {
  id: number
  userId: number
  riskLevel: number
  reason: string
  createdAt: string
  handled: boolean
  user?: { id: number; nickname: string }
  handleMethod?: string
  handleNote?: string
}

const sessionMessages = ref<SessionMessage[]>([])
const loadingMessages = ref(false)

// 预警记录分页
const { pagination: alertPagination, handleChange: handleAlertPageChange } = usePagination()
const alertList = ref<AlertRecord[]>([])
// 预警记录按用户ID缓存最新风险等级，用于同步到会话列表
const userLatestRiskMap = ref<Record<number, number>>({})

// 预警处置弹窗
const {
  dialogVisible: showHandleDialog,
  currentRow: currentAlert,
  formData: handleFormData,
  openDialog: openHandleDialog
} = useDialogForm({
  initForm: () => ({ handleMethod: '', handleNote: '' })
})

const getRiskLabel = (riskLevel: number) => {
  const map: Record<number, string> = { 0: '正常', 1: '关注', 2: '预警', 3: '危机' }
  return map[riskLevel] || '正常'
}

const getRiskTagType = (riskLevel: number): TagProps['type'] => {
  if (riskLevel >= 3) return 'danger'
  if (riskLevel >= 2) return 'warning'
  if (riskLevel >= 1) return 'info'
  return 'success'
}

const riskRowClass = ({ row }: { row: any }) => {
  const level = row.riskLevel ?? 0
  if (level >= 3) return 'risk-crisis-row'
  if (level >= 2) return 'risk-warning-row'
  return ''
}

const viewSessionDetail = (row: any) => {
  loadingMessages.value = true
  showDetailDialog.value = true
  getSessionDetail(row.id).then((res: any) => {
    loadingMessages.value = false
    sessionMessages.value = res
    sessionDetail.value = {
      ...row,
      riskLevel: userLatestRiskMap.value[row.userId] ?? row.riskLevel ?? 0
    }
  })
}

// 预警记录相关
const loadAlerts = () => {
  hyRequest
    .get({
      url: '/psychological-chat/alerts',
      params: { currentPage: alertPagination.currentPage, size: alertPagination.size }
    })
    .then((res: any) => {
      const records = res.records || res.list || []
      alertList.value = records
      alertPagination.total = res.total || 0

      for (const record of records) {
        const userId = record.userId || record.user?.id
        if (userId && record.riskLevel) {
          const prev = userLatestRiskMap.value[userId] || 0
          if (record.riskLevel > prev) {
            userLatestRiskMap.value[userId] = record.riskLevel
          }
        }
      }
    })
}

const handleAlert = (row: any) => {
  openHandleDialog(row)
}

const submitHandle = async () => {
  if (!handleFormData.value.handleMethod) {
    ElMessage.warning('请选择处置方式')
    return
  }
  try {
    await hyRequest.put({
      url: `/psychological-chat/alerts/${currentAlert.value.id}/handle`,
      data: handleFormData.value
    })
    ElMessage.success('处置成功')
    showHandleDialog.value = false
    loadAlerts()
  } catch {
    ElMessage.error('处置失败')
  }
}

onMounted(async () => {
  await loadAlerts()
  handleSearch()
})
</script>

<style lang="scss" scoped>
.session-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}
.session-preview {
  font-size: 13px;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.session-detail {
  max-height: 70vh;
  overflow-y: auto;
  .detail-header {
    margin-bottom: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }
  .detail-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    .detail-label {
      font-weight: 500;
      color: #495057;
      min-width: 80px;
      margin-right: 8px;
    }
    .detail-value {
      color: #333;
    }
  }
}
.messages-container {
  margin-top: 20px;
  .messages-header {
    margin-bottom: 16px;
    h4 {
      margin: 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }
  }
  .messages-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 16px;
    background: #fff;
    .message-item {
      margin-bottom: 12px;
      padding: 12px;
      border-radius: 8px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      &.user-message {
        background: #e8f4fd;
      }
      &.ai-message {
        background: #f0f9f0;
      }
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      .sender {
        font-weight: 500;
        color: #333;
      }
      .time {
        font-size: 12px;
        color: #999;
      }
    }
    .message-content {
      color: #333;
      line-height: 1.6;
      white-space: pre-wrap;
      margin-top: 8px;
      font-size: 14px;
    }
  }
}
.handled-text {
  color: #67c23a;
  font-size: 13px;
}

:deep(.risk-warning-row) {
  background-color: #fdf6ec !important;
}
:deep(.risk-crisis-row) {
  background-color: #fef0f0 !important;
}
</style>
