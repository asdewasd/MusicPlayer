<template>
  <div>
    <!-- 搜索栏带即时建议 -->
    <header class="topbar">
      <label class="search-box">
        <span>搜索</span>
        <input
          v-model="searchText"
          type="search"
          placeholder="搜索 Jamendo 免费音乐..."
          @input="onInput"
          @keydown.enter="handleSearch"
          @focus="showSuggestions = suggestions.length > 0"
          @blur="onBlur"
        >
        <button v-if="searchText" class="clear-btn" @click="clearSearch">✕</button>
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

    <HeroCard />

    <!-- 热门推荐（来自 Jamendo） -->
    <section class="section-block">
      <div class="section-heading">
        <div>
          <p class="eyebrow">歌曲列表</p>
          <h2>热门推荐</h2>
        </div>
        <span>来自 Jamendo CC 授权音乐 · 双击播放</span>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else class="track-list">
        <article
          v-for="track in tracks"
          :key="track.id"
          class="track-row"
          :class="{ active: 'j-' + track.id === currentTrack?.id }"
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
          <button @click.stop="playTrack(track)">播放</button>
        </article>
      </div>

      <div v-if="!loading" class="load-more-wrap">
        <button v-if="hasMore" class="load-more-btn" @click="loadMore" :disabled="loadingMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </section>

    <section class="section-block community-grid">
      <article>
        <p class="eyebrow">社区评论</p>
        <h2>热门乐评</h2>
        <blockquote>"听到前奏的那一秒，整个夏天都回来了。"</blockquote>
        <span>来自《晴天》的热门评论</span>
      </article>
      <article>
        <p class="eyebrow">私人 FM</p>
        <h2>连续发现</h2>
        <p>根据播放历史和收藏行为生成下一首推荐，雏形中以本地示例数据模拟。</p>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/player.js'
import { useFavoritesStore } from '../stores/favorites.js'
import { useAuthStore } from '../stores/auth.js'
import { usePlayQueueStore } from '../stores/playQueue.js'
import HeroCard from '../components/HeroCard.vue'
import api from '../utils/request.js'

const router = useRouter()
const player = usePlayerStore()
const favoritesStore = useFavoritesStore()
const authStore = useAuthStore()
const playQueue = usePlayQueueStore()

const searchText = ref('')
const tracks = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const currentTrack = computed(() => player.currentTrack)
const page = ref(0)
const limit = 20
const hasMore = ref(true)
const total = ref(0)

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
    id: 'j-' + track.id,
    title: track.title,
    artist: track.artist_name,
    album: track.album_name || '',
    cover: track.cover_url,
    cover_url: track.cover_url,
    audio_url: track.audio_url,
    duration: formatDuration(track.duration),
    duration_seconds: track.duration,
  })
}

async function fetchFeatured(offset = 0) {
  try {
    const data = await api.get(`/api/audio/jamendo/featured?limit=${limit}&offset=${offset}`)
    if (Array.isArray(data)) return data
    return data.results || data || []
  } catch {
    return []
  }
}

async function loadInitial() {
  loading.value = true
  const data = await fetchFeatured(0)
  tracks.value = data
  hasMore.value = data.length >= limit
  loading.value = false
  player.setTrackList(data.map(t => ({
    id: 'j-' + t.id,
    title: t.title,
    artist: t.artist_name,
    album: t.album_name || '',
    cover: t.cover_url,
    cover_url: t.cover_url,
    audio_url: t.audio_url,
    duration: formatDuration(t.duration),
    duration_seconds: t.duration,
  })))

  // 检查收藏状态
  if (data.length > 0) {
    favoritesStore.checkFavorites(data.map(t => String(t.id)))
  }
}

async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  page.value++
  const data = await fetchFeatured(page.value * limit)
  tracks.value.push(...data)
  hasMore.value = data.length >= limit
  loadingMore.value = false

  // 检查新加载的收藏状态
  if (data.length > 0) {
    favoritesStore.checkFavorites(data.map(t => String(t.id)))
  }
}

// 红心收藏
async function handleHeart(track) {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  await favoritesStore.toggleFavorite(track)
}

// 添加到播放队列
async function handleQueueAdd(track) {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  await playQueue.addToQueue(track)
}

// 搜索建议（防抖）
function onInput() {
  const kw = searchText.value.trim()
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!kw) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }
  debounceTimer = setTimeout(async () => {
    try {
      const data = await api.get(`/api/audio/jamendo/suggestions?q=${encodeURIComponent(kw)}&limit=5`)
      suggestions.value = (data || []).slice(0, 5)
      showSuggestions.value = suggestions.value.length > 0
    } catch {
      suggestions.value = []
    }
  }, 250)
}

function selectSuggestion(s) {
  searchText.value = ''
  showSuggestions.value = false
  router.push({ name: 'search', query: { q: s.name } })
}

function handleSearch() {
  const kw = searchText.value.trim()
  if (!kw) return
  showSuggestions.value = false
  router.push({ name: 'search', query: { q: kw } })
}

function clearSearch() {
  searchText.value = ''
  suggestions.value = []
  showSuggestions.value = false
}

function onBlur() {
  setTimeout(() => { showSuggestions.value = false }, 200)
}

function onImgError(e) {
  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23222" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="%23666" font-size="24">♪</text></svg>'
}

function onSugImgError(e) {
  e.target.remove()
}

onMounted(() => {
  loadInitial()
})
</script>

<style scoped>
.topbar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: var(--panel);
  backdrop-filter: blur(22px);
}
.search-box span { color: var(--muted); }
.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  color: var(--ink);
  background: transparent;
  font-size: 15px;
}
.clear-btn {
  border: 0;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  color: var(--muted);
  background: rgba(255,255,255,0.1);
  flex-shrink: 0;
  cursor: pointer;
}

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
  margin-top: 28px;
  padding: 26px;
  border: 1px solid var(--rule);
  border-radius: 26px;
  background: var(--panel);
  backdrop-filter: blur(24px);
}
.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: end;
  margin-bottom: 18px;
}
.section-heading h2 { margin: 0; font-size: 26px; }
.section-heading span, .eyebrow { color: var(--muted); }
.eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--accent-2);
}

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
.track-row:hover, .track-row.active {
  border-color: rgba(232,64,87,0.48);
  background: rgba(232,64,87,0.12);
}
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

.track-row button {
  border: 0;
  border-radius: 999px;
  padding: 8px 13px;
  color: var(--ink);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
}
.track-row button:hover { background: rgba(255,255,255,0.16); }

.loading-state {
  text-align: center;
  padding: 40px 20px;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--rule);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-state p { color: var(--muted); }

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
.load-more-btn:disabled { opacity: 0.5; }

.eyebrow { margin: 0 0 4px; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; color: var(--accent-2); }
.community-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  background: transparent;
  padding: 0;
  border: 0;
}
.community-grid article {
  padding: 26px;
  border: 1px solid var(--rule);
  border-radius: 26px;
  background: var(--panel);
  backdrop-filter: blur(24px);
}
.community-grid h2 { margin: 0; font-size: 26px; }
.community-grid p, .community-grid span { color: var(--muted); }
blockquote { margin: 18px 0; color: var(--ink); font-size: 20px; line-height: 1.5; }

@media (max-width: 640px) {
  .community-grid { grid-template-columns: 1fr; }
  .section-block, .community-grid article { padding: 20px; border-radius: 22px; }
  .track-row { grid-template-columns: 42px 1fr auto; }
  .track-row time { display: none; }
  .section-heading { align-items: stretch; flex-direction: column; }
}
</style>