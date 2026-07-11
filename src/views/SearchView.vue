<template>
  <div class="search-page">
    <!-- 搜索栏带即时建议 -->
    <header class="topbar">
      <label class="search-box">
        <span class="search-icon">搜索</span>
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索歌手或歌曲..."
          @input="onInput"
          @keydown.enter="doSearch"
          @focus="showSuggestions = suggestions.length > 0"
          @blur="onBlur"
          ref="searchInputRef"
          autofocus
        >
        <button v-if="keyword" class="clear-btn" @click="clearSearch">✕</button>
      </label>
      <div class="suggestions-dropdown" v-if="showSuggestions && suggestions.length > 0">
        <button
          v-for="s in suggestions"
          :key="s.id"
          class="suggestion-item"
          @mousedown.prevent="selectSuggestion(s)"
        >
          <img v-if="s.image" :src="s.image" class="sug-img" @error="onSugImgError">
          <div class="sug-info">
            <span class="sug-title">{{ s.name }}</span>
            <span class="sug-sub" v-if="s.type === 'track'">{{ s.artist_name }} · 歌曲</span>
            <span class="sug-sub" v-else-if="s.type === 'album'">{{ s.artist_name }} · 专辑</span>
            <span class="sug-sub" v-else>歌手</span>
          </div>
        </button>
      </div>
    </header>

    <!-- 搜索历史 -->
    <section v-if="!searched && searchHistory.length > 0" class="section-block">
      <div class="section-heading">
        <h2>搜索历史</h2>
        <button class="ghost-btn" @click="clearHistory">清空</button>
      </div>
      <div class="history-tags">
        <button
          v-for="h in searchHistory"
          :key="h"
          class="history-tag"
          @click="quickSearch(h)"
        >{{ h }}</button>
      </div>
    </section>

    <!-- 热门推荐（未搜索时） -->
    <section v-if="!searched && !loading" class="section-block">
      <div class="section-heading">
        <h2>Jamendo 热门推荐</h2>
        <button class="ghost-btn" @click="loadFeatured">刷新</button>
      </div>
      <div class="track-list">
        <article
          v-for="track in featuredTracks"
          :key="'jf-' + track.id"
          class="track-row"
          @dblclick="playTrack(track)"
        >
          <img :src="track.cover_url" :alt="track.title" @error="onImgError">
          <div class="track-title">
            <strong>{{ track.title }}</strong>
            <span>{{ track.artist_name }}</span>
          </div>
          <time>{{ formatDuration(track.duration) }}</time>
          <button
            class="heart-btn"
            :class="{ favorited: favoritesStore.isFavorited(track.id) }"
            :title="favoritesStore.isFavorited(track.id) ? '取消收藏' : '添加收藏'"
            @click.stop="handleHeart(track)"
          >
            {{ favoritesStore.isFavorited(track.id) ? '❤️' : '🤍' }}
          </button>
          <button class="queue-add-btn" @click.stop="handleQueueAdd(track)" title="下一首播放">+</button>
          <button class="play-btn" @click.stop="playTrack(track)">播放</button>
        </article>
      </div>
    </section>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在搜索...</p>
    </div>

    <!-- 搜索结果：歌手 + 按专辑分组 -->
    <template v-if="searched && !loading">
      <!-- 歌手结果 -->
      <section v-if="artistResults.length > 0" class="section-block">
        <div class="section-heading">
          <h2>歌手</h2>
          <span>找到 {{ artistResults.length }} 位歌手</span>
        </div>
        <div class="artist-results">
          <button
            v-for="artist in artistResults"
            :key="artist.id"
            class="artist-card"
            @click="goToArtist(artist.id)"
          >
            <div class="artist-avatar">{{ artist.name.charAt(0) }}</div>
            <strong>{{ artist.name }}</strong>
          </button>
        </div>
      </section>

      <!-- 专辑分组结果 -->
      <section v-for="album in albumGroups" :key="'alb-' + album.id" class="section-block album-block">
        <div class="section-heading">
          <div class="album-info">
            <img v-if="album.cover_url" :src="album.cover_url" :alt="album.title" class="album-cover" @error="onImgError">
            <div>
              <h2>{{ album.title }}</h2>
              <span>{{ album.artist_name }} · {{ album.songs.length }} 首</span>
            </div>
          </div>
        </div>
        <div class="track-list">
          <article
            v-for="track in album.songs"
            :key="'as-' + track.id"
            class="track-row"
            @dblclick="playAlbumTrack(track, album)"
          >
            <span class="track-num">{{ track.id }}</span>
            <div class="track-title">
              <strong>{{ track.title }}</strong>
            </div>
            <time>{{ formatDuration(track.duration_seconds) }}</time>
            <button
              class="heart-btn"
              :class="{ favorited: favoritesStore.isFavorited(getJamendoId(track)) }"
              :title="favoritesStore.isFavorited(getJamendoId(track)) ? '取消收藏' : '添加收藏'"
              @click.stop="handleHeartAlbum(track, album)"
            >
              {{ favoritesStore.isFavorited(getJamendoId(track)) ? '❤️' : '🤍' }}
            </button>
            <button class="queue-add-btn" @click.stop="handleQueueAddAlbum(track, album)" title="下一首播放">+</button>
            <button class="play-btn" @click.stop="playAlbumTrack(track, album)">播放</button>
          </article>
        </div>
      </section>

      <!-- 歌曲扁平搜索结果 -->
      <section v-if="trackResults.length > 0 && artistResults.length === 0" class="section-block">
        <div class="section-heading">
          <h2>歌曲</h2>
          <span>共 {{ totalResults }} 首</span>
        </div>
        <div class="track-list">
          <article
            v-for="track in trackResults"
            :key="'jr-' + track.id"
            class="track-row"
            @dblclick="playTrack(track)"
          >
            <img :src="track.cover_url" :alt="track.title" @error="onImgError">
            <div class="track-title">
              <strong>{{ track.title }}</strong>
              <span>{{ track.artist_name }} · {{ track.album_name }}</span>
            </div>
            <time>{{ formatDuration(track.duration) }}</time>
            <button
              class="heart-btn"
              :class="{ favorited: favoritesStore.isFavorited(track.id) }"
              :title="favoritesStore.isFavorited(track.id) ? '取消收藏' : '添加收藏'"
              @click.stop="handleHeart(track)"
            >
              {{ favoritesStore.isFavorited(track.id) ? '❤️' : '🤍' }}
            </button>
            <button class="queue-add-btn" @click.stop="handleQueueAdd(track)" title="下一首播放">+</button>
            <button class="play-btn" @click.stop="playTrack(track)">播放</button>
          </article>
        </div>
        <div v-if="loadingMore" class="loading-more">
          <div class="spinner-sm"></div>
          <span>加载中...</span>
        </div>
        <div v-else-if="hasMore" class="load-more-wrap">
          <button class="load-more-btn" @click="loadMore">加载更多</button>
        </div>
      </section>

      <!-- 空结果 -->
      <section v-if="artistResults.length === 0 && albumGroups.length === 0 && trackResults.length === 0" class="section-block">
        <div class="empty-state">
          <div class="empty-icon">🎵</div>
          <p>未找到 "{{ lastKeyword }}" 的相关结果</p>
          <span>试试英文关键词如 "piano"、"rock"、"chill"</span>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from '../stores/player.js'
