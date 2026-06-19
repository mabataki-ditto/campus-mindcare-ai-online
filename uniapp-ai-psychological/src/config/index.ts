const BASE_URL = (() => {
  // #ifdef H5
  return '/api'
  // #endif
  // #ifndef H5
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  // #endif
})()

const TIME_OUT = 30000

export { BASE_URL, TIME_OUT }
