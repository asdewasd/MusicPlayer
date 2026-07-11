<template>
  <button
    class="album-float"
    :class="{ dragging: isDragging, active: isActive }"
    :style="positionStyle"
    @pointerdown="onPointerDown"
    @click.capture="onClick"
  >
    <img :src="album.cover" :alt="album.title">
    <strong>{{ album.title }}</strong>
    <span>{{ album.year }}</span>
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  album: { type: Object, required: true },
  initialLeft: { type: Number, default: 24 },
  initialTop: { type: Number, default: 24 },
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const isDragging = ref(false)
const isActive = ref(props.active)
const posX = ref(props.initialLeft)
const posY = ref(props.initialTop)

let startX = 0, startY = 0, startLeft = 0, startTop = 0
let moved = false

const positionStyle = computed(() => ({
  left: posX.value + 'px',
  top: posY.value + 'px',
}))

function onPointerDown(e) {
  isDragging.value = true
  moved = false
  startX = e.clientX
  startY = e.clientY
  startLeft = posX.value
  startTop = posY.value
  if (e.currentTarget && e.currentTarget.setPointerCapture) {
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e) {
  if (!isDragging.value) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true
  posX.value = startLeft + dx
  posY.value = startTop + dy
}

function onPointerUp() {
  isDragging.value = false
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
}

function onClick(e) {
  if (moved) {
    e.stopPropagation()
    e.preventDefault()
    moved = false
    return
  }
  emit('select', props.album)
}
</script>

<style scoped>
.album-float {
  position: absolute;
  width: 162px;
  border: 0;
  border-radius: 22px;
  padding: 12px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.07);
  text-align: left;
  cursor: grab;
  transition: box-shadow 200ms ease, transform 120ms ease;
  z-index: 1;
}
.album-float:hover { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); z-index: 5; }
.album-float.dragging {
  cursor: grabbing;
  z-index: 10;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.65);
  transform: scale(1.06);
}
.album-float:not(.dragging).active,
.album-float.active {
  z-index: 10;
  box-shadow: 0 0 0 3px var(--accent), 0 12px 40px rgba(0, 0, 0, 0.5);
  background: rgba(232, 64, 87, 0.18);
}
.album-float img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 16px;
  object-fit: cover;
  pointer-events: none;
}
.album-float strong { display: block; margin-top: 10px; font-size: 14px; }
.album-float span { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }

@media (max-width: 960px) {
  .album-float { width: 130px; padding: 10px; }
}
@media (max-width: 640px) {
  .album-float { width: 110px; padding: 8px; border-radius: 16px; }
  .album-float img { border-radius: 12px; }
}
</style>