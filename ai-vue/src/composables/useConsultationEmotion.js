import { ref } from 'vue'
import { getSessionEmotion } from '@/service/frontend/frontend'

// 默认情绪状态，后端未返回数据或会话为空时使用
const createDefaultEmotion = () => ({
  primaryEmotion: '中性',
  emotionScore: 50,
  isNegative: false,
  riskLevel: 0,
  suggestion: '情绪状态平稳',
  improvementSuggestions: [],
  riskDescription: ''
})

/**
 * 咨询会话情绪管理
 * 负责加载、重置当前会话的情绪分析结果，并提供情绪分数和风险等级的展示辅助函数
 */
export function useConsultationEmotion() {
  // 当前会话的情绪状态，初始为默认值
  const currentEmotion = ref(createDefaultEmotion())

  // 重置为默认情绪状态（切换会话或会话结束时调用）
  const resetEmotion = () => {
    currentEmotion.value = createDefaultEmotion()
  }

  /**
   * 加载指定会话的情绪分析结果
   * @param sessionId 会话 ID
   * @param forceRefresh 是否强制刷新（true 时后端会重新调用 AI 分析，否则用缓存）
   */
  const loadSessionEmotion = async (sessionId, forceRefresh = false) => {
    if (!sessionId) {
      resetEmotion()
      return
    }

    const res = await getSessionEmotion(sessionId, forceRefresh)
    // 合并默认值和接口返回，保证字段完整；improvementSuggestions 需确保是数组
    currentEmotion.value = {
      ...createDefaultEmotion(),
      ...res,
      improvementSuggestions: Array.isArray(res?.improvementSuggestions) ? res.improvementSuggestions : []
    }
  }

  /**
   * 根据情绪分数返回强度等级（用于侧边栏圆点显示）
   * @param score 0-100，0=极度负面，100=极度正面
   * @returns 1=低 2=中 3=高
   */
  const getIntensityClass = (score) => {
    if (score >= 61) return 3
    if (score >= 31) return 2
    return 1
  }

  /**
   * 根据风险等级返回中文描述
   * @param level 0=正常 1=关注 2=预警 3=危机
   */
  const getRiskText = (level) => {
    switch (level) {
      case 0:
        return '正常'
      case 1:
        return '关注'
      case 2:
        return '预警'
      case 3:
        return '危机'
      default:
        return '正常'
    }
  }

  return {
    currentEmotion,
    resetEmotion,
    loadSessionEmotion,
    getIntensityClass,
    getRiskText
  }
}
