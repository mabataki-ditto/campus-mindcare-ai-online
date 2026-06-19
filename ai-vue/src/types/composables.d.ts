declare module '@/composables/usePagination' {
  interface PaginationState {
    currentPage: number
    size: number
    total: number
  }
  export function usePagination(options?: { pageSize?: number }): {
    pagination: PaginationState
    handleChange: (page: number, searchFn?: () => void) => void
    resetPagination: () => void
  }
}

declare module '@/composables/useTableSearch' {
  import type { Ref } from 'vue'
  interface TableSearchOptions {
    fetchApi: (...args: any[]) => Promise<any>
    deleteApi?: (...args: any[]) => Promise<any>
    pagination: any
  }
  export function useTableSearch(options: TableSearchOptions): {
    tableData: Ref<any[]>
    handleSearch: () => void
    handleDelete: (row: any) => void
  }
}

declare module '@/composables/useDialogForm' {
  import type { Ref } from 'vue'
  interface DialogFormOptions {
    initForm?: () => any
  }
  export function useDialogForm(options?: DialogFormOptions): {
    dialogVisible: Ref<boolean>
    currentRow: Ref<any>
    formData: Ref<any>
    openDialog: (row?: any) => void
    closeDialog: () => void
  }
}
