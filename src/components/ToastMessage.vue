<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast-overlay" @click.self="hide">
        <div class="toast-card" :class="type">
          <div class="toast-icon">{{ type === 'error' ? '⚠' : type === 'success' ? '✓' : 'ℹ' }}</div>
          <div class="toast-body">
            <p>{{ message }}</p>
          </div>
          <button class="toast-close" @click="hide">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch } from 'vue'
import { useRequest } from '../utils/request.js'

const { errorMessage, errorVisible, hideError } = useRequest()

defineProps({
  message: { type: String, default: '' },
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'error' },
})

const emit = defineEmits(['close'])
function hide() { emit('close') }

// 自动关闭
watch(errorVisible, (val) => {
  if (!val) hide()
})
</script>

<style scoped>
.toast-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20px;
  pointer-events: none;
}

.toast-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 16px;
  background: var(--panel-strong);
  border: 1px solid var(--rule);
  backdrop-filter: blur(30px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.5);
  max-width: 420px;
  pointer-events: all;
}

.toast-card.error { border-color: rgba(232,64,87,0.4); }
.toast-card.success { border-color: rgba(30,215,96,0.4); }

.toast-icon { font-size: 20px; flex-shrink: 0; }
.toast-body p { margin: 0; font-size: 14px; color: var(--ink); }
.toast-close {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 16px;
  flex-shrink: 0;
  cursor: pointer;
}
.toast-close:hover { color: var(--ink); }

.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateY(-20px); }
.toast-leave-to { opacity: 0; transform: translateY(-20px); }
</style>