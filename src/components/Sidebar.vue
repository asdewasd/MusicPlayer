<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="brand" @click="$router.push('/')">
      <span class="brand-mark">M</span>
      <div>
        <strong>MusicFlow</strong>
        <small>音乐播放器</small>
      </div>
    </div>

    <!-- 主导航 -->
    <nav class="nav-list" aria-label="主导航">
      <button
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ active: route.name === item.name }"
        @click="handleNav(item)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        {{ item.label }}
      </button>
    </nav>

    <!-- 子歌单 -->
    <section class="mini-playlists">
      <h2>我的歌单</h2>
      <button
        v-for="pl in miniPlaylists"
        :key="pl.id"
        :class="{ active: activeMiniPlaylist === pl.id }"
        @click="handlePlaylist(pl)"
      >
        {{ pl.name }}
      </button>
    </section>

    <!-- 用户 -->
    <div class="sidebar-footer">
      <button class="user-btn" @click="handleUser">
        <span class="user-avatar">{{ authStore.userInitial }}</span>
        <span>{{ authStore.isLoggedIn ? authStore.userName : '未登录' }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeMiniPlaylist = ref('')

const navItems = [
  { label: '发现音乐', name: 'home', icon: '🏠' },
  { label: '搜索', name: 'search', icon: '🔍' },
  { label: '我喜欢的', name: 'favorites', icon: '❤️' },
  { label: '我的歌单', name: 'playlists', icon: '📋' },
  { label: '社区动态', name: 'community', icon: '💬' },
  { label: '个人中心', name: 'profile', icon: '👤' },
]

const miniPlaylists = [
  { id: 'favorites', name: '我喜欢的音乐' },
  { id: 'recent', name: '最近播放' },
  { id: 'chinese', name: '华语流行' },
]

function handleNav(item) {
  router.push({ name: item.name })
}

function handlePlaylist(pl) {
  activeMiniPlaylist.value = pl.id
  router.push({ name: 'playlist-detail', params: { id: pl.id } })
}

function handleUser() {
  if (authStore.isLoggedIn) {
    router.push({ name: 'profile' })
  } else {
    router.push({ name: 'login' })
  }
}
</script>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  height: calc(100vh - 96px);
  padding: 28px 18px;
  background: rgba(10, 10, 15, 0.62);
  border-right: 1px solid var(--rule);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 34px;
  cursor: pointer;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), #ff8a65);
  font-weight: 900;
  font-size: 18px;
  box-shadow: 0 18px 40px rgba(232, 64, 87, 0.24);
}

.brand strong, .brand small { display: block; }
.brand small { color: var(--muted); margin-top: 2px; }

.nav-list, .mini-playlists { display: grid; gap: 6px; }

.nav-item, .mini-playlists button {
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 12px 14px;
  color: var(--muted);
  background: transparent;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  transition: all 0.15s;
}

.nav-icon { font-size: 16px; width: 24px; text-align: center; }

.nav-item.active, .nav-item:hover, .mini-playlists button:hover {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.08);
}

.mini-playlists button.active {
  color: var(--ink);
  background: rgba(232, 64, 87, 0.15);
}

.mini-playlists { margin-top: 32px; flex: 1; }
.mini-playlists h2 {
  margin: 0 0 8px;
  padding: 0 14px;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.08em;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
}

.user-btn {
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 12px 14px;
  color: var(--muted);
  background: transparent;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.user-btn:hover { color: var(--ink); background: rgba(255,255,255,0.06); }

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), #ff8a65);
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

@media (max-width: 960px) {
  .sidebar {
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--rule);
    padding: 16px;
  }
  .brand { display: none; }
  .nav-list { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .nav-item { text-align: center; flex-direction: column; gap: 4px; padding: 10px 6px; font-size: 12px; }
  .nav-icon { font-size: 18px; }
  .mini-playlists { display: none; }
  .sidebar-footer { display: none; }
}
</style>