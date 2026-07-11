<template>
  <Teleport to="body">
    <div v-if="visible" class="album-popup" :style="popupStyle">
      <div class="popup-header">
        <strong>{{ albumTitle }} · {{ albumYear }}</strong>
        <button class="popup-close" @click="$emit('close')">✕</button>
      </div>
      <ol class="popup-track-list">
        <li v-for="song in songs" :key="song.num">
          <span class="track-num">{{ song.num }}</span>
          <span class="track-name">{{ song.title }}</span>
          <span class="track-dur">{{ song.duration }}</span>
        </li>
      </ol>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { getAlbumPopupStyle } from '../utils/musicflow-core.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  albumTitle: { type: String, default: '' },
  albumYear: { type: [String, Number], default: '' },
  songs: { type: Array, default: () => [] },
  coverRect: { type: Object, default: () => ({ x: 0, y: 0, width: 0, height: 0 }) },
})

defineEmits(['close'])

const popupStyle = computed(() => {
  const style = getAlbumPopupStyle(props.coverRect)
  return {
    top: style.top,
    left: style.left,
    maxHeight: style.maxHeight,
  }
})
</script>

<style scoped>
.album-popup {
  position: fixed;
  width: 320px;
  border: 1px solid var(--rule);
  border-radius: 20px;
  background: var(--panel-strong);
  backdrop-filter: blur(30px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  z-index: 100;
  overflow-y: auto;
  animation: popupIn 220ms ease-out;
}
@keyframes popupIn {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--rule);
  position: sticky;
  top: 0;
  background: inherit;
  z-index: 2;
}
.popup-header strong { font-size: 16px; }
.popup-close {
  width: 32px;
  height: 32px;
  border: 1px solid var(--rule);
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  display: grid;
  place-items: center;
  font-size: 14px;
}
.popup-close:hover { color: var(--ink); border-color: var(--accent); }
.popup-track-list {
  margin: 0;
  padding: 12px 20px 20px;
  list-style: none;
  display: grid;
  gap: 10px;
}
.popup-track-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.045);
  font-size: 14px;
}
.popup-track-list li:hover { background: rgba(232, 64, 87, 0.12); }
.track-num { color: var(--muted); font-size: 12px; width: 20px; text-align: center; flex-shrink: 0; }
.track-name { flex: 1; }
.track-dur { color: var(--muted); font-size: 12px; flex-shrink: 0; }

@media (max-width: 960px) { .album-popup { width: 280px; } }
@media (max-width: 640px) { .album-popup { width: 260px; border-radius: 16px; } }
</style>