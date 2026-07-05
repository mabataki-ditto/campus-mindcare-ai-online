import { ref, type Ref } from 'vue'

interface UseDialogFormOptions {
  /** 表单初始值工厂函数，返回初始表单对象 */
  initForm?: () => Record<string, any>
}

/**
 * 弹窗表单逻辑 Composable
 *
 * 提供弹窗开关、当前行数据、表单初始化等通用逻辑
 */
export function useDialogForm(options: UseDialogFormOptions = {}) {
  const { initForm } = options

  const dialogVisible = ref(false)
  const currentRow: Ref<any> = ref(null)
  const formData: Ref<Record<string, any>> = ref(initForm ? initForm() : {})

  /**
   * 打开弹窗
   * @param row - 当前行数据（编辑时传入，新增时不传）
   */
  const openDialog = (row: any = null) => {
    currentRow.value = row
    if (row) {
      formData.value = { ...row }
    } else {
      formData.value = initForm ? initForm() : {}
    }
    dialogVisible.value = true
  }

  /** 关闭弹窗并重置状态 */
  const closeDialog = () => {
    dialogVisible.value = false
    currentRow.value = null
    formData.value = initForm ? initForm() : {}
  }

  return {
    dialogVisible,
    currentRow,
    formData,
    openDialog,
    closeDialog
  }
}