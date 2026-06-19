import { ref } from 'vue'
import { getSessionEmotion } from '@/api/consultation'

const createDefaultEmotion = () => ({ primaryEmotion: '中性', emotionScore: 50, isNegative: false, riskLevel: 0, suggestion: '情绪状态平稳', improvementSuggestions: [] as string[], riskDescription: '' })

export function useConsultationEmotion() {
  const currentEmotion = ref(createDefaultEmotion())
  const resetEmotion = () => { currentEmotion.value = createDefaultEmotion() }
  const loadSessionEmotion = async (sessionId?: string | number, forceRefresh = false) => {
    if (!sessionId) { resetEmotion(); return }
    const id = String(sessionId).replace(/^session_/, '')
    try {
      const res: any = await getSessionEmotion(id, forceRefresh)
      currentEmotion.value = { ...createDefaultEmotion(), ...res, improvementSuggestions: Array.isArray(res?.improvementSuggestions) ? res.improvementSuggestions : [] }
    } catch (e) { console.error('情绪分析失败:', e) }
  }
  const getIntensityClass = (score: number) => score >= 61 ? 3 : score >= 31 ? 2 : 1
  const getRiskText = (level: number) => ({ 0: '正常', 1: '关注', 2: '预警', 3: '危机' }[level] ?? '正常')
  return { currentEmotion, resetEmotion, loadSessionEmotion, getIntensityClass, getRiskText }
}
