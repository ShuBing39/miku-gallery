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
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (error) {
    errorMsg.value = '登录失败: ' + error.message
  } else {
    // ✨ 改动：登录成功后，跳回首页，而不是直接去 admin
    router.push('/')
  }
  loading.value = false
}
</script>

<style scoped>
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