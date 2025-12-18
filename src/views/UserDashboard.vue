<template>
  <div class="dashboard-container">
    <div class="floating-nav left">
      <button @click="$router.push('/')">🏠</button>
      <button @click="$router.go(-1)">⬅</button>
    </div>

    <div class="profile-header">
      <div class="avatar-section">
        <img v-if="userStore.profile?.avatar_url" :src="userStore.profile.avatar_url" class="avatar-img">
        <div v-else class="avatar-placeholder">{{ userInitial }}</div>
      </div>
      
      <div class="info-section">
        <div class="name-row">
          <h2>{{ userStore.profile?.username || userStore.user?.user_metadata?.username || '未命名用户' }}</h2>
          <span class="uid-tag">UID: {{ userStore.profile?.uid || '---' }}</span>
        </div>
        
        <p class="email-text">{{ userStore.user?.email }}</p>
        
        <div class="badges">
          <span class="badge">Vocaloid P</span>
          <span class="badge">收藏家</span>
        </div>
      </div>
      
      <div class="action-section">
        <button class="admin-btn" @click="$router.push('/admin')">👑 进入管理后台</button>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card"><h3>📦</h3><p>我的收藏</p></div>
      <div class="stat-card"><h3>📅</h3><p>参与活动</p></div>
      <div class="stat-card"><h3>🎫</h3><p>我的票务</p></div>
      <div class="stat-card" @click="$router.push('/circle')"><h3>🤝</h3><p>我的社团</p></div>
    </div>

    <div class="content-section">
      <h3>我的投稿</h3>
      <p style="color:#999; text-align:center; padding:20px;">暂无投稿记录</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const userStore = useUserStore()

// 确保进入页面时 profile 已加载
onMounted(() => {
  if (!userStore.profile && userStore.user) {
    userStore.initialize()
  }
})

const userInitial = computed(() => {
  const name = userStore.profile?.username || userStore.user?.user_metadata?.username || 'User'
  return name.charAt(0).toUpperCase()
})

const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.dashboard-container { max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: sans-serif; }
.floating-nav { position: fixed; bottom: 30px; left: 20px; display: flex; flex-direction: column; gap: 10px; }
.floating-nav button { width: 40px; height: 40px; border-radius: 50%; border: none; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); cursor: pointer; font-size: 20px; }

.profile-header { display: flex; align-items: center; gap: 30px; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(57, 197, 187, 0.1); margin-bottom: 30px; }
.avatar-placeholder { width: 80px; height: 80px; background: #39C5BB; color: white; font-size: 32px; font-weight: bold; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.avatar-img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #39C5BB; }

.info-section { flex: 1; }
.name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
.name-row h2 { margin: 0; color: #333; }

/* UID 样式 */
.uid-tag { font-size: 12px; background: #f0f0f0; color: #666; padding: 2px 6px; border-radius: 4px; font-family: monospace; letter-spacing: 0.5px; border: 1px solid #ddd; }

.email-text { margin: 0; color: #888; font-size: 14px; }
.badges { display: flex; gap: 8px; margin-top: 10px; }
.badge { background: #e0f2f1; color: #00695c; padding: 2px 8px; border-radius: 4px; font-size: 12px; }

.action-section { display: flex; flex-direction: column; gap: 10px; }
.admin-btn { background: #673ab7; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.admin-btn:hover { background: #5e35b1; transform: translateY(-2px); }
.logout-btn { background: white; border: 1px solid #ffcdd2; color: #ef5350; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
.logout-btn:hover { background: #ffebee; }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
.stat-card { background: white; padding: 20px; border-radius: 12px; text-align: center; cursor: pointer; transition: 0.2s; border: 1px solid #eee; }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
.stat-card h3 { margin: 0; font-size: 24px; margin-bottom: 5px; }
.stat-card p { margin: 0; font-size: 13px; color: #666; }

.content-section { background: white; padding: 20px; border-radius: 12px; min-height: 200px; border: 1px solid #eee; }
.content-section h3 { margin-top: 0; border-left: 4px solid #39C5BB; padding-left: 10px; color: #333; }
</style>