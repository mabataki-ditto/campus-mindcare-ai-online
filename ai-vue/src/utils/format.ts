import dayjs from 'dayjs'

export function formatUTC(utcString: string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!utcString) return ''
  return dayjs(utcString).format(format)
}