import { useFavoritesStore } from '../stores/favorites.js'
import { useAuthStore } from '../stores/auth.js'
import { usePlayQueueStore } from '../stores/playQueue.js'
import api from '../utils/request.js'

const router = useRouter()
const route = useRoute()
const player = usePlayerStore()
const favoritesStore = useFavoritesStore()
const authStore = useAuthStore()
const playQueue = usePlayQueueStore()

const keyword = ref('')
const searched = ref(false)
const lastKeyword = ref('')
const loading = ref(false)
const searchInputRef = ref(null)
const searchHistory = ref([])

// 歌手搜索结果
const artistResults = ref([])
// 按专辑分组的结果
const albumGroups = ref([])
// 扁平歌曲搜索（非歌手搜索时）
const trackResults = ref([])
const totalResults = ref(0)
const resultOffset = ref(0)
const limit = 20
const hasMore = ref(false)
const loadingMore = ref(false)

// 热门推荐
const featuredTracks = ref([])

// 搜索建议
const suggestions = ref([])
const showSuggestions = ref(false)
let debounceTimer = null

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function playTrack(track) {
  player.playTrack({
    id: 'jamendo-' + track.id,
    title: track.title,
    artist: track.artist_name,
    album: track.album_name || '',
    cover: track.cover_url,
    cover_url: track.cover_url,
    audio_url: track.audio_url,
    duration: formatDuration(track.duration || track.duration_seconds),
    duration_seconds: track.duration || track.duration_seconds,
  })
}

