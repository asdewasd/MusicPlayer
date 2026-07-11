import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/request.js'
import { useAuthStore } from './auth.js'

// 页面关闭时清空队列
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const auth = useAuthStore()
    if (auth.isLoggedIn && auth.token) {
      fetch('/api/playlist', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${auth.token}` },
        keepalive: true,
      }).catch(() => {})
    }
  })
}

export const usePlayQueueStore = defineStore('playQueue', () => {
  const queue = ref([])
  const loading = ref(false)

  const hasQueue = computed(() => queue.value.length > 0)
  const queueCount = computed(() => queue.value.length)

  /**
   * 从服务器同步播放队列
   */
  async function fetchQueue() {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) return

    loading.value = true
    try {
      const data = await api.get('/api/playlist')
      queue.value = Array.isArray(data) ? data : []
    } catch {
      queue.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加歌曲到队列末尾
   */
  async function addToQueue(track) {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) {
      return { success: false, needLogin: true }
    }

    try {
      const res = await api.post('/api/playlist', {
        song_id: String(track.id),
        title: track.title,
        artist_name: track.artist_name || track.artist || '',
        album_name: track.album_name || track.album || '',
        cover_url: track.cover_url || track.cover || '',
        audio_url: track.audio_url || '',
        duration: track.duration_seconds || track.duration || 0,
      })

      // 添加到本地队列
      queue.value.push({
        queueId: res.queueId,
        id: String(track.id),
        title: track.title,
        artist_name: track.artist_name || track.artist || '',
        album_name: track.album_name || track.album || '',
        cover_url: track.cover_url || track.cover || '',
        audio_url: track.audio_url || '',
        duration_seconds: track.duration_seconds || track.duration || 0,
        sort_order: res.sort_order,
      })

      return { success: true }
    } catch {
      return { success: false }
    }
  }

  /**
   * 从队列中移除歌曲
   */
  async function removeFromQueue(queueId) {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) return

    try {
      await api.delete(`/api/playlist/${queueId}`)
      queue.value = queue.value.filter(q => q.queueId !== queueId)
    } catch {
      // 忽略
    }
  }

  /**
   * 清空播放队列
   */
  async function clearQueue() {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) {
      queue.value = []
      return
    }

    try {
      await api.delete('/api/playlist')
    } catch {
      // 忽略
    }
    queue.value = []
  }

  /**
   * 获取下一首要播放的歌曲（从队列头取出）
   */
  function getNextFromQueue() {
    if (queue.value.length === 0) return null
    const next = queue.value.shift()
    // 异步从服务器删除
    if (next.queueId) {
      removeFromQueueSilent(next.queueId)
    }
    return next
  }

  /**
   * 静默从服务器删除（不更新本地状态，因为本地已经 shift 了）
   */
  async function removeFromQueueSilent(queueId) {
    try {
      await api.delete(`/api/playlist/${queueId}`)
    } catch {
      // 忽略
    }
  }

  /**
   * 登录后恢复队列
   */
  async function syncOnLogin() {
    await fetchQueue()
  }

  return {
    queue,
    loading,
    hasQueue,
    queueCount,
    fetchQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    getNextFromQueue,
    syncOnLogin,
  }
})