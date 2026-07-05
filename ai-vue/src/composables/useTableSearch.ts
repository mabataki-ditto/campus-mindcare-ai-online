import { ref, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { PaginationState } from './usePagination'

interface UseTableSearchOptions {
  fetchApi: (params: Record<string, any>) => Promise<any>
  deleteApi?: (id: number) => Promise<any>
  pagination: PaginationState
}

/**
 * 表格搜索逻辑 Composable
 *
 * 提供表格数据加载、搜索、删除确认等通用逻辑
 */
export function useTableSearch(options: UseTableSearchOptions) {
  const { fetchApi, deleteApi, pagination } = options

  const tableData: Ref<any[]> = ref([])
  const loading = ref(false)

  /**
   * 搜索/刷新表格数据
   * @param formData - 额外的搜索参数
   */
  const handleSearch = async (formData: Record<string, any> = {}) => {
    loading.value = true
    try {
      // 过滤掉空字符串参数，避免后端 Number("") 得到 0
      const filteredFormData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      )
      const params = { ...pagination, ...filteredFormData }
      const res = await fetchApi(params)
      tableData.value = res.records || []
      pagination.total = res.total
    } catch (err) {
      console.error('查询失败:', err)
    } finally {
      loading.value = false
    }
  }

  interface DeleteOptions {
    title?: string
    idKey?: string
  }

  /**
   * 删除确认
   * @param row - 当前行数据
   * @param options.title - 确认提示的标题描述
   * @param options.idKey - ID 字段名，默认 'id'
   */
  const handleDelete = (row: any, options: DeleteOptions = {}) => {
    const { title = '该记录', idKey = 'id' } = options

    ElMessageBox.confirm(`确认删除${title}吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(async () => {
        if (deleteApi) {
          await deleteApi(row[idKey])
          ElMessage.success('删除成功')
          handleSearch()
        }
      })
      .catch(() => {})
  }

  return {
    tableData,
    loading,
    handleSearch,
    handleDelete
  }
}