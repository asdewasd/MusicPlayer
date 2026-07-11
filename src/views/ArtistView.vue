<template>
  <div>
    <header class="artist-topbar">
      <button class="back-button" @click="$router.push('/')">← 返回首页</button>
      <div class="artist-info">
        <div class="artist-avatar-large">{{ avatarChar }}</div>
        <div>
          <p class="eyebrow">歌手详情</p>
          <h1>{{ artistName }}</h1>
          <p>{{ artistDesc }}</p>
        </div>
      </div>
    </header>

    <div class="album-canvas" ref="canvasRef" @click.self="closePopup">
      <AlbumFloat
        v-for="(album, i) in albums"
        :key="album.id"
        :album="album"
        :initial-left="gap + (i % cols) * (cardWidth + gap)"
        :initial-top="gap + Math.floor(i / cols) * (cardWidth + 60 + gap)"
        :active="activeAlbumId === album.id"
        @select="onAlbumSelect"
      />
    </div>

    <AlbumPopup
      :visible="popupVisible"
      :album-title="popupAlbum?.title || ''"
      :album-year="popupAlbum?.year || ''"
      :songs="popupSongs"
      :cover-rect="popupCoverRect"
      @close="closePopup"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import AlbumFloat from '../components/AlbumFloat.vue'
import AlbumPopup from '../components/AlbumPopup.vue'
import { useMusicStore } from '../stores/music.js'

const music = useMusicStore()
const props = defineProps({ id: { type: [String, Number], required: true } })

const canvasRef = ref(null)
const albums = ref([])
const popupVisible = ref(false)
const popupAlbum = ref(null)
const popupSongs = ref([])
const popupCoverRect = ref({ x: 0, y: 0, width: 0, height: 0 })
const activeAlbumId = ref(null)

const artistName = ref('')
const artistDesc = ref('')
const avatarChar = ref('')

const cardWidth = 162
const gap = 24

const cols = ref(2)

onMounted(async () => {
  const artistId = props.id

  // 如果直接访问歌手页，艺人数据可能未加载
  if (Object.keys(music.artistsMap).length === 0) {
    await music.fetchArtistsAndSongs()
  }

  const artist = music.artistsMap[artistId]
  if (artist) {
    artistName.value = artist.name
    artistDesc.value = artist.description || ''
    avatarChar.value = artist.name.charAt(0)
  }

  albums.value = await music.fetchArtistAlbums(artistId)

  await nextTick()
  if (canvasRef.value) {
    cols.value = Math.max(2, Math.floor(canvasRef.value.clientWidth / 200))
  }
})

async function onAlbumSelect(album) {
  activeAlbumId.value = album.id
  popupAlbum.value = album

  const songs = await music.fetchAlbumSongs(album.id)
  popupSongs.value = songs
  popupVisible.value = true

  // 获取封面位置
  await nextTick()
  const activeEl = document.querySelector('.album-float.active')
  if (activeEl) {
    popupCoverRect.value = activeEl.getBoundingClientRect()
  }
}

function closePopup() {
  popupVisible.value = false
  activeAlbumId.value = null
}
</script>

<style scoped>
.artist-topbar {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.back-button {
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 10px 20px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.08);
  font-size: 15px;
  flex-shrink: 0;
}
.back-button:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.32);
}
.artist-info {
  display: flex;
  align-items: center;
  gap: 18px;
}
.artist-avatar-large {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  font-size: 32px;
  font-weight: 900;
  flex-shrink: 0;
}
.artist-info h1 { margin: 0; font-size: 32px; }
.artist-info p { margin: 4px 0 0; color: var(--muted); }
.eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--accent-2);
}
.album-canvas {
  position: relative;
  width: 100%;
  min-height: 520px;
  border: 2px dashed var(--rule);
  border-radius: 22px;
  background: rgba(10, 10, 15, 0.38);
  overflow: auto;
  user-select: none;
}
.album-canvas::before {
  content: "每张专辑封面都可以自由拖动，点击封面查看单曲列表";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--muted);
  font-size: 14px;
  pointer-events: none;
  opacity: 0.5;
}

@media (max-width: 960px) { .album-canvas { min-height: 420px; } }
@media (max-width: 640px) {
  .artist-topbar { align-items: stretch; flex-direction: column; }
  .album-canvas { min-height: 360px; }
}
</style>