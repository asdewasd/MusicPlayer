<template>
  <footer class="player-bar">
    <div class="song-info">
      <img :src="cover" alt="播放器封面">
      <div>
        <strong>{{ title }}</strong>
        <span>{{ meta }}</span>
      </div>
    </div>

    <div class="player-controls">
      <button @click="handlePrev" aria-label="上一首">上一首</button>
      <button class="play-button" @click="handleTogglePlay" aria-label="播放或暂停">
        {{ isPlaying ? '暂停' : '播放' }}
      </button>
      <button @click="handleNext" aria-label="下一首">下一首</button>
    </div>

    <div class="progress-area">
      <span>{{ formatTime(currentTime) }}</span>
      <div class="progress-track" @click="handleSeek">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <span>{{ formatTime(durationSeconds) }}</span>
      <button class="queue-toggle" :class="{ active: showQueue }" @click="toggleQueue" title="播放列表">
        <span class="queue-icon">☰</span>
        <span v-if="playQueue.queueCount > 0" class="queue-badge">{{ playQueue.queueCount }}</span>
      </button>
    </div>

    <!-- 隐藏的 Audio 元素 -->
    <audio
      ref="audioEl"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
      @ended="onEnded"
      @error="onAudioError"
      @play="onPlay"
      @pause="onPause"
    ></audio>

    <!-- 播放队列面板 -->
    <Transition name="queue-slide">
      <div v-if="showQueue" class="queue-panel">
        <div class="queue-header">
          <h3>播放列表</h3>
          <div class="queue-actions">
            <span class="queue-count">{{ playQueue.queueCount }} 首</span>
            <button v-if="playQueue.hasQueue" class="clear-btn" @click="handleClearQueue">清空</button>
            <button class="close-btn" @click="showQueue = false">✕</button>
          </div>
        </div>

        <!-- 当前播放 -->
        <div v-if="player.currentTrack" class="current-track">
          <img :src="cover" alt="">
          <div class="cur-info">
            <strong>{{ title }}</strong>
            <span>{{ meta }}</span>
          </div>
          <span class="cur-badge">正在播放</span>
        </div>

        <!-- 队列列表 -->
        <div v-if="playQueue.hasQueue" class="queue-list">
          <article
            v-for="(track, index) in playQueue.queue"
            :key="track.queueId"
            class="queue-item"
            @dblclick="playFromQueue(track)"
          >
            <span class="queue-num">{{ index + 1 }}</span>
            <img :src="track.cover_url" :alt="track.title" @error="onQueueImgError">
            <div class="queue-info">
              <strong>{{ track.title }}</strong>
              <span>{{ track.artist_name }}</span>
            </div>
            <button class="queue-play-btn" @click.stop="playFromQueue(track)">播放</button>
            <button class="queue-remove-btn" @click.stop="removeFromQueue(track)" title="移除">✕</button>
          </article>
        </div>
        <div v-else class="queue-empty">
          <span>队列为空</span>
          <p>点击歌曲旁的「下一首播放」添加到队列</p>
        </div>
      </div>
    </Transition>
  </footer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { usePlayQueueStore } from '../stores/playQueue.js'

const player = usePlayerStore()
const playQueue = usePlayQueueStore()
const audioEl = ref(null)
const currentTime = ref(0)
const durationSeconds = ref(0)
const isPlaying = ref(false)
const audioError = ref(false)
const showQueue = ref(false)

const cover = computed(() => player.currentTrack?.cover_url || player.currentTrack?.cover || '')
const title = computed(() => player.currentTrack?.title || 'MusicFlow')
const meta = computed(() => {
  const t = player.currentTrack
  if (!t) return '选择一首歌曲开始'
  return `${t.artist || ''} · ${t.album || ''}`
})

const progressPercent = computed(() => {
  if (durationSeconds.value <= 0) return 0
  return (currentTime.value / durationSeconds.value) * 100
})

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// 监听当前曲目变化
watch(() => player.currentTrack, (track) => {
  if (!track || !audioEl.value) return
  audioError.value = false
  const audioUrl = track.audio_url || track.audioUrl
  if (audioUrl) {
    audioEl.value.src = audioUrl
    audioEl.value.load()
    audioEl.value.play().catch(() => {})
    isPlaying.value = true
    player.isPlaying = true
  }
})

function handleTogglePlay() {
  if (!audioEl.value) return
  if (isPlaying.value) {
    audioEl.value.pause()
  } else {
    if (!audioEl.value.src && player.currentTrack) {
      const audioUrl = player.currentTrack.audio_url || player.currentTrack.audioUrl
      if (audioUrl) {
        audioEl.value.src = audioUrl
        audioEl.value.load()
      }
    }
    audioEl.value.play().catch(() => {})
  }
}

function handlePrev() { player.playPrevious() }
function handleNext() { player.playNext() }

function handleSeek(e) {
  if (!audioEl.value || durationSeconds.value <= 0) return
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  audioEl.value.currentTime = ratio * durationSeconds.value
}

