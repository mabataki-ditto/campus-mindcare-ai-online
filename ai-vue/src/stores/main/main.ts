import { defineStore } from 'pinia'
import { ref } from 'vue'

const useMainStore = defineStore('main', () => {
  const isCollapse = ref(false)
  
  const toggleCollapse = () => {
    isCollapse.value = !isCollapse.value
  }
  
  return {
    isCollapse,
    toggleCollapse
  }
})

export default useMainStore