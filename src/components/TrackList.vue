<template>
  <section class="section-block">
    <div class="section-heading">
      <div>
        <p class="eyebrow">歌曲列表</p>
        <h2>推荐歌曲</h2>
      </div>
      <span>双击歌曲卡片播放，背景会变成该歌曲封面</span>
    </div>
    <div class="track-list">
      <article
        v-for="track in filteredTracks"
        :key="track.id"
        class="track-row"
        :class="{ active: track.id === currentTrack?.id }"
        @dblclick="handleDblClick(track)"
      >
        <img :src="track.cover" :alt="track.title + '封面'">
        <div class="track-title">
          <strong>{{ track.title }}</strong>
          <span>{{ track.artist }}</span>
        </div>
        <time>{{ track.duration }}</time>
        <button @click.stop="handlePlay(track)">播放</button>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'

const props = defineProps({
  searchKeyword: { type: String, default: '' },
})

const player = usePlayerStore()

const currentTrack = computed(() => player.currentTrack)

const filteredTracks = computed(() => {
  if (!props.searchKeyword) return player.trackList
  const kw = props.searchKeyword.toLowerCase()
  return player.trackList.filter(
    t => t.title.toLowerCase().includes(kw) || t.artist.toLowerCase().includes(kw)
  )
})

function handleDblClick(track) {
  player.playTrack(track)
}

function handlePlay(track) {
  player.playTrack(track)
}
</script>

<style scoped>
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
  grid-template-columns: 42px 1fr auto auto;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.045);
  cursor: pointer;
}
.track-row:hover, .track-row.active {
  border-color: rgba(232, 64, 87, 0.48);
  background: rgba(232, 64, 87, 0.12);
}
.track-row img {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  object-fit: cover;
}
.track-title strong, .track-title span { display: block; }
.track-title span, .track-row time { color: var(--muted); font-size: 13px; }
.track-row button {
  border: 0;
  border-radius: 999px;
  padding: 8px 13px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.08);
}
.track-row button:hover { background: rgba(255, 255, 255, 0.16); }

@media (max-width: 640px) {
  .section-block { padding: 20px; border-radius: 22px; }
  .track-row { grid-template-columns: 42px 1fr auto; }
  .track-row time { display: none; }
  .section-heading { align-items: stretch; flex-direction: column; }
}
</style>