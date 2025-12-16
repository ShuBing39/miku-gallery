<template>
  <div class="portal-container">
    
    <div class="top-nav">
       <div v-if="user" class="user-welcome">
          你好, {{ user.user_metadata?.username || '用户' }}
       </div>
       <router-link v-else to="/login" class="login-link">登录 / 注册</router-link>
    </div>

    <div class="hero-section">
      <div class="hero-content">
        <h1>葱葱维基</h1>
        <p>连接每一份热爱，记录每一个感动。</p>
      </div>
    </div>

    <div class="nav-grid">
      <div class="nav-card wiki-card" @click="$router.push('/wiki')">
        <div class="icon">📚</div>
        <h3>葱葱维基</h3>
        <p>查周边、看年份、补图鉴</p>
      </div>
      
      <div class="nav-card project-card" @click="$router.push('/projects')">
        <div class="icon">🤝</div>
        <h3>企划大厅</h3>
        <p>发众筹、找画师、组团购</p>
      </div>

      <div class="nav-card submit-card" @click="$router.push('/profile')">
        <div class="icon">👤</div>
        <h3>个人中心</h3>
        <p>管理我的发布和收藏</p>
      </div>
    </div>

    <div class="latest-section">
      <h2 class="section-title">✨ 最新收录</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="items-list">
        <router-link v-for="item in latestItems" :key="item.id" :to="'/item/' + item.id" class="mini-card">
          <img :src="item.image_url" class="mini-img" />
          <div class="mini-info">
            <div class="mini-title">{{ item.name }}</div>
            <div class="mini-date">{{ item.release_date }}</div>
          </div>
        </router-link>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const user = ref(null)
const latestItems = ref([])
const loading = ref(true)

onMounted(async () => {
  // 获取用户信息
  const { data: { user: u } } = await supabase.auth.getUser()
  user.value = u

  // 获取最新的4个周边
  const { data } = await supabase
    .from('items')
    .select('id, name, image_url, release_date')
    .eq('status', 'approved')
    .order('created_at', { ascending: false }) // 按录入时间倒序
    .limit(4)
  
  if (data) latestItems.value = data
  loading.value = false
})
</script>

<style scoped>
.portal-container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif; }

.top-nav { display: flex; justify-content: flex-end; font-size: 14px; margin-bottom: 20px; }
.login-link { color: #39c5bb; font-weight: bold; text-decoration: none; }
.user-welcome { color: #666; }

/* 宣传栏 */
.hero-section { 
  background: linear-gradient(135deg, #39c5bb 0%, #a7f3d0 100%); 
  border-radius: 16px; padding: 40px 20px; text-align: center; color: white; margin-bottom: 30px;
  box-shadow: 0 8px 20px rgba(57, 197, 187, 0.3);
}
.hero-content h1 { margin: 0; font-size: 2.5rem; letter-spacing: 2px; }
.hero-content p { margin-top: 10px; opacity: 0.9; font-size: 1.1rem; }

/* 导航网格 */
.nav-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
.nav-card { 
  background: white; border: 1px solid #eee; border-radius: 12px; padding: 20px; cursor: pointer; 
  transition: transform 0.2s, box-shadow 0.2s; text-align: center;
}
.nav-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
.icon { font-size: 30px; margin-bottom: 10px; }
.nav-card h3 { margin: 0 0 5px 0; color: #333; }
.nav-card p { margin: 0; font-size: 12px; color: #888; }
.wiki-card { border-bottom: 4px solid #39c5bb; }
.project-card { border-bottom: 4px solid #f472b6; }
.submit-card { border-bottom: 4px solid #fbbf24; }

/* 最新更新 */
.section-title { font-size: 1.2rem; margin-bottom: 15px; color: #444; border-left: 4px solid #39c5bb; padding-left: 10px; }
.items-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
.mini-card { display: flex; background: white; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; text-decoration: none; color: inherit; align-items: center; }
.mini-img { width: 60px; height: 60px; object-fit: cover; background: #eee; }
.mini-info { padding: 10px; flex: 1; overflow: hidden; }
.mini-title { font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-date { font-size: 11px; color: #999; margin-top: 4px; }
.loading { text-align: center; color: #999; padding: 20px; }
</style>