function playAlbumTrack(track, album) {
  player.playTrack({
    id: 'jamendo-' + track.external_api_id?.replace('jamendo_', '') || track.id,
    title: track.title,
    artist: album.artist_name,
    album: album.title,
    cover: track.cover_url || album.cover_url,
    cover_url: track.cover_url || album.cover_url,
    audio_url: track.audio_url,
    duration: formatDuration(track.duration_seconds),
    duration_seconds: track.duration_seconds,
  })
}

function onImgError(e) {
  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23222" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="%23666" font-size="24">♪</text></svg>'
}

function onSugImgError(e) {
  e.target.remove()
}

// 从 album track 中提取 Jamendo ID
function getJamendoId(track) {
  if (track.external_api_id && track.external_api_id.startsWith('jamendo_')) {
    return track.external_api_id.replace('jamendo_', '')
  }
  return String(track.id)
}

// 红心收藏（普通 Jamendo track）
async function handleHeart(track) {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  await favoritesStore.toggleFavorite(track)
}

// 红心收藏（album group track）
async function handleHeartAlbum(track, album) {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  const jamendoId = getJamendoId(track)
  await favoritesStore.toggleFavorite({
    id: jamendoId,
    title: track.title,
    artist_name: album.artist_name,
    album_name: album.title,
    cover_url: track.cover_url || album.cover_url,
    audio_url: track.audio_url,
    duration: track.duration_seconds,
  })
}

// 添加到播放队列（普通 track）
async function handleQueueAdd(track) {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  await playQueue.addToQueue(track)
}

// 添加到播放队列（album group track）
async function handleQueueAddAlbum(track, album) {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  const jamendoId = getJamendoId(track)
  await playQueue.addToQueue({
    id: jamendoId,
    title: track.title,
    artist_name: album.artist_name,
    album_name: album.title,
    cover_url: track.cover_url || album.cover_url,
    audio_url: track.audio_url,
    duration: track.duration_seconds,
  })
}

// ============= 搜索建议（防抖） =============
function onInput() {
  const kw = keyword.value.trim()
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!kw) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }
  debounceTimer = setTimeout(async () => {
    try {
      const data = await api.get(`/api/audio/jamendo/suggestions?q=${encodeURIComponent(kw)}&limit=8`)
      suggestions.value = (data || []).slice(0, 8)
      showSuggestions.value = suggestions.value.length > 0
    } catch {
      suggestions.value = []
    }
  }, 200)
}

function selectSuggestion(s) {
  keyword.value = ''
  showSuggestions.value = false
  suggestions.value = []
  doSearchWith(s.name)
}

function onBlur() {
  setTimeout(() => { showSuggestions.value = false }, 200)
}

// ============= 搜索 =============
async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return
  showSuggestions.value = false
  suggestions.value = []
  doSearchWith(kw)
}

