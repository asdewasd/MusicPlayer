import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SearchView from '../views/SearchView.vue'
import ArtistView from '../views/ArtistView.vue'
import PlaylistsView from '../views/PlaylistsView.vue'
import PlaylistDetailView from '../views/PlaylistDetailView.vue'
import CommunityView from '../views/CommunityView.vue'
import ProfileView from '../views/ProfileView.vue'
import LoginView from '../views/LoginView.vue'
import FavoritesView from '../views/FavoritesView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/search', name: 'search', component: SearchView },
  { path: '/artist/:id', name: 'artist', component: ArtistView, props: true },
  { path: '/playlists', name: 'playlists', component: PlaylistsView },
  { path: '/playlist/:id', name: 'playlist-detail', component: PlaylistDetailView, props: true },
  { path: '/community', name: 'community', component: CommunityView },
  { path: '/profile', name: 'profile', component: ProfileView },
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
  { path: '/favorites', name: 'favorites', component: FavoritesView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * 全局路由守卫
 */
router.beforeEach((to, from, next) => {
  // 获取 token（不依赖 Pinia store，因为守卫可能在 store 初始化前执行）
  const token = localStorage.getItem('auth_token')
  const isLoggedIn = !!token

  // 需要登录的页面
  if (to.meta.requiresAuth && !isLoggedIn) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // 已登录用户访问登录页 → 重定向到首页
  if (to.meta.guestOnly && isLoggedIn) {
    return next({ name: 'home' })
  }

  next()
})

export default router