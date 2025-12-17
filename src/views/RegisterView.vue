<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  // 👇 修改这里：从 supabase.js 引入，而不是就地创建
  import { supabase } from '../supabase' 
  
  const router = useRouter()
  // const supabase = createClient(...)  <-- 这一行删除
  
  // ... (其余代码保持不变)
  const username = ref('')
  const email = ref('')
  const password = ref('')
  const inviteCode = ref('')
  const loading = ref(false)
  const errorMsg = ref('')
  
  const handleRegister = async () => {
    loading.value = true
    errorMsg.value = ''
  
    try {
      if (password.value.length < 6) throw new Error('密码长度至少需要6位')
      
      // 调用注册
      const { data, error } = await supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: {
          data: {
            username: username.value.trim(),
            invite_code: inviteCode.value.trim() // 确保这里的变量名是 inviteCode
          }
        }
      })
  
      if (error) throw error
  
      alert('🎉 注册成功！\n请前往邮箱确认，然后登录。')
      router.push('/login')
  
    } catch (err) {
      console.error(err)
      // 如果是数据库抛出的错误，显示给用户
      errorMsg.value = err.message.replace('Database error saving new user', '验证失败')
    } finally {
      loading.value = false
    }
  }
  </script>
  
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