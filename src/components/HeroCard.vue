<template>
  <section class="hero-card">
    <div>
      <p class="eyebrow">今日推荐</p>
      <h1>探索来自 Jamendo 的免费音乐世界</h1>
      <p>输入关键词搜索数百万首 CC 授权音乐，双击歌曲卡片即可播放，背景自动切换为当前歌曲封面。</p>
      <div class="hero-actions">
        <button class="primary-action" @click="playHero">播放推荐歌曲</button>
      </div>
    </div>
    <div class="now-card">
      <img :src="cover" alt="当前歌曲封面">
      <span>正在播放</span>
      <strong>{{ title }}</strong>
      <small>{{ artist }}</small>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'

const player = usePlayerStore()

const cover = computed(() => player.currentTrack?.cover || '')
const title = computed(() => player.currentTrack?.title || '')
const artist = computed(() => player.currentTrack?.artist || '')

function playHero() {
  if (player.trackList.length > 0) {
    player.playTrack(player.trackList[0])
  }
}
</script>

<style scoped>
.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 28px;
  padding: 34px;
  border: 1px solid var(--rule);
  border-radius: 30px;
  background: linear-gradient(135deg, rgba(232, 64, 87, 0.18), rgba(30, 30, 46, 0.78));
  box-shadow: 0 26px 70px var(--shadow);
  backdrop-filter: blur(26px);
}
.eyebrow {
  margin: 0 0 10px;
  color: var(--accent-2);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.hero-card h1 {
  max-width: 760px;
  margin: 0 0 14px;
  font-size: clamp(30px, 4.6vw, 62px);
  line-height: 1.08;
  letter-spacing: -0.05em;
}
.hero-card p { max-width: 650px; color: var(--muted); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.primary-action {
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 11px 18px;
  color: var(--ink);
  background: linear-gradient(135deg, var(--accent), #ff6b81);
}
.now-card {
  align-self: center;
  padding: 18px;
  border: 1px solid var(--rule);
  border-radius: 24px;
  background: rgba(10, 10, 15, 0.44);
}
.now-card img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 18px;
  object-fit: cover;
  margin-bottom: 14px;
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.34);
}
.now-card span, .now-card small { color: var(--muted); }
.now-card strong, .now-card small { display: block; }

@media (max-width: 960px) {
  .hero-card { grid-template-columns: 1fr; }
  .now-card { max-width: 300px; }
}
@media (max-width: 640px) {
  .hero-card { padding: 20px; border-radius: 22px; }
}
</style>