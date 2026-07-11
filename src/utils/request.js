/**
 * 统一网络请求封装
 * 对接后端 API，统一处理加载态、错误弹窗、超时、JWT 自动携带
 */
import { ref } from 'vue'

const API_BASE = ''

// 全局状态
const isLoading = ref(false)
const errorMessage = ref('')
const errorVisible = ref(false)

let errorTimer = null

function showError(msg) {
  errorMessage.value = msg
  errorVisible.value = true
  if (errorTimer) clearTimeout(errorTimer)
  errorTimer = setTimeout(() => {
    errorVisible.value = false
  }, 4000)
}

function hideError() {
  errorVisible.value = false
  if (errorTimer) clearTimeout(errorTimer)
}

/**
 * 获取存储的 token
 */
function getToken() {
  try {
    return localStorage.getItem('auth_token') || null
  } catch {
    return null
  }
}

/**
 * 清除登录状态（token 过期时调用）
 */
function clearAuth() {
  try {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  } catch { /* ignore */ }
}

async function request(url, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    showLoading = false,
    timeout = 15000,
    skipAuth = false,
  } = options

  if (showLoading) isLoading.value = true

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  // 自动携带 token
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }
  if (!skipAuth) {
    const token = getToken()
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const fetchOptions = {
    method,
    signal: controller.signal,
    headers: finalHeaders,
  }

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body)
  }

  try {
    const res = await fetch(`${API_BASE}${url}`, fetchOptions)
    clearTimeout(timer)

    // 401 — token 过期或无效，清除登录状态并跳转
    if (res.status === 401) {
      clearAuth()
      window.location.href = '/login'
      throw new Error('请先登录')
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || errData.message || `请求失败 (${res.status})`)
    }

    const data = await res.json()
    return data
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      showError('请求超时，请稍后重试')
    } else {
      showError(err.message || '网络错误，请检查连接')
    }
    throw err
  } finally {
    if (showLoading) isLoading.value = false
  }
}

// 便捷方法
const api = {
  get(url, options = {}) {
    return request(url, { ...options, method: 'GET' })
  },
  post(url, body, options = {}) {
    return request(url, { ...options, method: 'POST', body })
  },
  put(url, body, options = {}) {
    return request(url, { ...options, method: 'PUT', body })
  },
  delete(url, options = {}) {
    return request(url, { ...options, method: 'DELETE' })
  },
}

export function useRequest() {
  return { isLoading, errorMessage, errorVisible, showError, hideError, api }
}

export default api