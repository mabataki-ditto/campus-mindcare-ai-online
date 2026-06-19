<template>
  <div>
    <PageHead title="知识文章">
      <template #buttons>
        <el-button @click="handleEdit({})" type="primary">新增</el-button>
      </template>
    </PageHead>

    <TableSearch :formItem="formItem" @search="handleSearch" />
    <el-table :data="tableData" style="width: 100%; margin-top: 25px">
      <el-table-column label="文章标题" min-width="220">
        <template #default="scope">
          <div style="display: flex; align-items: center">
            <span>{{ scope.row.title }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类" min-width="180">
        <template #default="scope">
          <span>{{ categoryMap[scope.row.categoryId] }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="authorName" label="作者" min-width="150" />
      <el-table-column prop="readCount" label="阅读量" min-width="150" />
      <el-table-column label="发布时间" width="170px">
        <template #default="scope">
          {{ formatDate(scope.row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240px">
        <template #default="scope">
          <el-button @click="handleEdit(scope.row)" text type="primary">编辑</el-button>
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
import { categoryTree, articlePage, getArticleDetail, changeArticleStatus, deleteArticle } from '@/service/admin/admin'
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
    changeArticleStatus(row.id, { status: 1 }).then(() => {
      ElMessage.success('发布成功')
      handleSearch()
    }).catch((err) => {
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
    changeArticleStatus(row.id, { status: 2 }).then(() => {
      ElMessage.success('下线成功')
      handleSearch()
    }).catch((err) => {
      console.error('下线失败:', err)
      ElMessage.error('下线失败')
    })
  })
}

onMounted(async () => {
  try {
    const data = (await categoryTree()) as any[]
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
