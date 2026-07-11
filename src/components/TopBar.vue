<template>
  <header class="topbar">
    <label class="search-box">
      <span>搜索</span>
      <input
        v-model="searchText"
        type="search"
        placeholder='搜索歌手名字（输入"周杰伦"或"朴树"试试）'
        @keydown.enter="handleSearch"
      >
    </label>
    <button class="vip-button">黑胶体验</button>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicStore } from '../stores/music.js'
import { shouldNavigateToArtistPage } from '../utils/musicflow-core.js'

const router = useRouter()
const music = useMusicStore()
const searchText = ref('')

const emit = defineEmits(['search-song'])

function handleSearch() {
  const text = searchText.value.trim()
  if (!text) return

  const artistList = Object.values(music.artistsMap)
  const artistId = shouldNavigateToArtistPage(text, artistList)

  if (artistId) {
    searchText.value = ''
    router.push({ name: 'artist', params: { id: artistId } })
  } else {
    emit('search-song', text)
  }
}
</script>

<style scoped>
.topbar {
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
}

.vip-button {
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 11px 18px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.08);
}

.vip-button:hover {
  border-color: rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 640px) {
  .topbar { align-items: stretch; flex-direction: column; }
  .vip-button { display: none; }
}
</style>