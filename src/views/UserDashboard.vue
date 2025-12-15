<template>
    <div class="dashboard-container">
      <div class="profile-card">
        <div class="avatar-placeholder">
          {{ userInitial }}
        </div>
        
        <h2 class="username">{{ username || '普通葱粉' }}</h2>
        <p class="email">{{ email }}</p>
        
        <div class="info-row">
          <span class="label">UID:</span>
          <span class="value">{{ userId }}</span>
        </div>
  
        <div class="action-buttons">
          <button @click="$router.push('/')" class="btn home-btn">🏠 返回首页</button>
          
          <button v-if="isAdmin" @click="$router.push('/admin')" class="btn admin-btn">
            ⚡ 管理员后台
          </button>
          
          <button @click="handleLogout" class="btn logout-btn">🚪 退出登录</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { createClient } from '@supabase/supabase-js'
  import { useRouter } from 'vue-router'
  
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  const router = useRouter()
  
  const email = ref('')
  const userId = ref('')
  const username = ref('')
  
  // 简单判断是否为管理员 (你可以换成你自己的邮箱)
  const isAdmin = computed(() => {
    // 这里填你注册时的管理员邮箱，用于显示后台按钮
    // 实际权限由 Supabase RLS 保护，这里只是前端显示控制
    return email.value === 'hatsunemiku39393@foxmail.com' 
  })
  
  const userInitial = computed(() => {
    return username.value ? username.value[0].toUpperCase() : (email.value[0] || '?').toUpperCase()
  })
  
  onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      email.value = user.email
      userId.value = user.id
      // 获取注册时存的 metadata
      username.value = user.user_metadata?.username || '未命名'
    }
  })
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }
  </script>
  
  <style scoped>
  .dashboard-container { min-height: 80vh; display: flex; justify-content: center; align-items: center; background: #f0f9f9; padding: 20px; }
  .profile-card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(57, 197, 187, 0.15); width: 100%; max-width: 400px; text-align: center; }
  .avatar-placeholder { width: 80px; height: 80px; background: #39C5BB; color: white; border-radius: 50%; font-size: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-weight: bold; }
  .username { color: #333; margin: 0 0 5px 0; }
  .email { color: #666; margin: 0 0 30px 0; font-size: 14px; }
  .info-row { background: #f5f5f5; padding: 10px; border-radius: 8px; margin-bottom: 30px; font-size: 12px; color: #666; font-family: monospace; word-break: break-all; }
  .action-buttons { display: flex; flex-direction: column; gap: 10px; }
  .btn { padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
  .home-btn { background: #e0f2f1; color: #00695c; }
  .admin-btn { background: #333; color: white; }
  .logout-btn { background: #ffebee; color: #c62828; }
  .btn:hover { transform: translateY(-2px); opacity: 0.9; }
  </style>