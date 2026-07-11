import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getNextTrack, getPreviousTrack } from '../utils/musicflow-core.js'
import { usePlayQueueStore } from './playQueue.js'

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref(null)
  const isPlaying = ref(false)
  const trackList = ref([]) // 总播放列表（搜索结果/推荐）

  const hasTrack = computed(() => currentTrack.value !== null)

  function setTrackList(tracks) {
    trackList.value = tracks
    if (!currentTrack.value && tracks.length > 0) {
      currentTrack.value = tracks[0]
    }
  }

  function playTrack(track) {
    currentTrack.value = {
      id: track.id,
      title: track.title,
      artist: track.artist_name || track.artist,
      album: track.album_name || track.album,
      cover: track.cover_url || track.cover,
      cover_url: track.cover_url || track.cover,
      audio_url: track.audio_url,
      duration: track.duration,
      duration_seconds: track.duration_seconds || track.duration,
    }
    isPlaying.value = true
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  function playNext() {
    const playQueue = usePlayQueueStore()
    // 如果播放队列不为空，优先从队列取下一首
    if (playQueue.hasQueue) {
      const next = playQueue.getNextFromQueue()
      if (next) {
        playTrack(next)
        return
      }
    }
    // 播放队列为空，走原来的逻辑在总列表中找
    if (!currentTrack.value || trackList.value.length === 0) return
    currentTrack.value = getNextTrack(trackList.value, currentTrack.value.id)
    isPlaying.value = true
  }

  function playPrevious() {
    if (!currentTrack.value || trackList.value.length === 0) return
    currentTrack.value = getPreviousTrack(trackList.value, currentTrack.value.id)
    isPlaying.value = true
  }

  return {
    currentTrack,
    isPlaying,
    trackList,
    hasTrack,
    setTrackList,
    playTrack,
    togglePlay,
    playNext,
    playPrevious,
  }
})