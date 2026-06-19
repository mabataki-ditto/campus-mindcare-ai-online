import http from '@/utils/request'

interface EmotionDiaryParams {
  moodScore: number
  moodLabel: string
  content: string
  dominantEmotion: string
  emotionTriggers?: string
  sleepQuality?: string
  stressLevel?: string
  diaryDate?: string
}

export function addEmotionDiary(data: EmotionDiaryParams) { return http.post('/emotion-diary', data) }
export function getEmotionDiaryList(params?: Record<string, any>) { return http.get('/emotion-diary/admin/page', { params }) }
