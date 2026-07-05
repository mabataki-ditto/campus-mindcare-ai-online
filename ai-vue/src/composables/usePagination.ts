import { reactive } from 'vue'

export interface PaginationState {
  currentPage: number
  size: number
  total: number
}

/**
 * 分页逻辑 Composable
 *
 * 提供分页状态和翻页方法，配合 useTableSearch 使用
 *
 * @param options.pageSize - 每页条数，默认 10
 */
export function usePagination(options: { pageSize?: number } = {}) {
  const { pageSize = 10 } = options

  const pagination = reactive<PaginationState>({
    currentPage: 1,
    size: pageSize,
    total: 0
  })

  /** 翻页回调，更新当前页并触发搜索 */
  const handleChange = (page: number, onSearch?: () => void) => {
    pagination.currentPage = page
    onSearch?.()
  }

  /** 重置分页到第一页 */
  const resetPagination = () => {
    pagination.currentPage = 1
    pagination.total = 0
  }

  return {
    pagination,
    handleChange,
    resetPagination
  }
}