<template>
  <div class="login-container">
    <div class="login-box">
      <h2>🔐 登录 Miku-DB</h2>
      <form @submit.prevent="handleLogin">
        <input v-model="email" type="email" placeholder="邮箱" required />
        <input v-model="password" type="password" placeholder="密码" required />
        <button type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      
      <div class="links">
        <router-link to="/register">还没有账号？去注册内测资格</router-link>
      </div>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/userStore' // ✅ 使用 Store，更规范

const router = useRouter()
const route = useRoute()
const userStore = useUserStore() // 获取 Store 实例

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''
  
  try {
    // ✅ 调用 userStore 里的登录动作，逻辑更集中
    await userStore.login(email.value, password.value)
    
    // 登录成功后的跳转逻辑
    const redirectPath = route.query.redirect || '/'
    router.push(redirectPath)
  } catch (error) {
    errorMsg.value = '登录失败: ' + error.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 样式保持不变 */
.login-container { height: 100vh; display: flex; justify-content: center; align-items: center; background-color: #f0f2f5; }
.login-box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
h2 { color: #39C5BB; margin-bottom: 20px; }
input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
button { width: 100%; padding: 12px; background: #39C5BB; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
button:disabled { opacity: 0.7; }
.links { margin-top: 15px; font-size: 14px; }
.links a { color: #666; text-decoration: none; }
.links a:hover { color: #39C5BB; text-decoration: underline; }
.error { color: red; margin-top: 10px; font-size: 14px; }
</style>