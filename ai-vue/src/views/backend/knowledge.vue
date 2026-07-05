<template>
  <div class="knowledge-page">
    <PageHead title="知识文章">
      <template #buttons>
        <el-button @click="handleEdit({})" type="primary">新增</el-button>
      </template>
    </PageHead>

    <TableSearch :formItem="formItem" @search="handleSearch" />
    <div class="table-wrapper">
      <el-table :data="tableData" class="knowledge-table" style="width: 100%; margin-top: 25px">
        <el-table-column label="文章标题" min-width="240" show-overflow-tooltip>
          <template #default="scope">
            <div style="display: flex; align-items: center">
              <span class="article-title">{{ scope.row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" min-width="110" show-overflow-tooltip>
          <template #default="scope">
            <span>{{ categoryMap[scope.row.categoryId] }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="authorName" label="作者" min-width="100" show-overflow-tooltip />
        <el-table-column prop="readCount" label="阅读量" min-width="90" />
        <el-table-column label="RAG索引" min-width="110">
          <template #default="scope">
            <el-tooltip v-if="scope.row.ragIndexError" :content="scope.row.ragIndexError" placement="top">
              <el-tag :type="getRagStatusType(scope.row.ragIndexStatus)" size="small">
                {{ getRagStatusText(scope.row.ragIndexStatus) }}
              </el-tag>
            </el-tooltip>
            <el-tag v-else :type="getRagStatusType(scope.row.ragIndexStatus)" size="small">
              {{ getRagStatusText(scope.row.ragIndexStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" min-width="165">
          <template #default="scope">
            {{ formatDate(scope.row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="260">
          <template #default="scope">
            <div class="operation-buttons">
              <el-button @click="handleEdit(scope.row)" text type="primary">编辑</el-button>
              <el-button @click="handleReindex(scope.row)" v-if="scope.row.status === 1" text type="primary"
                >重建索引</el-button
              >
              <el-button
                @click="handlePublish(scope.row)"
                v-if="scope.row.status === 0 || scope.row.status === 2"
                text
                type="success"
                >发布</el-button
              >
              <el-button @click="handleUnpublish(scope.row)" v-if="scope.row.status === 1" text type="warning"
                >下线</el-button
              >
              <el-button @click="handleDelete(scope.row)" text type="danger">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-pagination
      style="margin-top: 25px"
      :page-size="pagination.size"
      layout="prev, pager, next"
      :total="pagination.total"
      @current-change="(page) => handleChange(page, handleSearch)"
    />

    <ArticleDialog
      v-model:modelValue="dialogVisible"
      :article="currentArticle"
      :categories="categories"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import PageHead from '@/components/layouts/PageHead.vue'
import TableSearch from '@/components/TableSearch.vue'
import {
  categoryList,
  articlePage,
  getArticleDetail,
  changeArticleStatus,
  deleteArticle,
  reindexArticle
} from '@/service/admin/admin'
import ArticleDialog from '@/components/ArticleDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate } from '@/utils/formatDate'
import { usePagination } from '@/composables/usePagination'
import { useTableSearch } from '@/composables/useTableSearch'
import { useDialogForm } from '@/composables/useDialogForm'

const formItem: any[] = [
  { comp: 'input', prop: 'title', label: '文章标题', placeholder: '请输入文章标题' },
  { comp: 'select', prop: 'categoryId', label: '分类', placeholder: '请选择分类' },
  {
    comp: 'select',
    prop: 'status',
    label: '状态',
    options: [
      { label: '草稿', value: '0' },
      { label: '已发布', value: '1' },
      { label: '已下线', value: '2' }
    ]
  }
]

const { pagination, handleChange } = usePagination()
const { tableData, handleSearch, handleDelete } = useTableSearch({
  fetchApi: articlePage,
  deleteApi: deleteArticle,
  pagination
})
const { dialogVisible, currentRow: currentArticle, closeDialog } = useDialogForm()

const categoryMap = reactive<Record<number, string>>({})
const categories = ref<any[]>([])

const handleSuccess = () => {
  closeDialog()
  handleSearch()
}

const handleEdit = (row: any) => {
  if (!row.id) {
    currentArticle.value = null
    dialogVisible.value = true
  } else {
    getArticleDetail(row.id).then((res: any) => {
      currentArticle.value = res
      dialogVisible.value = true
    })
  }
}

const handlePublish = (row: any) => {
  ElMessageBox.confirm(`确认发布文章${row.title}吗？`, '确认', {
    confirmButtonText: '确定发布',
    cancelButtonText: '取消',
    type: 'info'
  }).then(() => {
    changeArticleStatus(row.id, { status: 1 })
      .then(() => {
        ElMessage.success('发布成功')
        handleSearch()
      })
      .catch((err) => {
        console.error('发布失败:', err)
        ElMessage.error('发布失败')
      })
  })
}

const handleUnpublish = (row: any) => {
  ElMessageBox.confirm(`确认下线文章${row.title}吗？`, '确认', {
    confirmButtonText: '确定下线',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    changeArticleStatus(row.id, { status: 2 })
      .then(() => {
        ElMessage.success('下线成功')
        handleSearch()
      })
      .catch((err) => {
        console.error('下线失败:', err)
        ElMessage.error('下线失败')
      })
  })
}

const handleReindex = (row: any) => {
  ElMessageBox.confirm(`确认重建文章${row.title}的 RAG 索引吗？`, '确认', {
    confirmButtonText: '重建索引',
    cancelButtonText: '取消',
    type: 'info'
  }).then(() => {
    reindexArticle(row.id)
      .then(() => {
        ElMessage.success('索引重建完成')
        handleSearch()
      })
      .catch((err) => {
        console.error('索引重建失败:', err)
        ElMessage.error('索引重建失败')
        handleSearch()
      })
  })
}

const getRagStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    PENDING: '待索引',
    INDEXING: '索引中',
    INDEXED: '已索引',
    FAILED: '失败',
    DELETED: '未索引'
  }
  return statusMap[status || 'PENDING'] || '待索引'
}

const getRagStatusType = (status?: string): 'success' | 'primary' | 'warning' | 'info' | 'danger' => {
  const typeMap: Record<string, 'success' | 'primary' | 'warning' | 'info' | 'danger'> = {
    PENDING: 'info',
    INDEXING: 'warning',
    INDEXED: 'success',
    FAILED: 'danger',
    DELETED: 'info'
  }
  return typeMap[status || 'PENDING'] || 'info'
}

onMounted(async () => {
  try {
    const data = (await categoryList()) as any[]
    categories.value = data.map((item) => {
      categoryMap[item.id] = item.categoryName
      return { label: item.categoryName, value: item.id }
    })
    formItem[1].options = categories.value
    handleSearch()
  } catch (error) {
    console.error('加载分类数据失败:', error)
  }
})
</script>

<style lang="scss" scoped>
.knowledge-page {
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.table-wrapper {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
}

.knowledge-table {
  min-width: 960px;
}

.article-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operation-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;

  :deep(.el-button) {
    margin-left: 0;
  }
}
</style>
