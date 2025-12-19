<template>
  <div class="app-wrapper">
    <div v-if="userStore.loading" class="global-loading">
      <div class="spinner"></div>
      <p>正在连接 Miku World...</p>
    </div>

    <router-view v-else />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from './stores/userStore'

const userStore = useUserStore()

onMounted(() => {
  // App 挂载时立即初始化用户状态
  userStore.initialize()
})
</script>

<style>
/* 全局样式 */
body { margin: 0; font-family: 'Segoe UI', sans-serif; background-color: #f0f2f5; }

.global-loading {
  position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
  background: white; z-index: 9999;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.spinner {
  width: 50px; height: 50px; border: 5px solid #eee;
  border-top-color: #39C5BB; border-radius: 50%;
  animation: spin 1s linear infinite; margin-bottom: 20px;
}
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>