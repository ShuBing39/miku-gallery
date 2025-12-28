<script setup>
  import { onMounted } from 'vue'
  import { useUserStore } from '../../stores/userStore'
  import { useRouter } from 'vue-router'
  
  const userStore = useUserStore()
  const router = useRouter()
  
  // 退出登录
  const handleLogout = async () => {
    const confirm = window.confirm('确定要退出登录吗？')
    if (confirm) {
      await userStore.logout()
      router.push('/login')
    }
  }
  
  // 确保导航栏加载时，尝试获取一下用户信息（防止刷新后状态丢失）
  onMounted(() => {
    if (!userStore.user) {
      userStore.initialize()
    }
  })
  </script>
  
  <template>
    <nav class="home-nav">
      <div class="nav-content">
        <router-link to="/" class="logo">Miku-DB</router-link>
  
        <div class="nav-links">
          <router-link to="/">首页</router-link>
          <router-link to="/wiki">百科</router-link>
          <router-link to="/projects">企划</router-link>
          <router-link to="/events">活动</router-link>
          <router-link to="/group-buy-lobby">团购</router-link>
        </div>
  
        <div class="user-area">
          <div v-if="userStore.user" class="logged-in-view">
            <router-link to="/profile" class="profile-link">
              <img 
                v-if="userStore.profile?.avatar_url" 
                :src="userStore.profile.avatar_url" 
                class="nav-avatar" 
              />
              <span v-else class="default-avatar">👤</span>
              <span class="username">{{ userStore.profile?.username || '用户' }}</span>
            </router-link>
            <button @click="handleLogout" class="logout-btn">退出</button>
          </div>
  
          <div v-else class="guest-view">
            <router-link to="/login" class="login-btn">登录</router-link>
            <router-link to="/register" class="register-btn">注册</router-link>
          </div>
        </div>
      </div>
    </nav>
  </template>
  
  <style scoped>
  .home-nav {
    height: 64px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: center;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .nav-content {
    width: 1200px;
    max-width: 95%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .logo {
    font-weight: 800;
    font-size: 22px;
    color: #39C5BB;
    text-decoration: none;
    letter-spacing: -0.5px;
  }
  
  .nav-links {
    display: flex;
    gap: 30px;
  }
  
  .nav-links a {
    text-decoration: none;
    color: #555;
    font-size: 15px;
    font-weight: 500;
    transition: 0.2s;
    position: relative;
  }
  
  .nav-links a:hover, .nav-links a.router-link-active {
    color: #39C5BB;
  }
  
  /* 右侧用户区域 */
  .user-area {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  /* 未登录按钮样式 */
  .guest-view {
    display: flex;
    gap: 10px;
  }
  
  .login-btn {
    text-decoration: none;
    color: #666;
    font-size: 14px;
    padding: 8px 16px;
    border-radius: 20px;
    transition: 0.2s;
  }
  
  .login-btn:hover {
    background: #f5f5f5;
    color: #39C5BB;
  }
  
  .register-btn {
    text-decoration: none;
    background: #39C5BB;
    color: white;
    font-size: 14px;
    padding: 8px 20px;
    border-radius: 20px;
    font-weight: bold;
    transition: 0.2s;
  }
  
  .register-btn:hover {
    background: #2da8a0;
    transform: translateY(-1px);
  }
  
  /* 已登录样式 */
  .logged-in-view {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  .profile-link {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: #333;
    padding: 4px 10px;
    border-radius: 20px;
    transition: 0.2s;
  }
  
  .profile-link:hover {
    background: #f0f9f9;
  }
  
  .nav-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .default-avatar {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eee;
    border-radius: 50%;
  }
  
  .username {
    font-size: 14px;
    font-weight: bold;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .logout-btn {
    background: none;
    border: none;
    color: #999;
    font-size: 13px;
    cursor: pointer;
    padding: 4px 8px;
  }
  
  .logout-btn:hover {
    color: #ff4d4f;
    text-decoration: underline;
  }
  </style>