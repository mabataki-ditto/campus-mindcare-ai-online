import { ref } from 'vue'

/**
 * 弹窗表单逻辑 Composable
 *
 * 提供弹窗开关、当前行数据、表单初始化等通用逻辑
 *
 * @param {Object} options - 配置项
 * @param {Function} options.initForm - 表单初始值工厂函数，返回初始表单对象
 * @returns {Object} - { dialogVisible, currentRow, formData, openDialog, closeDialog }
 */
export function useDialogForm(options = {}) {
  const { initForm } = options

  const dialogVisible = ref(false)
  const currentRow = ref(null)
  const formData = ref(initForm ? initForm() : {})

  /**
   * 打开弹窗
   * @param {Object} row - 当前行数据（编辑时传入，新增时不传）
   */
  const openDialog = (row = null) => {
    currentRow.value = row
    if (row) {
      // 编辑：用行数据填充表单
      formData.value = { ...row }
    } else {
      // 新增：重置为初始值
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
