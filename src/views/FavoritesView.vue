<template>
  <div class="favorites-page">
    <div class="page-header">
      <h1>❤️ 我喜欢的音乐</h1>
      <span v-if="tracks.length > 0">{{ tracks.length }} 首歌曲</span>
    </div>

    <div v-if="authStore.isLoggedIn" class="track-list">
      <article
        v-for="track in tracks"
        :key="'fav-' + track.id"
        class="track-row"
        @dblclick="playTrack(track)"
      >
        <img :src="track.cover_url" :alt="track.title" @error="onImgError">
        <div class="track-title">
          <strong>{{ track.title }}</strong>
          <span>{{ track.artist_name }}</span>
        </div>
        <time>{{ formatDuration(track.duration_seconds || track.duration) }}</time>
        <button
          class="heart-btn favorited"
          title="取消收藏"
          @click.stop="removeFavorite(track)"
        >❤️</button>
        <button class="play-btn" @click.stop="playTrack(track)">播放</button>
      </article>
    </div>

    <div v-else class="login-banner">
      <div class="login-card">
        <div class="login-icon">❤️</div>
        <h2>登录后查看你喜欢的音乐</h2>
        <p>收藏你喜欢的歌曲，随时随地收听</p>
        <button class="login-btn" @click="$router.push('/login')">立即登录</button>
      </div>
    </div>

    <div v-if="authStore.isLoggedIn && tracks.length === 0 && !loading" class="empty-state">
      <div class="empty-icon">💔</div>
      <p>还没有收藏歌曲</p>
      <span>去发现音乐，点击红心收藏你喜欢的歌曲吧</span>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { useFavoritesStore } from '../stores/favorites.js'
import { usePlayerStore } from '../stores/player.js'

const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
const player = usePlayerStore()

const tracks = ref([])
const loading = ref(false)

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function playTrack(track) {
  player.playTrack({
    id: 'fav-' + track.id,
    title: track.title,
    artist: track.artist_name,
    album: track.album_name || '',
    cover: track.cover_url,
    cover_url: track.cover_url,
    audio_url: track.audio_url,
    duration: formatDuration(track.duration_seconds || track.duration),
    duration_seconds: track.duration_seconds || track.duration,
  })
}

async function removeFavorite(track) {
  const result = await favoritesStore.toggleFavorite(track)
  if (result.success) {
    tracks.value = tracks.value.filter(t => String(t.id) !== String(track.id))
  }
}

function onImgError(e) {
  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23222" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="%23666" font-size="24">♪</text></svg>'
}

async function loadFavorites() {
  if (!authStore.isLoggedIn) return
  loading.value = true
  const data = await favoritesStore.fetchFavorites()
  tracks.value = data || []
  loading.value = false
}

onMounted(() => {
  loadFavorites()
})
</script>

<style scoped>
.favorites-page { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.page-header span {
  color: var(--muted);
  font-size: 14px;
}

.track-list { display: grid; gap: 10px; }

.track-row {
  display: grid;
  grid-template-columns: 42px 1fr auto auto auto;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: rgba(255,255,255,0.045);
  cursor: pointer;
}

.track-row:hover {
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

.heart-btn:hover { transform: scale(1.2); }
.heart-btn.favorited { color: #e84057; }

.play-btn {
  border: 0;
  border-radius: 999px;
  padding: 8px 13px;
  color: var(--ink);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
}

.play-btn:hover { background: rgba(255,255,255,0.16); }

.login-banner {
  padding: 60px 20px;
  text-align: center;
}

.login-card {
  max-width: 360px;
  margin: 0 auto;
  padding: 40px;
  border: 1px solid var(--rule);
  border-radius: 26px;
  background: var(--panel);
  backdrop-filter: blur(24px);
}

.login-icon { font-size: 48px; margin-bottom: 16px; }
.login-card h2 { margin: 0 0 8px; font-size: 20px; }
.login-card p { color: var(--muted); margin: 0 0 24px; }

.login-btn {
  border: 0;
  border-radius: 999px;
  padding: 12px 32px;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), #ff8a65);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.login-btn:hover { opacity: 0.9; }

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state p { color: var(--ink); font-size: 16px; margin: 0 0 8px; }
.empty-state span { color: var(--muted); font-size: 14px; }

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

@media (max-width: 640px) {
  .track-row { grid-template-columns: 42px 1fr auto; }
  .track-row time { display: none; }
  .page-header h1 { font-size: 22px; }
}
</style>