<template>
  <div class="playlist-detail">
    <header class="detail-header">
      <button class="back-button" @click="$router.back()">← 返回</button>
      <div class="hero-area">
        <div class="cover-art">
          <img :src="playlist.cover" :alt="playlist.title" v-if="playlist.cover">
          <span v-else class="cover-placeholder">🎵</span>
        </div>
        <div class="hero-info">
          <p class="eyebrow">歌单</p>
          <h1>{{ playlist.title }}</h1>
          <p>{{ playlist.description }}</p>
          <div class="hero-meta">
            <span>{{ songs.length }} 首歌曲</span>
            <span>·</span>
            <span>播放 {{ playlist.playCount || 0 }} 次</span>
          </div>
          <div class="hero-actions">
            <button class="primary-action" @click="playAll">▶ 播放全部</button>
            <button
              class="ghost-action"
              :class="{ favorited: isFav }"
              @click="toggleFavorite"
            >{{ isFav ? '♥ 已收藏' : '♡ 收藏' }}</button>
          </div>
        </div>
      </div>
    </header>

    <section class="section-block">
      <div class="track-list">
        <article
          v-for="(track, i) in songs"
          :key="track.id"
          class="track-row"
          :class="{ active: track.id === currentTrack?.id }"
          @dblclick="playTrack(track)"
        >
          <span class="track-index">{{ String(i + 1).padStart(2, '0') }}</span>
          <img :src="track.cover" :alt="track.title">
          <div class="track-title">
            <strong>{{ track.title }}</strong>
            <span>{{ track.artist }}</span>
          </div>
          <time>{{ track.duration }}</time>
          <div class="track-actions">
            <button
              class="fav-btn"
              :class="{ favorited: songFav.isFavorited(track.id) }"
              @click.stop="songFav.toggle(track.id)"
            >{{ songFav.isFavorited(track.id) ? '♥' : '♡' }}</button>
            <button class="play-btn" @click.stop="playTrack(track)">播放</button>
          </div>
        </article>
      </div>

      <!-- 分页 -->
      <div v-if="pagination.totalPages > 1" class="pagination">
        <button :disabled="pagination.page <= 1" @click="pagination.prevPage()">上一页</button>
        <span v-for="p in pagination.totalPages" :key="p">
          <button
            :class="{ active: pagination.page === p }"
            @click="pagination.goToPage(p)"
          >{{ p }}</button>
        </span>
        <button :disabled="!pagination.hasMore" @click="pagination.nextPage()">下一页</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayerStore } from '../stores/player.js'
import { usePagination } from '../composables/usePagination.js'
import { useFavorite } from '../composables/useFavorite.js'
import api from '../utils/request.js'

const route = useRoute()
const player = usePlayerStore()
const songFav = useFavorite('song')
const playlistFav = useFavorite('playlist')

const playlistId = computed(() => route.params.id)
const playlist = ref({ title: '加载中...', description: '', cover: '', playCount: 0 })
const songs = ref([])
const isFav = ref(false)

const pagination = usePagination(async ({ page, pageSize }) => {
  const data = await api.get(`/api/playlists/${playlistId.value}/songs?page=${page}&pageSize=${pageSize}`)
  songs.value = data.list || data || []
  return data
}, 20)

onMounted(async () => {
  try {
    // 加载歌单信息
    const data = await api.get(`/api/playlists/${playlistId.value}`)
    playlist.value = data
  } catch {
    // 本地兜底
    playlist.value = {
      id: playlistId.value,
      title: '我的歌单',
      description: '本地歌单',
      cover: '',
      playCount: 0,
    }
  }

  // 加载歌曲
  await pagination.fetchPage()
  songs.value = pagination.list.value

  // 检查收藏状态
  isFav.value = playlistFav.isFavorited(playlistId.value)
})

function playAll() {
  if (songs.value.length > 0) {
    player.setTrackList(songs.value)
    player.playTrack(songs.value[0])
  }
}

function playTrack(track) {
  player.setTrackList(songs.value)
  player.playTrack(track)
}

async function toggleFavorite() {
  try {
    await playlistFav.toggle(playlistId.value)
    isFav.value = playlistFav.isFavorited(playlistId.value)
  } catch {
    // ignore
  }
}
</script>

<style scoped>
.playlist-detail { padding: 0; }

.detail-header { margin-bottom: 28px; }

.back-button {
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 10px 20px;
  color: var(--ink);
  background: rgba(255,255,255,0.08);
  font-size: 15px;
  margin-bottom: 20px;
}
.back-button:hover { background: rgba(255,255,255,0.16); }

.hero-area {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 32px;
  padding: 34px;
  border: 1px solid var(--rule);
  border-radius: 30px;
  background: linear-gradient(135deg, rgba(232,64,87,0.15), rgba(30,30,46,0.78));
  backdrop-filter: blur(26px);
}

.cover-art {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(0,0,0,0.3);
}
.cover-art img { width: 100%; height: 100%; object-fit: cover; }
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 48px;
}

.hero-info { min-width: 0; }
.eyebrow {
  margin: 0 0 10px;
  color: var(--accent-2);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.hero-info h1 { margin: 0 0 12px; font-size: clamp(28px, 4vw, 48px); }
.hero-info p { color: var(--muted); margin: 0 0 12px; max-width: 600px; }
.hero-meta { display: flex; gap: 8px; color: var(--muted); font-size: 14px; margin-bottom: 20px; }

.hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.primary-action {
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 12px 24px;
  color: var(--ink);
  background: linear-gradient(135deg, var(--accent), #ff6b81);
  font-size: 15px;
}

.ghost-action {
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 12px 24px;
  color: var(--ink);
  background: rgba(255,255,255,0.08);
  font-size: 15px;
}
.ghost-action.favorited { border-color: var(--accent); background: rgba(232,64,87,0.15); }

/* 歌曲列表 */
.section-block {
  padding: 26px;
  border: 1px solid var(--rule);
  border-radius: 26px;
  background: var(--panel);
  backdrop-filter: blur(24px);
}

.track-list { display: grid; gap: 10px; }

.track-row {
  display: grid;
  grid-template-columns: 32px 42px 1fr auto auto;
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
.track-index { color: var(--muted); font-size: 13px; text-align: center; }
.track-row img { width: 42px; height: 42px; border-radius: 10px; object-fit: cover; }
.track-title strong, .track-title span { display: block; }
.track-title span, .track-row time { color: var(--muted); font-size: 13px; }

.track-actions { display: flex; gap: 8px; align-items: center; }

.fav-btn {
  border: 0;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.2s;
}
.fav-btn.favorited { color: var(--accent); transform: scale(1.2); }

.play-btn {
  border: 0;
  border-radius: 999px;
  padding: 8px 13px;
  color: var(--ink);
  background: rgba(255,255,255,0.08);
}
.play-btn:hover { background: rgba(255,255,255,0.16); }

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}
.pagination button {
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 8px 14px;
  color: var(--muted);
  background: transparent;
  font-size: 14px;
}
.pagination button.active {
  color: var(--ink);
  border-color: var(--accent);
  background: rgba(232,64,87,0.15);
}
.pagination button:disabled { opacity: 0.4; cursor: default; }

@media (max-width: 960px) {
  .hero-area { grid-template-columns: 1fr; }
  .cover-art { max-width: 240px; }
}

@media (max-width: 640px) {
  .section-block { padding: 18px; border-radius: 22px; }
  .hero-area { padding: 20px; border-radius: 22px; }
  .track-row { grid-template-columns: 28px 36px 1fr auto; }
  .track-row time { display: none; }
  .pagination { flex-wrap: wrap; }
}
</style>