async function doSearchWith(kw) {
  keyword.value = kw
  lastKeyword.value = kw
  addHistory(kw)
  searched.value = true
  loading.value = true

  // 重置
  artistResults.value = []
  albumGroups.value = []
  trackResults.value = []
  totalResults.value = 0
  hasMore.value = false
  resultOffset.value = 0

  // 先尝试歌手搜索（按专辑分组）
  try {
    const artistData = await api.get(`/api/jamendo-data/artist-search?q=${encodeURIComponent(kw)}`)
    artistResults.value = artistData.artists || []
    albumGroups.value = artistData.albums || []
  } catch {
    // 忽略
  }

  // 如果歌手搜索没有结果，回退到歌曲搜索
  if (artistResults.value.length === 0 && albumGroups.value.length === 0) {
    await fetchTrackResults(kw, 0)
  }

  // 检查搜索结果中的收藏状态
  const allIds = []
  artistResults.value.forEach(() => {})
  albumGroups.value.forEach(album => {
    album.songs.forEach(track => allIds.push(getJamendoId(track)))
  })
  trackResults.value.forEach(track => allIds.push(String(track.id)))
  featuredTracks.value.forEach(track => allIds.push(String(track.id)))

  if (allIds.length > 0) {
    favoritesStore.checkFavorites(allIds)
  }

  loading.value = false
}

async function fetchTrackResults(kw, offset) {
  try {
    const data = await api.get(`/api/audio/jamendo/search?q=${encodeURIComponent(kw)}&limit=${limit}&offset=${offset}`)
    const newResults = data.results || []
    if (offset === 0) {
      trackResults.value = newResults
    } else {
      trackResults.value.push(...newResults)
    }
    totalResults.value = data.total || 0
    hasMore.value = newResults.length >= limit
  } catch {
    if (offset === 0) trackResults.value = []
  }
}

async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  resultOffset.value += limit
  await fetchTrackResults(lastKeyword.value, resultOffset.value)
  loadingMore.value = false
}

function quickSearch(kw) {
  keyword.value = kw
  doSearch()
}

function clearSearch() {
  keyword.value = ''
  searched.value = false
  trackResults.value = []
  artistResults.value = []
  albumGroups.value = []
  suggestions.value = []
  showSuggestions.value = false
  nextTick(() => searchInputRef.value?.focus())
}

function goToArtist(artistId) {
  // 用歌手 ID 搜索，显示专辑
  doSearchWithById(artistId)
}

async function doSearchWithById(artistId) {
  searched.value = true
  loading.value = true
  artistResults.value = []
  albumGroups.value = []
  trackResults.value = []

  try {
    const data = await api.get(`/api/jamendo-data/artist/${artistId}/albums`)
    albumGroups.value = data.albums || []
    // 找到歌手名
    if (albumGroups.value.length > 0) {
      const name = albumGroups.value[0].artist_name || ''
      if (name) {
        lastKeyword.value = name
        keyword.value = name
        addHistory(name)
      }
    }
  } catch {
    // 忽略
  }
  loading.value = false
}

// ============= 搜索历史 =============
function addHistory(kw) {
  const history = searchHistory.value.filter(h => h !== kw)
  history.unshift(kw)
  searchHistory.value = history.slice(0, 10)
  localStorage.setItem('search_history', JSON.stringify(searchHistory.value))
}

function clearHistory() {
  searchHistory.value = []
  localStorage.removeItem('search_history')
}

// ============= 热门推荐 =============
async function loadFeatured() {
  try {
    const data = await api.get('/api/audio/jamendo/featured?limit=10')
    featuredTracks.value = data || []
  } catch {
    featuredTracks.value = []
  }
}

// ============= 路由参数监听 =============
watch(() => route.query.q, (newQ) => {
  if (newQ) {
    doSearchWith(newQ)
  }
})

// ============= 初始化 =============
onMounted(async () => {
  try {
    searchHistory.value = JSON.parse(localStorage.getItem('search_history') || '[]')
  } catch { searchHistory.value = [] }

  loadFeatured()

  if (route.query.q) {
    doSearchWith(route.query.q)
  }

  nextTick(() => {
    searchInputRef.value?.focus()
  })
})
</script>

<style scoped>
.search-page { padding: 0; }

.topbar {
  position: relative;
  margin-bottom: 20px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: var(--panel);
  backdrop-filter: blur(22px);
}

.search-icon { color: var(--muted); flex-shrink: 0; }

.search-box input {
  flex: 1;
  border: 0;
  outline: 0;
  color: var(--ink);
  background: transparent;
  font-size: 16px;
}

