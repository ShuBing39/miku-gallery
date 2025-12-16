<template>
  <div class="portal-container">
    
    <div class="top-nav">
       <div v-if="user" class="user-welcome">
          你好, {{ user.user_metadata?.username || '管理员' }}
       </div>
       <router-link v-else to="/login" class="login-link">登录 / 注册</router-link>
    </div>

    <div class="carousel-section">
      <div class="carousel-wrapper" :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
        <div v-for="(slide, index) in banners" :key="index" class="slide">
          <img :src="slide.img" class="slide-img" />
          <div class="slide-content">
            <h2>{{ slide.title }}</h2>
          </div>
        </div>
      </div>
      <div class="indicators">
        <span v-for="(slide, index) in banners" :key="index" 
          :class="['dot', { active: currentSlide === index }]" 
          @click="currentSlide = index">
        </span>
      </div>
    </div>

    <div class="nav-grid">
      <div class="nav-card wiki-card" @click="$router.push('/wiki')">
        <div class="icon">📚</div>
        <h3>葱葱维基</h3>
        <p>查周边、看年份</p>
      </div>
      
      <div class="nav-card event-card" @click="$router.push('/events')">
        <div class="icon">📅</div>
        <h3>活动情报</h3>
        <p>魔法未来 / 线上 live</p>
      </div>

      <div class="nav-card project-card" @click="$router.push('/projects')">
        <div class="icon">🤝</div>
        <h3>企划大厅</h3>
        <p>发众筹、找画师</p>
      </div>

      <div class="nav-card submit-card" @click="$router.push('/profile')">
        <div class="icon">👤</div>
        <h3>个人中心</h3>
        <p>管理我的发布</p>
      </div>
    </div>

    <div class="latest-section">
      <h2 class="section-title">✨ 最新收录周边</h2>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase'

const user = ref(null)
const latestItems = ref([])
const loading = ref(true)

// === 轮播图逻辑 ===
const currentSlide = ref(0)
const banners = ref([
  { title: "魔法未来 Magical Mirai 2025 决定！", img: "https://magicalmirai.com/2024/images/top/main_visual.png" }, // 示例图，可换成动图
  { title: "Miku Expo 10th Anniversary", img: "https://mikuexpo.com/10th/assets/img/meta_thumb.jpg" },
  { title: "加入我们的同人企划！", img: "https://i.pinimg.com/originals/10/cc/83/10cc83636561f5580637df75e927514a.jpg" }
])
let timer = null

const startAutoPlay = () => {
  timer = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % banners.value.length
  }, 4000) // 4秒切换
}

onMounted(async () => {
  startAutoPlay()
  const { data: { user: u } } = await supabase.auth.getUser()
  user.value = u

  const { data } = await supabase.from('items').select('id, name, image_url, release_date').eq('status', 'approved').order('created_at', { ascending: false }).limit(4)
  if (data) latestItems.value = data
  loading.value = false
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.portal-container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
.top-nav { display: flex; justify-content: flex-end; font-size: 14px; margin-bottom: 10px; }
.login-link { color: #39c5bb; font-weight: bold; text-decoration: none; }
.user-welcome { color: #666; }

/* 轮播图样式 */
.carousel-section { position: relative; width: 100%; height: 200px; border-radius: 16px; overflow: hidden; margin-bottom: 30px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
.carousel-wrapper { display: flex; transition: transform 0.5s ease-in-out; height: 100%; }
.slide { min-width: 100%; position: relative; }
.slide-img { width: 100%; height: 100%; object-fit: cover; }
.slide-content { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; padding: 20px; }
.slide-content h2 { margin: 0; font-size: 1.2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.indicators { position: absolute; bottom: 10px; right: 20px; display: flex; gap: 8px; }
.dot { width: 8px; height: 8px; background: rgba(255,255,255,0.5); border-radius: 50%; cursor: pointer; }
.dot.active { background: white; transform: scale(1.2); }

/* 导航网格 */
.nav-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 40px; }
@media(min-width: 600px) { .nav-grid { grid-template-columns: repeat(4, 1fr); } }

.nav-card { background: white; border: 1px solid #eee; border-radius: 12px; padding: 20px; cursor: pointer; transition: transform 0.2s; text-align: center; }
.nav-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
.icon { font-size: 24px; margin-bottom: 8px; }
.nav-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #333; }
.nav-card p { margin: 0; font-size: 11px; color: #888; }
.wiki-card { border-bottom: 3px solid #39c5bb; }
.event-card { border-bottom: 3px solid #8b5cf6; } /* 紫色 */
.project-card { border-bottom: 3px solid #f472b6; }
.submit-card { border-bottom: 3px solid #fbbf24; }

/* 列表样式 */
.section-title { font-size: 1.2rem; margin-bottom: 15px; color: #444; border-left: 4px solid #39c5bb; padding-left: 10px; }
.items-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
.mini-card { display: flex; background: white; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; text-decoration: none; color: inherit; align-items: center; }
.mini-img { width: 50px; height: 50px; object-fit: cover; background: #eee; }
.mini-info { padding: 8px; flex: 1; overflow: hidden; }
.mini-title { font-size: 12px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-date { font-size: 10px; color: #999; }
</style>