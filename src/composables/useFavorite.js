import { ref } from 'vue'
import api from '../utils/request.js'

/**
 * 收藏切换 composable
 * @param {string} type - 收藏类型 'song' | 'playlist' | 'artist'
 */
export function useFavorite(type = 'song') {
  const favorites = ref(new Set())
  const loading = ref(false)

  // 批量加载收藏状态
  async function fetchFavorites(ids = []) {
    if (ids.length === 0) return
    loading.value = true
    try {
      const data = await api.get(`/api/favorites/${type}?ids=${ids.join(',')}`)
      const favIds = data.favorites || data
      const set = new Set(favIds.map(String))
      favorites.value = set
    } catch {
      // 本地兜底：从 localStorage 读取
      try {
        const stored = JSON.parse(localStorage.getItem(`fav_${type}`) || '[]')
        favorites.value = new Set(stored.map(String))
      } catch {
        // ignore
      }
    } finally {
      loading.value = false
    }
  }

  function isFavorited(id) {
    return favorites.value.has(String(id))
  }

  async function toggle(id) {
    const key = String(id)
    const wasFav = favorites.value.has(key)

    // 乐观更新
    if (wasFav) {
      favorites.value.delete(key)
    } else {
      favorites.value.add(key)
    }
    persist()

    loading.value = true
    try {
      if (wasFav) {
        await api.delete(`/api/favorites/${type}/${id}`)
      } else {
        await api.post(`/api/favorites/${type}/${id}`)
      }
    } catch {
      // 回滚
      if (wasFav) {
        favorites.value.add(key)
      } else {
        favorites.value.delete(key)
      }
      persist()
      throw new Error('收藏操作失败')
    } finally {
      loading.value = false
    }
  }

  function persist() {
    try {
      localStorage.setItem(`fav_${type}`, JSON.stringify([...favorites.value]))
    } catch {
      // ignore
    }
  }

  return { favorites, loading, fetchFavorites, isFavorited, toggle }
}