function toggleQueue() {
  showQueue.value = !showQueue.value
}

function playFromQueue(track) {
  player.playTrack(track)
  showQueue.value = false
}

async function removeFromQueue(track) {
  await playQueue.removeFromQueue(track.queueId)
}

async function handleClearQueue() {
  await playQueue.clearQueue()
}

function onQueueImgError(e) {
  e.target.remove()
}

function onTimeUpdate() {
  if (audioEl.value) currentTime.value = audioEl.value.currentTime
}
function onLoaded() {
  if (audioEl.value) durationSeconds.value = audioEl.value.duration || 0
}
function onPlay() {
  isPlaying.value = true
  player.isPlaying = true
}
function onPause() {
  isPlaying.value = false
  player.isPlaying = false
}
function onEnded() {
  player.playNext()
}
function onAudioError() {
  audioError.value = true
  isPlaying.value = false
  player.isPlaying = false
}
</script>

<style scoped>
.player-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 22px;
  align-items: center;
  padding: 14px 24px;
  border-top: 1px solid var(--rule);
  background: rgba(10, 10, 15, 0.86);
  backdrop-filter: blur(28px);
}
.song-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.song-info img {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  object-fit: cover;
}
.song-info strong, .song-info span {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.song-info span { color: var(--muted); font-size: 13px; }
.player-controls { display: flex; justify-content: center; gap: 12px; }
.player-controls button {
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 11px 18px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  font-size: 14px;
}
.player-controls button:hover {
  border-color: rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.12);
}
.play-button {
  border-color: transparent !important;
  background: linear-gradient(135deg, var(--accent), #ff6b81) !important;
}
.progress-area {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: 12px;
}
.progress-track {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  overflow: hidden;
  cursor: pointer;
}
.progress-track:hover { height: 6px; }
.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
  transition: width 0.1s linear;
}

/* 队列按钮 */
.queue-toggle {
  position: relative;
  border: 0;
  background: rgba(255,255,255,0.08);
  border-radius: 8px;
  color: var(--muted);
  cursor: pointer;
  padding: 6px 10px;
  font-size: 16px;
  transition: all 0.15s;
}
.queue-toggle:hover, .queue-toggle.active {
  color: var(--accent);
  background: rgba(255,255,255,0.14);
}
.queue-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

/* 队列面板 */
.queue-panel {
  position: absolute;
  bottom: 100%;
  right: 0;
  width: 380px;
  max-height: 480px;
  border-top: 1px solid var(--rule);
  border-left: 1px solid var(--rule);
  border-radius: 20px 20px 0 0;
  background: rgba(14, 14, 24, 0.96);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--rule);
}
.queue-header h3 { margin: 0; font-size: 16px; }
.queue-actions { display: flex; align-items: center; gap: 10px; }
.queue-count { color: var(--muted); font-size: 13px; }
.clear-btn, .close-btn {
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 6px;
}
.clear-btn:hover, .close-btn:hover { color: var(--ink); background: rgba(255,255,255,0.08); }
.close-btn { font-size: 16px; }

/* 当前播放 */
.current-track {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--rule);
  background: rgba(255,255,255,0.04);
}
.current-track img { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
.cur-info { flex: 1; min-width: 0; }
.cur-info strong, .cur-info span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cur-info span { color: var(--muted); font-size: 12px; }
.cur-badge { color: var(--accent); font-size: 12px; font-weight: 600; flex-shrink: 0; }

/* 队列列表 */
.queue-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.12s;
}
.queue-item:hover { background: rgba(255,255,255,0.06); }
.queue-num { color: var(--muted); font-size: 13px; width: 20px; text-align: center; flex-shrink: 0; }
.queue-item img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.queue-info { flex: 1; min-width: 0; }
.queue-info strong, .queue-info span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.queue-info span { color: var(--muted); font-size: 12px; }
.queue-play-btn {
  border: 0;
  border-radius: 999px;
  padding: 6px 12px;
  color: var(--ink);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  font-size: 12px;
  flex-shrink: 0;
}
.queue-play-btn:hover { background: var(--accent); }
.queue-remove-btn {
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  flex-shrink: 0;
}
.queue-remove-btn:hover { color: #e84057; }

.queue-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}
.queue-empty span { color: var(--muted); font-size: 14px; }
.queue-empty p { color: var(--muted); font-size: 12px; margin-top: 6px; }

/* 动画 */
.queue-slide-enter-active, .queue-slide-leave-active {
  transition: all 0.25s ease;
}
.queue-slide-enter-from, .queue-slide-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

@media (max-width: 960px) {
  .player-bar { grid-template-columns: 1fr; gap: 10px; padding: 10px 16px; }
  .song-info img { width: 44px; height: 44px; }
  .player-controls button { padding: 8px 14px; font-size: 13px; }
  .progress-area { grid-template-columns: auto 1fr auto; }
  .queue-toggle { display: none; }
  .queue-panel { width: 100%; right: 0; border-radius: 20px 20px 0 0; }
}
</style>