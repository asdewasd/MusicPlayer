import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sortAlbumsByReleaseDate } from '../utils/musicflow-core.js'

const API_BASE = ''

export const useMusicStore = defineStore('music', () => {
  const artistsMap = ref({})
  const loading = ref(false)
  const error = ref(null)

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function fetchJson(path) {
    const res = await fetch(`${API_BASE}${path}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  async function fetchArtistsAndSongs() {
    loading.value = true
    error.value = null
    try {
      const [artists, songs] = await Promise.all([
        fetchJson('/api/artists'),
        fetchJson('/api/songs'),
      ])

      const map = {}
      artists.forEach(a => { map[a.id] = a })
      artistsMap.value = map

      const tracks = songs.map(raw => {
        const artist = map[raw.artist_id] || { name: '未知歌手' }
        return {
          id: String(raw.id),
          title: raw.title,
          artist: artist.name,
          artist_id: raw.artist_id,
          album_id: raw.album_id,
          cover: raw.cover_url || '',
          cover_url: raw.cover_url || '',
          audio_url: raw.audio_url || '',
          duration: formatDuration(raw.duration_seconds),
          duration_seconds: raw.duration_seconds,
        }
      })

      return tracks
    } catch (err) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchArtistAlbums(artistId) {
    const rawAlbums = await fetchJson(`/api/artists/${artistId}/albums`)
    return sortAlbumsByReleaseDate(
      rawAlbums.map(raw => ({
        id: String(raw.id),
        title: raw.title,
        year: new Date(raw.release_date).getFullYear(),
        releaseDate: raw.release_date,
        cover: raw.cover_url || '',
      }))
    )
  }

  async function fetchAlbumSongs(albumId) {
    const songs = await fetchJson(`/api/albums/${albumId}/songs`)
    return songs.map((s, i) => ({
      num: String(i + 1).padStart(2, '0'),
      title: s.title,
      duration: formatDuration(s.duration_seconds),
      duration_seconds: s.duration_seconds,
      audio_url: s.audio_url || '',
      cover_url: s.cover_url || '',
      id: s.id,
    }))
  }

  function getArtistName(artistId) {
    return artistsMap.value[artistId]?.name || '未知歌手'
  }

  return {
    artistsMap,
    loading,
    error,
    fetchArtistsAndSongs,
    fetchArtistAlbums,
    fetchAlbumSongs,
    getArtistName,
  }
})