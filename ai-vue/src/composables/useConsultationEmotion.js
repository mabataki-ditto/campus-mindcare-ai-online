import { ref } from 'vue'
import { getSessionEmotion } from '@/service/frontend/frontend'

const createDefaultEmotion = () => ({
  primaryEmotion: '中性',
  emotionScore: 50,
  isNegative: false,
  riskLevel: 0,
  suggestion: '情绪状态平稳',
  improvementSuggestions: [],
  riskDescription: ''
})

export function useConsultationEmotion() {
  const currentEmotion = ref(createDefaultEmotion())

  const resetEmotion = () => {
    currentEmotion.value = createDefaultEmotion()
  }

  const loadSessionEmotion = async (sessionId, forceRefresh = false) => {
    if (!sessionId) {
      resetEmotion()
      return
    }

    const res = await getSessionEmotion(sessionId, forceRefresh)
    currentEmotion.value = {
      ...createDefaultEmotion(),
      ...res,
      improvementSuggestions: Array.isArray(res?.improvementSuggestions) ? res.improvementSuggestions : []
    }
  }

  const getIntensityClass = (score) => {
    if (score >= 61) return 3
    if (score >= 31) return 2
    return 1
  }

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
