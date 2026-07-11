import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/request.js'
import { useAuthStore } from './auth.js'

export const useFavoritesStore = defineStore('favorites', () => {
  // 当前用户的收藏状态: Map<songId, true>
  const favorited = ref(new Map())
  const loading = ref(false)

  const isLoggedIn = computed(() => {
    const auth = useAuthStore()
    return auth.isLoggedIn
  })

  /**
   * 检查指定歌曲是否已收藏
   */
  function isFavorited(songId) {
    return favorited.value.has(String(songId))
  }

  /**
   * 切换收藏状态
   * @param {Object} track - 歌曲信息 { id, title, artist_name, album_name, cover_url, audio_url, duration }
   */
  async function toggleFavorite(track) {
    if (!isLoggedIn.value) {
      return { success: false, needLogin: true }
    }

    const songId = String(track.id)
    const isFav = isFavorited(songId)

    try {
      if (isFav) {
        await api.delete(`/api/favorites/${songId}`)
        favorited.value.delete(songId)
        // 触发响应式更新
        favorited.value = new Map(favorited.value)
        return { success: true, added: false }
      } else {
        await api.post('/api/favorites', {
          song_id: songId,
          title: track.title,
          artist_name: track.artist_name || track.artist || '',
          album_name: track.album_name || track.album || '',
          cover_url: track.cover_url || track.cover || '',
          audio_url: track.audio_url || '',
          duration: track.duration_seconds || track.duration || 0,
        })
        favorited.value.set(songId, true)
        favorited.value = new Map(favorited.value)
        return { success: true, added: true }
      }
    } catch {
      return { success: false }
    }
  }

  /**
   * 批量检查收藏状态
   */
  async function checkFavorites(songIds) {
    if (!isLoggedIn.value || songIds.length === 0) return

    try {
      const ids = songIds.map(String).join(',')
      const data = await api.get(`/api/favorites/check?ids=${ids}`)
      if (data) {
        Object.entries(data).forEach(([id, fav]) => {
          if (fav) {
            favorited.value.set(id, true)
          }
        })
        favorited.value = new Map(favorited.value)
      }
    } catch {
      // 忽略
    }
  }

  /**
   * 获取收藏列表
   */
  async function fetchFavorites() {
    if (!isLoggedIn.value) return []

    loading.value = true
    try {
      const data = await api.get('/api/favorites')
      // 同步到本地状态
      if (Array.isArray(data)) {
        data.forEach(track => {
          favorited.value.set(String(track.id), true)
        })
        favorited.value = new Map(favorited.value)
      }
      return data || []
    } catch {
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 登录后同步收藏状态
   */
  async function syncOnLogin() {
    if (isLoggedIn.value) {
      const favs = await fetchFavorites()
      return favs
    }
    return []
  }

  /**
   * 退出登录时清除
   */
  function clear() {
    favorited.value = new Map()
  }

  return {
    favorited,
    loading,
    isFavorited,
    toggleFavorite,
    checkFavorites,
    fetchFavorites,
    syncOnLogin,
    clear,
  }
})