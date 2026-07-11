import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/request.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const initialized = ref(false)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const userName = computed(() => user.value?.nickname || user.value?.username || '')
  const userInitial = computed(() => userName.value.charAt(0) || 'M')

  /**
   * 从 localStorage 恢复登录状态
   */
  function init() {
    try {
      const savedToken = localStorage.getItem('auth_token')
      const savedUser = localStorage.getItem('user')
      if (savedToken && savedUser) {
        token.value = savedToken
        user.value = JSON.parse(savedUser)
      }
    } catch {
      clearAuth()
    }
    initialized.value = true
  }

  /**
   * 尝试从后端获取最新用户信息（验证 token 有效性）
   */
  async function fetchUser() {
    if (!token.value) return
    try {
      const data = await api.get('/api/auth/me')
      user.value = data
      localStorage.setItem('user', JSON.stringify(data))
    } catch {
      // token 无效，清除
      clearAuth()
    }
  }

  /**
   * 登录
   */
  async function login(username, password) {
    const data = await api.post('/api/auth/login', { username, password }, { skipAuth: true })
    setAuth(data.token, data.user)
    // 同步播放队列
    try {
      const { usePlayQueueStore } = await import('./playQueue.js')
      const playQueue = usePlayQueueStore()
      await playQueue.syncOnLogin()
    } catch { /* 忽略 */ }
    return data
  }

  /**
   * 注册
   */
  async function register(username, email, password) {
    const data = await api.post('/api/auth/register', { username, email, password }, { skipAuth: true })
    setAuth(data.token, data.user)
    return data
  }

  /**
   * 设置认证信息
   */
  function setAuth(newToken, newUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  /**
   * 退出登录
   */
  async function logout() {
    // 先清空播放队列
    try {
      const { usePlayQueueStore } = await import('./playQueue.js')
      const playQueue = usePlayQueueStore()
      await playQueue.clearQueue()
    } catch { /* 忽略 */ }
    clearAuth()
    window.location.href = '/login'
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
  }

  return {
    user,
    token,
    initialized,
    isLoggedIn,
    userName,
    userInitial,
    init,
    fetchUser,
    login,
    register,
    logout,
    setAuth,
  }
})