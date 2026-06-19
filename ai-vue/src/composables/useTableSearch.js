import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

/**
 * 表格搜索逻辑 Composable
 *
 * 提供表格数据加载、搜索、删除确认等通用逻辑
 *
 * @param {Object} options - 配置项
 * @param {Function} options.fetchApi - 分页查询接口
 * @param {Function} options.deleteApi - 删除接口（可选）
 * @param {Object} options.pagination - usePagination 返回的 pagination 对象
 * @returns {Object} - { tableData, loading, handleSearch, handleDelete }
 */
export function useTableSearch(options) {
  const { fetchApi, deleteApi, pagination } = options

  const tableData = ref([])
  const loading = ref(false)

  /**
   * 搜索/刷新表格数据
   * @param {Object} formData - 额外的搜索参数
   */
  const handleSearch = async (formData = {}) => {
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

  /**
   * 删除确认
   * @param {Object} row - 当前行数据
   * @param {Object} options - 配置项
   * @param {string} options.title - 确认提示的标题描述
   * @param {string} options.idKey - ID 字段名，默认 'id'
   */
  const handleDelete = (row, options = {}) => {
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
