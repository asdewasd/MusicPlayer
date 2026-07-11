<template>
  <div class="app-root">
    <CoverBackground />
    <div class="app-shell" :class="{ 'artist-page-shell': isFullPage }">
      <Sidebar v-if="!isFullPage" />
      <main class="main-content" :class="{ 'artist-main': isArtistPage, 'auth-main': isAuthPage }">
        <router-view />
      </main>
    </div>
    <PlayerBar />
    <ToastMessage
      :message="errorMessage"
      :visible="errorVisible"
      type="error"
      @close="hideError"
    />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CoverBackground from './components/CoverBackground.vue'
import Sidebar from './components/Sidebar.vue'
import PlayerBar from './components/PlayerBar.vue'
import ToastMessage from './components/ToastMessage.vue'
import { useRequest } from './utils/request.js'
import { useAuthStore } from './stores/auth.js'

const route = useRoute()
const authStore = useAuthStore()
const { errorMessage, errorVisible, hideError } = useRequest()

// 应用启动时初始化认证状态
onMounted(() => {
  authStore.init()
  // 如果已登录，异步验证 token 有效性
  if (authStore.isLoggedIn) {
    authStore.fetchUser()
  }
})

const isArtistPage = computed(() => route.name === 'artist')
const isAuthPage = computed(() => route.name === 'login')
const isFullPage = computed(() => isArtistPage.value || isAuthPage.value)
</script>

<style>
:root {
  --bg: #0a0a0f;
  --panel: rgba(20, 20, 31, 0.82);
  --panel-strong: rgba(30, 30, 46, 0.92);
  --ink: #f4f2ef;
  --muted: #9b9bac;
  --rule: rgba(255, 255, 255, 0.11);
  --accent: #e84057;
  --accent-2: #1ed760;
  --shadow: rgba(0, 0, 0, 0.36);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  font-family: Inter, "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
}

button, input { font: inherit; }
button { cursor: pointer; }

.app-shell {
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  padding-bottom: 96px;
  align-items: start;
}

.app-shell.artist-page-shell {
  grid-template-columns: 1fr;
}

.main-content {
  min-width: 0;
  padding: 28px 34px 34px;
  overflow: hidden;
}

.artist-main {
  min-height: calc(100vh - 96px);
  position: relative;
}

.auth-main {
  padding: 0;
  min-height: calc(100vh - 96px);
}

@media (max-width: 960px) {
  .app-shell:not(.artist-page-shell) {
    grid-template-columns: 1fr;
    padding-bottom: 156px;
  }
}

@media (max-width: 640px) {
  .main-content { padding: 18px; }
}
</style>