.clear-btn {
  border: 0;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: var(--muted);
  background: rgba(255,255,255,0.1);
  flex-shrink: 0;
  cursor: pointer;
}

/* 搜索建议下拉 */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  padding: 6px;
  border: 1px solid var(--rule);
  border-radius: 16px;
  background: var(--panel);
  backdrop-filter: blur(30px);
  z-index: 100;
  display: grid;
  gap: 2px;
}
.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}
.suggestion-item:hover { background: rgba(255,255,255,0.08); }
.sug-img { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.sug-info { display: flex; flex-direction: column; gap: 2px; }
.sug-title { font-weight: 600; }
.sug-sub { color: var(--muted); font-size: 12px; }

.section-block {
  margin-bottom: 28px;
  padding: 26px;
  border: 1px solid var(--rule);
  border-radius: 26px;
  background: var(--panel);
  backdrop-filter: blur(24px);
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 18px;
}

.section-heading h2 { margin: 0; font-size: 26px; }
.section-heading span { color: var(--muted); }

.ghost-btn {
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
}
.ghost-btn:hover { color: var(--ink); }

/* 搜索历史 */
.history-tags { display: flex; flex-wrap: wrap; gap: 10px; }

.history-tag {
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 8px 16px;
  color: var(--muted);
  background: transparent;
  font-size: 14px;
  cursor: pointer;
}
.history-tag:hover { color: var(--ink); border-color: rgba(255,255,255,0.32); }

/* 歌手结果 */
.artist-results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

.artist-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--rule);
  border-radius: 18px;
  background: transparent;
  color: var(--ink);
  text-align: center;
  cursor: pointer;
}
.artist-card:hover { background: rgba(255,255,255,0.06); }

.artist-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  font-size: 24px;
  font-weight: 900;
}

/* 专辑分组 */
.album-block {
  border-left: 3px solid var(--accent);
}

.album-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.album-cover {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.album-info h2 { font-size: 22px; }
.album-info span { color: var(--muted); font-size: 13px; }

/* 歌曲列表 */
.track-list { display: grid; gap: 10px; }

.track-row {
  display: grid;
  grid-template-columns: 42px 1fr auto auto auto auto;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: rgba(255,255,255,0.045);
  cursor: pointer;
}
.track-row:hover { border-color: rgba(232,64,87,0.48); background: rgba(232,64,87,0.12); }
.track-row img { width: 42px; height: 42px; border-radius: 10px; object-fit: cover; }
.track-title strong, .track-title span { display: block; }
.track-title span, .track-row time { color: var(--muted); font-size: 13px; }

.heart-btn {
  border: 0;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  transition: transform 0.15s;
}
.heart-btn:hover { transform: scale(1.25); }
.heart-btn.favorited { color: #e84057; }

.queue-add-btn {
  border: 0;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  color: var(--muted);
  font-size: 18px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.queue-add-btn:hover { background: var(--accent); color: #fff; }

.track-num {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 13px;
}

.play-btn {
  border: 0;
  border-radius: 999px;
  padding: 8px 13px;
  color: var(--ink);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
}
.play-btn:hover { background: rgba(255,255,255,0.16); }

/* 加载更多 */
.load-more-wrap { text-align: center; margin-top: 20px; }
.load-more-btn {
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 10px 32px;
  color: var(--muted);
  background: transparent;
  font-size: 14px;
  cursor: pointer;
}
.load-more-btn:hover { color: var(--ink); border-color: rgba(255,255,255,0.32); }

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  color: var(--muted);
}
.spinner-sm {
  width: 18px;
  height: 18px;
  border: 2px solid var(--rule);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 加载 & 空状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--rule);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.loading-state p { color: var(--muted); margin: 0; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state p { color: var(--ink); font-size: 16px; margin: 0 0 8px; }
.empty-state span { color: var(--muted); font-size: 14px; }

@media (max-width: 640px) {
  .section-block { padding: 18px; border-radius: 22px; }
  .track-row { grid-template-columns: 42px 1fr auto auto auto; }
  .track-row time { display: none; }
  .artist-results { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }
  .album-info { flex-direction: column; align-items: flex-start; }
}
</style>