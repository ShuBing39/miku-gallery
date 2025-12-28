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
      <div class="links"><router-link to="/register">去注册</router-link></div>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/userStore' // 使用 Store

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''
  
  try {
    // 1. 调用 Store 的登录
    await userStore.login(email.value, password.value)
    
    // 2. 成功后，强制刷新 store 状态（双重保险）
    await userStore.initialize()

    // 3. 跳转
    const redirectPath = route.query.redirect || '/'
    console.log('登录成功，跳转至:', redirectPath)
    router.push(redirectPath)
    
  } catch (error) {
    errorMsg.value = '登录失败: ' + error.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container { height: 100vh; display: flex; justify-content: center; align-items: center; background: #f0f2f5; }
.login-box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 400px; text-align: center; }
input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
button { width: 100%; padding: 12px; background: #39C5BB; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.error { color: red; margin-top: 10px; }
.links { margin-top: 15px; }
.links a { color: #666; }
</style>