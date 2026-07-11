<template>
  <div class="page-placeholder">
    <header class="topbar">
      <label class="search-box">
        <span>搜索</span>
        <input type="search" placeholder="搜索歌单...">
      </label>
    </header>

    <!-- 未登录提示 -->
    <template v-if="!isLoggedIn">
      <section class="section-block">
        <div class="empty-state">
          <div class="empty-icon">🔐</div>
          <p>请登录后才能查看我的歌单</p>
          <button class="primary-action" @click="openLoginModal">登录</button>
        </div>
      </section>
    </template>

    <!-- 已登录后显示 -->
    <template v-else>
      <section class="section-block">
        <div class="section-heading">
          <h2>我的歌单</h2>
          <button class="primary-btn">+ 创建新歌单</button>
        </div>
        <div class="playlist-list">
          <div v-for="pl in playlists" :key="pl.id" class="playlist-card">
            <img :src="pl.cover_url" :alt="pl.name">
            <div>
              <strong>{{ pl.name }}</strong>
              <span>{{ pl.track_count }} 首</span>
            </div>
          </div>
        </div>
        <div class="empty-state" v-if="playlists.length === 0">
          <div class="empty-icon">🎶</div>
          <p>你还没有创建歌单</p>
          <button class="primary-action">创建第一个歌单</button>
        </div>
      </section>
    </template>

    <!-- 登录弹窗（可关闭） -->
    <LoginModal :visible="loginModalVisible" @close="closeLogin" @login-success="onLoginSuccess" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import LoginModal from '../components/LoginModal.vue'

const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)
const loginModalVisible = ref(false)
const playlists = ref([])

function openLoginModal() {
  loginModalVisible.value = true
}

function closeLogin() {
  loginModalVisible.value = false
}

function onLoginSuccess() {
  // TODO: 这里加载用户歌单列表
  // console.log('登录成功，可以加载歌单了')
}
</script>

<style scoped>
.page-placeholder { padding: 0; }
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
.section-block {
  margin-bottom: 28px;
  padding: 26px;
  border: 1px solid var(--rule);
  border-radius: 26px;
  background: var(--panel);
  backdrop-filter: blur(24px);
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.section-heading h2 { margin: 0; font-size: 26px; }
.primary-btn {
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 10px 20px;
  color: var(--ink);
  background: linear-gradient(135deg, var(--accent), #ff6b81);
  font-size: 14px;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state p { color: var(--muted); font-size: 16px; margin: 0 0 20px; }
.primary-action {
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 11px 24px;
  color: var(--ink);
  background: linear-gradient(135deg, var(--accent), #ff6b81);
  font-size: 15px;
}
.playlist-list { display: grid; gap: 14px; }
.playlist-card {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--rule);
  background: rgba(255,255,255,0.04);
}
.playlist-card img { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; }
</style>