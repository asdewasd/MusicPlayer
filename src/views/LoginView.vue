<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- 关闭按钮 -->
      <button class="close-btn" @click="$router.back()" aria-label="返回">✕</button>

      <!-- Logo -->
      <div class="auth-logo" @click="$router.push('/')">
        <span class="brand-mark">M</span>
        <div>
          <strong>MusicFlow</strong>
          <small>音乐播放器</small>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="auth-tabs">
        <button
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >登录</button>
        <button
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >注册</button>
      </div>

      <!-- 表单 -->
      <form @submit.prevent="handleSubmit" novalidate>
        <!-- 用户名 -->
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="请输入用户名"
            :class="{ error: errors.username }"
            @blur="validateField('username')"
          >
          <span v-if="errors.username" class="error-msg">{{ errors.username }}</span>
        </div>

        <!-- 邮箱（注册时显示） -->
        <div v-if="mode === 'register'" class="form-group">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="请输入邮箱地址"
            :class="{ error: errors.email }"
            @blur="validateField('email')"
          >
          <span v-if="errors.email" class="error-msg">{{ errors.email }}</span>
        </div>

        <!-- 密码 -->
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            :class="{ error: errors.password }"
            @blur="validateField('password')"
          >
          <span v-if="errors.password" class="error-msg">{{ errors.password }}</span>
        </div>

        <!-- 确认密码（注册时显示） -->
        <div v-if="mode === 'register'" class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            :class="{ error: errors.confirmPassword }"
            @blur="validateField('confirmPassword')"
          >
          <span v-if="errors.confirmPassword" class="error-msg">{{ errors.confirmPassword }}</span>
        </div>

        <!-- 服务器错误提示 -->
        <div v-if="serverError" class="server-error">{{ serverError }}</div>

        <!-- 提交按钮 -->
        <button type="submit" class="submit-btn" :disabled="submitting">
          <span v-if="submitting" class="spinner-sm"></span>
          {{ submitting ? '处理中...' : (mode === 'login' ? '登录' : '注册') }}
        </button>
      </form>

      <!-- 底部链接 -->
      <p class="auth-footer">
        {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
        <button class="link-btn" @click="switchMode(mode === 'login' ? 'register' : 'login')">
          {{ mode === 'login' ? '立即注册' : '去登录' }}
        </button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()
const mode = ref('login')
const submitting = ref(false)
const serverError = ref('')

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// 校验规则
const rules = {
  username: [
    { test: (v) => v.trim().length >= 2, msg: '用户名至少2个字符' },
    { test: (v) => v.trim().length <= 50, msg: '用户名最多50个字符' },
  ],
  email: [
    { test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: '请输入有效的邮箱地址' },
  ],
  password: [
    { test: (v) => v.length >= 6, msg: '密码至少6位' },
    { test: (v) => v.length <= 32, msg: '密码最多32位' },
  ],
  confirmPassword: [
    { test: (v) => v === form.password, msg: '两次输入的密码不一致' },
  ],
}

function validateField(field) {
  if (mode.value === 'login' && (field === 'email' || field === 'confirmPassword')) {
    errors[field] = ''
    return true
  }
  const fieldRules = rules[field]
  if (!fieldRules) return true
  for (const rule of fieldRules) {
    if (!rule.test(form[field])) {
      errors[field] = rule.msg
      return false
    }
  }
  errors[field] = ''
  return true
}

function validateAll() {
  const fields = mode.value === 'login'
    ? ['username', 'password']
    : ['username', 'email', 'password', 'confirmPassword']
  let valid = true
  for (const field of fields) {
    if (!validateField(field)) valid = false
  }
  return valid
}

function switchMode(m) {
  mode.value = m
  serverError.value = ''
  Object.keys(errors).forEach(k => errors[k] = '')
}

async function handleSubmit() {
  serverError.value = ''
  if (!validateAll()) return

  submitting.value = true
  try {
    if (mode.value === 'login') {
      await authStore.login(form.username.trim(), form.password)
    } else {
      await authStore.register(form.username.trim(), form.email.trim(), form.password)
    }
    router.push('/')
  } catch (err) {
    serverError.value = err.message || '操作失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 96px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.auth-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 40px 36px;
  border: 1px solid var(--rule);
  border-radius: 30px;
  background: var(--panel);
  backdrop-filter: blur(30px);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  border: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--muted);
  background: rgba(255,255,255,0.08);
  font-size: 14px;
  cursor: pointer;
}
.close-btn:hover {
  color: var(--ink);
  background: rgba(255,255,255,0.16);
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
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
  font-size: 20px;
  box-shadow: 0 18px 40px rgba(232,64,87,0.24);
}

.auth-logo strong, .auth-logo small { display: block; }
.auth-logo small { color: var(--muted); margin-top: 2px; font-size: 12px; }

/* Tabs */
.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 28px;
}

.auth-tabs button {
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 12px;
  background: transparent;
  color: var(--muted);
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
}

.auth-tabs button.active {
  color: var(--ink);
  border-bottom-color: var(--accent);
}

/* 表单 */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--muted);
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--rule);
  border-radius: 14px;
  background: rgba(255,255,255,0.06);
  color: var(--ink);
  font-size: 15px;
  outline: 0;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: rgba(255,255,255,0.3);
}

.form-group input.error {
  border-color: var(--accent);
}

.error-msg {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--accent);
}

.server-error {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(232,64,87,0.12);
  color: var(--accent);
  font-size: 14px;
  margin-bottom: 16px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), #ff6b81);
  color: var(--ink);
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.submit-btn:disabled { opacity: 0.6; cursor: default; }

.spinner-sm {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--muted);
  font-size: 14px;
}

.link-btn {
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
}
.link-btn:hover { text-decoration: underline; }

@media (max-width: 640px) {
  .auth-card { padding: 28px 24px; border-radius: 24px; }
}
</style>