<template>
  <teleport to="body">
    <div v-if="visible" class="login-modal-overlay" @click="handleOverlayClick">
      <div class="login-modal-card" @click.stop>
        <div class="modal-header">
          <h3>{{ mode === 'login' ? '登录' : '注册' }}</h3>
          <button class="close-btn" @click="close">✕</button>
        </div>

        <!-- Tab 切换 -->
        <div class="auth-tabs">
          <button :class="{ active: mode === 'login' }" @click="switchMode('login')">登录</button>
          <button :class="{ active: mode === 'register' }" @click="switchMode('register')">注册</button>
        </div>

        <form @submit.prevent="handleSubmit" novalidate>
          <div class="form-group">
            <label for="m-username">用户名</label>
            <input id="m-username" v-model="form.username" type="text" placeholder="请输入用户名" :class="{ error: errors.username }" @blur="validateField('username')">
            <span v-if="errors.username" class="error-msg">{{ errors.username }}</span>
          </div>

          <div v-if="mode === 'register'" class="form-group">
            <label for="m-email">邮箱</label>
            <input id="m-email" v-model="form.email" type="email" placeholder="请输入邮箱地址" :class="{ error: errors.email }" @blur="validateField('email')">
            <span v-if="errors.email" class="error-msg">{{ errors.email }}</span>
          </div>

          <div class="form-group">
            <label for="m-password">密码</label>
            <input id="m-password" v-model="form.password" type="password" placeholder="请输入密码（至少6位）" :class="{ error: errors.password }" @blur="validateField('password')">
            <span v-if="errors.password" class="error-msg">{{ errors.password }}</span>
          </div>

          <div v-if="mode === 'register'" class="form-group">
            <label for="m-confirm">确认密码</label>
            <input id="m-confirm" v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" :class="{ error: errors.confirmPassword }" @blur="validateField('confirmPassword')">
            <span v-if="errors.confirmPassword" class="error-msg">{{ errors.confirmPassword }}</span>
          </div>

          <div v-if="serverError" class="server-error">{{ serverError }}</div>

          <button type="submit" class="submit-btn" :disabled="submitting">
            <span v-if="submitting" class="spinner-sm"></span>
            {{ submitting ? '处理中...' : (mode === 'login' ? '登录' : '注册') }}
          </button>
        </form>

        <p class="auth-footer">
          {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
          <button class="link-btn" @click="switchMode(mode === 'login' ? 'register' : 'login')">
            {{ mode === 'login' ? '立即注册' : '去登录' }}
          </button>
        </p>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()

const props = defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'login-success'])

const mode = ref('login')
const submitting = ref(false)
const serverError = ref('')

const form = reactive({ username: '', email: '', password: '', confirmPassword: '' })
const errors = reactive({ username: '', email: '', password: '', confirmPassword: '' })

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
  if (mode.value === 'login' && (field === 'email' || field === 'confirmPassword')) { errors[field] = ''; return true }
  const fr = rules[field]
  if (!fr) return true
  for (const r of fr) { if (!r.test(form[field])) { errors[field] = r.msg; return false } }
  errors[field] = ''
  return true
}

function validateAll() {
  const fields = mode.value === 'login' ? ['username', 'password'] : ['username', 'email', 'password', 'confirmPassword']
  let valid = true
  for (const f of fields) { if (!validateField(f)) valid = false }
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
    emit('login-success')
    close()
  } catch (err) {
    serverError.value = err.message || '操作失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

function handleOverlayClick() { close() }
function close() { emit('close') }
</script>

<style scoped>
.login-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}

.login-modal-card {
  width: 100%;
  max-width: 420px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 32px 30px;
  border: 1px solid var(--rule);
  border-radius: 24px;
  background: var(--panel);
  backdrop-filter: blur(30px);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.modal-header h3 { margin: 0; font-size: 20px; }
.close-btn {
  border: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--muted);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  font-size: 14px;
}
.close-btn:hover { color: var(--ink); background: rgba(255,255,255,0.16); }

.auth-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; }
.auth-tabs button {
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 15px;
  font-weight: 600;
}
.auth-tabs button.active { color: var(--ink); border-bottom-color: var(--accent); }

.form-group { margin-bottom: 18px; }
.form-group label { display: block; margin-bottom: 5px; font-size: 13px; color: var(--muted); }
.form-group input {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid var(--rule);
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  color: var(--ink);
  font-size: 14px;
  outline: 0;
}
.form-group input:focus { border-color: rgba(255,255,255,0.3); }
.form-group input.error { border-color: var(--accent); }

.error-msg { display: block; margin-top: 4px; font-size: 12px; color: var(--accent); }

.server-error {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(232,64,87,0.12);
  color: var(--accent);
  font-size: 13px;
  margin-bottom: 14px;
}

.submit-btn {
  width: 100%;
  padding: 13px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), #ff6b81);
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}
.submit-btn:disabled { opacity: 0.6; cursor: default; }

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-footer { text-align: center; margin-top: 20px; color: var(--muted); font-size: 13px; }
.link-btn { border: 0; background: transparent; color: var(--accent); font-size: 13px; cursor: pointer; }
.link-btn:hover { text-decoration: underline; }
</style>