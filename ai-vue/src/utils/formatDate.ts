import dayjs from 'dayjs'

/**
 * 格式化日期时间为标准格式
 * @param dateStr 日期字符串或 Date 对象
 * @param format 格式化模板，默认 'YYYY-MM-DD HH:mm:ss'
 */
export function formatDate(dateStr: any, format = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!dateStr) return '-'
  return dayjs(dateStr).format(format)
}

/**
 * 格式化为简短日期（不含秒）
 */
export function formatDateShort(dateStr: any): string {
  return formatDate(dateStr, 'YYYY-MM-DD HH:mm')
}

/**
 * 格式化为相对时间（如"刚刚"、"5分钟前"）
 */
export function formatRelativeTime(dateStr: any): string {
  if (!dateStr) return '-'
  const now = dayjs()
  const target = dayjs(dateStr)
  const diffMinutes = now.diff(target, 'minute')
  const diffHours = now.diff(target, 'hour')
  const diffDays = now.diff(target, 'day')

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return target.format('YYYY-MM-DD HH:mm')
}