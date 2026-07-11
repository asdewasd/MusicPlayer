<template>
  <div class="page-placeholder">
    <header class="topbar">
      <label class="search-box">
        <span>搜索</span>
        <input type="search" placeholder="搜索歌曲、歌手、专辑">
      </label>
    </header>

    <!-- 未登录提示 -->
    <template v-if="!isLoggedIn">
      <section class="section-block">
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <p>请登录后查看个人中心</p>
          <button class="primary-action" @click="openLoginModal">登录</button>
        </div>
      </section>
    </template>

    <!-- 已登录 -->
    <template v-else>
      <section class="section-block">
        <div class="profile-header">
          <div class="avatar">{{ authStore.userInitial }}</div>
          <div>
            <h2>{{ authStore.userName }}</h2>
            <p v-if="authStore.user?.email" class="user-email">{{ authStore.user.email }}</p>
            <p>音乐爱好者 · 累计播放 128 首</p>
          </div>
        </div>
      </section>
      <section class="section-block stats-grid">
        <article>
          <strong>128</strong>
          <span>累计播放</span>
        </article>
        <article>
          <strong>24</strong>
          <span>收藏歌曲</span>
        </article>
        <article>
          <strong>5</strong>
          <span>创建歌单</span>
        </article>
        <article>
          <strong>3</strong>
          <span>关注歌手</span>
        </article>
      </section>
      <section class="section-block logout-section">
        <button class="logout-btn" @click="authStore.logout()">退出登录</button>
      </section>
    </template>

    <!-- 登录弹窗 -->
    <LoginModal :visible="loginModalVisible" @close="closeLogin" @login-success="onLoginSuccess" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import LoginModal from '../components/LoginModal.vue'

const authStore = useAuthStore()
const isLoggedIn = computed(() => authStore.isLoggedIn)
const loginModalVisible = ref(false)

function openLoginModal() {
  loginModalVisible.value = true
}

function closeLogin() {
  loginModalVisible.value = false
}

function onLoginSuccess() {
  // 登录成功后页面自动显示已登录状态
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
  padding: 26px;
  border: 1px solid var(--rule);
  border-radius: 26px;
  background: var(--panel);
  backdrop-filter: blur(24px);
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
}
.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), #ff8a65);
  font-size: 36px;
  font-weight: 900;
  flex-shrink: 0;
}
.profile-header h2 { margin: 0 0 6px; font-size: 28px; }
.profile-header p { margin: 0; color: var(--muted); }
.user-email { margin-bottom: 2px; font-size: 14px; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state p { color: var(--muted); font-size: 16px; margin: 0 0 20px; }
.primary-action {
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 11px 28px;
  color: var(--ink);
  background: linear-gradient(135deg, var(--accent), #ff6b81);
  font-size: 15px;
  cursor: pointer;
}

.stats-grid {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  background: transparent;
  padding: 0;
  border: none;
}
.stats-grid article {
  padding: 24px 18px;
  border: 1px solid var(--rule);
  border-radius: 20px;
  background: var(--panel);
  backdrop-filter: blur(24px);
  text-align: center;
}
.stats-grid strong { display: block; font-size: 28px; margin-bottom: 4px; }
.stats-grid span { color: var(--muted); font-size: 13px; }

.logout-section {
  margin-top: 28px;
  padding: 20px 26px;
  text-align: center;
}
.logout-btn {
  padding: 12px 40px;
  border: 1px solid var(--rule);
  border-radius: 14px;
  background: transparent;
  color: var(--muted);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}
.logout-btn:hover { color: var(--accent); border-color: var(--accent); background: rgba(232,64,87,0.08); }

@media (max-width: 640px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>