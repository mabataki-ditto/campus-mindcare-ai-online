<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card v-if="aiData.systemOverview">
          <div class="card-content">
            <div class="avatar users">
              <el-image style="width: 40px; height: 40px" :src="iconUrl1"></el-image>
            </div>
            <div class="info">
              <p class="title">用户总数</p>
              <p class="number">{{ aiData.systemOverview.totalUsers }}</p>
              <p class="subtitle-title">活跃用户：{{ aiData.systemOverview?.activeUsers }}</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card v-if="aiData.systemOverview">
          <div class="card-content">
            <div class="avatar like">
              <el-image style="width: 40px; height: 40px" :src="iconUrl2"></el-image>
            </div>
            <div class="info">
              <p class="title">心情档案</p>
              <p class="number">{{ aiData.systemOverview.totalDiaries }}</p>
              <p class="subtitle-title">活跃用户：{{ aiData.systemOverview.todayNewDiaries }}</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card v-if="aiData.systemOverview">
          <div class="card-content">
            <div class="avatar comments">
              <el-image style="width: 40px; height: 40px" :src="iconUrl3"></el-image>
            </div>
            <div class="info">
              <p class="title">咨询会话</p>
              <p class="number">{{ aiData.systemOverview.totalSessions }}</p>
              <p class="subtitle-title">今日新增{{ aiData.systemOverview.todayNewSessions }}</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card v-if="aiData.systemOverview">
          <div class="card-content">
            <div class="avatar smile">
              <el-image style="width: 40px; height: 40px" :src="iconUrl4"></el-image>
            </div>
            <div class="info">
              <p class="title">预警事件</p>
              <p class="number">{{ aiData.systemOverview.totalAlerts || 0 }}</p>
              <p class="subtitle-title">待处理：{{ aiData.systemOverview.pendingAlerts || 0 }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px" :gutter="20">
      <el-col :span="12">
        <el-card style="width: 100%">
          <template #header>
            <div class="card-header">情绪趋势分析</div>
          </template>
          <div class="chart-content">
            <div ref="emotionChartRef" style="width: 100%; height: 300px"></div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card style="width: 100%">
          <template #header>
            <div class="card-header">咨询会话统计</div>
          </template>
          <div class="chart-content">
            <div v-if="aiData.consultationStats" class="consultation-stats">
              <div class="stat-item">
                <div class="stat-label">总会话数</div>
                <div class="stat-value">{{ aiData.consultationStats.totalSessions }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">平均时长</div>
                <div class="stat-value">{{ aiData.consultationStats.avgDurationMinutes }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">活跃用户</div>
                <div class="stat-value">{{ aiData.systemOverview?.activeUsers }}</div>
              </div>
            </div>
            <div ref="consultationChartRef" style="width: 100%; height: 260px"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px">
      <el-card style="width: 100%">
        <template #header>
          <div class="card-header">用户活跃度趋势</div>
        </template>
        <div class="chart-content">
          <div ref="userActivityChartRef" style="width: 100%; height: 300px"></div>
        </div>
      </el-card>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { getAnalyticsOverview } from '@/service/admin/admin'
import { onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'

const iconUrl1 = new URL('@/assets/images/users.png', import.meta.url).href
const iconUrl2 = new URL('@/assets/images/like.png', import.meta.url).href
const iconUrl3 = new URL('@/assets/images/comments.png', import.meta.url).href
const iconUrl4 = new URL('@/assets/images/smile.png', import.meta.url).href

interface SystemOverview {
  totalUsers: number
  activeUsers: number
  totalDiaries: number
  todayNewDiaries: number
  totalSessions: number
  todayNewSessions: number
  totalAlerts: number
  pendingAlerts: number
}

interface DashboardData {
  systemOverview: SystemOverview
  emotionTrend: Array<{ date: string; avgMoodScore: number; recordCount: number }>
  consultationStats: {
    totalSessions: number
    avgDurationMinutes: number
    dailyTrend: Array<{ date: string; sessionCount: number; userCount: number }>
  }
  userActivity: Array<{ date: string; activeUsers: number; newUsers: number; diaryUsers: number; consultationUsers: number }>
}

const aiData = ref<Partial<DashboardData>>({})

let emotionChart: ReturnType<typeof echarts.init> | null = null
const emotionChartRef = ref<HTMLElement | null>(null)
const initEmotionChart = () => {
  if (!emotionChartRef.value) return
  if (emotionChart) {
    emotionChart.dispose()
  }
  emotionChart = echarts.init(emotionChartRef.value)
  const TrendData = aiData.value.emotionTrend || []

  const option = {
    title: {
      text: '情感趋势分析',
      textStyle: { color: '#2d3436', fontSize: 16, fontWeight: 600 },
      left: 'center',
      top: 10
    },
    tooltip: { trigger: 'axis' },
    legend: { data: ['平均情绪评分', '记录数量'], top: 40 },
    grid: { left: '3%', right: '4%', top: 80, bottom: '3%' },
    xAxis: { type: 'category', data: TrendData.map((item: any) => item.date) },
    yAxis: [
      { type: 'value', name: '情绪评分', position: 'left' },
      { type: 'value', name: '记录数量', position: 'right' }
    ],
    series: [
      {
        name: '平均情绪评分',
        type: 'line',
        data: TrendData.map((item: any) => item.avgMoodScore),
        smooth: true,
        lineStyle: { width: 3, color: '#faebaf' },
        itemStyle: { color: '#faebaf' }
      },
      {
        name: '记录数量',
        type: 'line',
        data: TrendData.map((item: any) => item.recordCount),
        smooth: true,
        lineStyle: { width: 3, color: '#eeb5a3' },
        itemStyle: { color: '#eeb5a3' }
      }
    ]
  }
  emotionChart.setOption(option)
}

let consultationChart: ReturnType<typeof echarts.init> | null = null
const consultationChartRef = ref<HTMLElement | null>(null)
const initConsultationChart = () => {
  if (!consultationChartRef.value) return
  if (consultationChart) {
    consultationChart.dispose()
  }
  consultationChart = echarts.init(consultationChartRef.value)
  const dailyTrend = aiData.value.consultationStats?.dailyTrend || []

  const option = {
    title: {
      text: '咨询活动统计',
      textStyle: { fontSize: 16, fontWeight: 600, color: '#2d3436' },
      left: 'center',
      top: 10
    },
    tooltip: { trigger: 'axis' },
    legend: { data: ['会话数量', '参与用户数'], top: 40 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 80, containLabel: true },
    xAxis: { type: 'category', data: dailyTrend.map((item: any) => item.date) },
    yAxis: { type: 'value' },
    series: [
      { name: '会话数量', type: 'bar', data: dailyTrend.map((item: any) => item.sessionCount), barWidth: '40%' },
      { name: '参与用户数', type: 'bar', data: dailyTrend.map((item: any) => item.userCount), barWidth: '40%' }
    ]
  }
  consultationChart.setOption(option)
}

let userActivityChart: ReturnType<typeof echarts.init> | null = null
const userActivityChartRef = ref<HTMLElement | null>(null)
const initUserActivityChart = () => {
  if (!userActivityChartRef.value) return
  if (userActivityChart) {
    userActivityChart.dispose()
  }
  userActivityChart = echarts.init(userActivityChartRef.value)
  const activityData = aiData.value.userActivity || []

  const option = {
    title: {
      text: '用户活跃度趋势',
      textStyle: { fontSize: 16, fontWeight: 600, color: '#2d3436' },
      left: 'center',
      top: 10
    },
    tooltip: { trigger: 'axis' },
    legend: { data: ['活跃用户', '新增用户', '日记用户', '咨询用户'], top: 40 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 80, containLabel: true },
    xAxis: { type: 'category', data: activityData.map((item: any) => item.date) },
    yAxis: { type: 'value' },
    series: [
      {
        name: '活跃用户',
        type: 'line',
        data: activityData.map((item: any) => item.activeUsers),
        smooth: true,
        areaStyle: {}
      },
      { name: '新增用户', type: 'line', data: activityData.map((item: any) => item.newUsers), smooth: true },
      { name: '日记用户', type: 'line', data: activityData.map((item: any) => item.diaryUsers), smooth: true },
      { name: '咨询用户', type: 'line', data: activityData.map((item: any) => item.consultationUsers), smooth: true }
    ]
  }
  userActivityChart.setOption(option)
}

onMounted(() => {
  getAnalyticsOverview().then((res: any) => {
    aiData.value = res
    initCharts()
  })
})

const handleResize = () => {
  emotionChart?.resize()
  consultationChart?.resize()
  userActivityChart?.resize()
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  emotionChart?.dispose()
  consultationChart?.dispose()
  userActivityChart?.dispose()
})

const initCharts = () => {
  initEmotionChart()
  initConsultationChart()
  initUserActivityChart()
  window.addEventListener('resize', handleResize)
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  .card-content {
    display: flex;
    align-items: center;
    .avatar {
      margin-right: 12px;
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      &.users {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      &.like {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      &.comments {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }
      &.smile {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      }
    }
    .info {
      .title {
        font-size: 14px;
        color: #7f8c8d;
        margin-bottom: 4px;
      }
      .number {
        font-size: 24px;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 4px;
      }
      .subtitle-title {
        font-size: 12px;
        color: #95a5a6;
      }
    }
  }
  .chart-content {
    padding: 20px;
    height: 300px;
    position: relative;
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
    .consultation-stats {
      display: flex;
      justify-content: space-around;
      margin-bottom: 20px;
      .stat-item {
        text-align: center;
        .stat-label {
          font-size: 12px;
          color: #7f8c8d;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
        }
      }
    }
  }
}
</style>
