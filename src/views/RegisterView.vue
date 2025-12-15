<template>
    <div class="auth-container">
      <div class="auth-box">
        <h2>🚀 申请内测资格</h2>
        <p class="subtitle">Miku-DB 只有持有邀请码才可注册</p>
  
        <form @submit.prevent="handleRegister">
          <div class="input-group">
            <label>昵称 (ID)</label>
            <input v-model="username" type="text" placeholder="比如: 葱葱人" required />
          </div>
  
          <div class="input-group">
            <label>邮箱</label>
            <input v-model="email" type="email" placeholder="name@example.com" required />
          </div>
          
          <div class="input-group">
            <label>密码</label>
            <input v-model="password" type="password" placeholder="至少6位" required />
          </div>
  
          <div class="input-group">
            <label>🔑 内测邀请码</label>
            <input v-model="inviteCode" type="text" placeholder="请输入邀请码" class="code-input" required />
          </div>
  
          <button type="submit" :disabled="loading" class="submit-btn">
            {{ loading ? '正在验证并注册...' : '立即注册' }}
          </button>
        </form>
  
        <div v-if="errorMsg" class="error-box">{{ errorMsg }}</div>
        
        <div class="footer-link">
          已有账号？<router-link to="/login">去登录</router-link>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { createClient } from '@supabase/supabase-js'
  import { useRouter } from 'vue-router'
  
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  const router = useRouter()
  
  const username = ref('')
  const email = ref('')
  const password = ref('')
  const inviteCode = ref('')
  const loading = ref(false)
  const errorMsg = ref('')
  
  const handleRegister = async () => {
    loading.value = true
    errorMsg.value = ''
  
    // 调用 Supabase 注册接口
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        // ✨ 关键：把昵称和邀请码作为 metadata 传给数据库
        data: {
          username: username.value,
          invite_code: inviteCode.value
        }
      }
    })
  
    if (error) {
      // 这里的 error message 会包含我们 SQL 里 raise exception 的内容
      errorMsg.value = '注册失败: ' + error.message
    } else {
      alert('🎉 注册成功！请去邮箱确认链接，然后登录。')
      router.push('/login')
    }
    
    loading.value = false
  }
  </script>
  
  <style scoped>
  .auth-container { height: 100vh; display: flex; justify-content: center; align-items: center; background: #f0f9f9; }
  .auth-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 30px rgba(57, 197, 187, 0.15); width: 100%; max-width: 400px; }
  h2 { color: #39C5BB; text-align: center; margin: 0 0 10px 0; }
  .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 30px; }
  .input-group { margin-bottom: 15px; }
  .input-group label { display: block; font-size: 12px; color: #333; margin-bottom: 5px; font-weight: bold; }
  input { width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; box-sizing: border-box; transition: 0.3s; }
  input:focus { border-color: #39C5BB; outline: none; }
  .code-input { letter-spacing: 2px; font-family: monospace; font-weight: bold; color: #39C5BB; }
  .submit-btn { width: 100%; padding: 12px; background: #39C5BB; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 10px; transition: 0.2s; }
  .submit-btn:hover:not(:disabled) { background: #2da8a0; transform: translateY(-2px); }
  .submit-btn:disabled { opacity: 0.6; cursor: wait; }
  .error-box { background: #ffebee; color: #c62828; padding: 10px; border-radius: 6px; margin-top: 20px; font-size: 13px; text-align: center; }
  .footer-link { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
  .footer-link a { color: #39C5BB; text-decoration: none; font-weight: bold; }
  </style>