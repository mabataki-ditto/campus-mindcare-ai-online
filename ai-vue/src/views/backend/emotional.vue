<template>
  <div>
    <PageHead title="心情档案" />
    <el-table :data="tableData" style="width: 100%">
      <el-table-column label="用户" width="150px">
        <template #default="scope">
          <div class="user-info">
            <el-avatar :size="32">{{ scope.row.userNickname }}</el-avatar>
            <span>{{ scope.row.userNickname }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="moodScore" label="情绪评分" width="200px">
        <template #default="scope">
          <div class="mood-score-container">
            <div class="mood-emoji">{{ getMoodEmoji(scope.row.moodScore) }}</div>
            <div class="mood-score">{{ scope.row.moodScore }}</div>
            <el-rate v-model.number="scope.row.moodScore" disabled show-score />
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="moodLabel" label="情绪标签" width="150px">
        <template #default="scope">
          <el-tag size="small" type="info">{{ scope.row.moodLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="内容" min-width="180px">
        <template #default="scope">
          <div class="diary-content">{{ truncateText(scope.row.content, 100) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170px">
        <template #default="scope">
          {{ formatDate(scope.row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100px">
        <template #default="scope">
          <el-button type="danger" text @click="handleDelete(scope.row)">删除</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import PageHead from '@/components/layouts/PageHead.vue'
import { getEmotionalPage, deleteEmotional } from '@/service/admin/admin'
import { formatDate } from '@/utils/formatDate'
import { usePagination } from '@/composables/usePagination'
import { useTableSearch } from '@/composables/useTableSearch'

const { pagination, handleChange } = usePagination()
const { tableData, handleSearch, handleDelete } = useTableSearch({
  fetchApi: getEmotionalPage,
  deleteApi: deleteEmotional,
  pagination
})

const getMoodEmoji = (score: number): string => {
  if (score >= 8) return '😊'
  if (score >= 6) return '😐'
  if (score >= 3) return '😔'
  return '😢'
}

const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

onMounted(() => {
  handleSearch()
})
</script>

<style lang="scss" scoped>
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  span {
    font-weight: 500;
  }
}
.mood-score-container {
  display: flex;
  align-items: center;
  gap: 8px;
  .mood-emoji {
    font-size: 20px;
  }
  .mood-score {
    font-weight: bold;
    color: #409eff;
  }
}
.diary-content {
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
