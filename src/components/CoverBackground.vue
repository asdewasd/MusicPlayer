<template>
  <div class="cover-background" :style="bgStyle"></div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { buildBackgroundStyle } from '../utils/musicflow-core.js'

const player = usePlayerStore()

const bgStyle = computed(() => ({
  backgroundImage: player.currentTrack
    ? buildBackgroundStyle(player.currentTrack)
    : 'linear-gradient(135deg, #171724 0%, #0a0a0f 100%)',
}))
</script>

<style scoped>
.cover-background {
  position: fixed;
  inset: -48px;
  z-index: -2;
  background-size: cover;
  background-position: center;
  filter: blur(42px) brightness(0.62) saturate(1.22);
  transform: scale(1.1);
  transition: background-image 500ms ease, opacity 500ms ease;
}
.cover-background::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(232, 64, 87, 0.24), transparent 32%),
    linear-gradient(120deg, rgba(10, 10, 15, 0.58), rgba(10, 10, 15, 0.86));
}
</style>