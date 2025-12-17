<template>
  <div class="home-container">
    
    <div class="banner-wrapper">
      <div v-if="banners.length > 0" class="carousel-container">
        <div 
          v-for="(b, index) in banners" 
          :key="b.id" 
          class="banner-slide" 
          :class="{ active: index === activeIndex }"
          :style="{ backgroundImage: `url(${b.image_url})` }"
          @click="handleBannerClick(b)"
        >
          <div v-if="b.title || b.description" class="banner-text">
            <h2 v-if="b.title">{{ b.title }}</h2>
            <p v-if="b.description">{{ b.description }}</p>
          </div>
        </div>
        
        <div class="indicators">
          <span 
            v-for="(b, idx) in banners" 
            :key="idx" 
            :class="{ active: idx === activeIndex }"
            @click="activeIndex = idx"
          ></span>
        </div>
      </div>

      <div v-else class="banner-content default-banner">
        <img src="https://ec.crypton.co.jp/pages/prod/vocaloid/img/main_mikuv4x_b.png" class="banner-bg" />
        <div class="banner-text">
          <h2>Miku Expo 10th Anniversary</h2>
          <p>庆祝初音未来世界巡演十周年</p>
        </div>
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
        <p>加入创作、为爱发电</p>
      </div>
      <div class="nav-card profile-card" @click="$router.push('/profile')">
        <div class="icon">👤</div>
        <h3>个人中心</h3>
        <p>社团 / 历史管理</p>
      </div>
    </div>

    <div class="content-split">
      
      <div class="section-col">
        <div class="section-header">
          <h3>✨ 最新收录周边</h3>
          <span class="more-link" @click="$router.push('/wiki')">查看更多 ></span>
        </div>
        
        <div v-if="loading" class="loading-skel">加载中...</div>
        <div v-else class="item-list">
          <div v-for="item in latestGoods" :key="item.id" class="list-item" @click="handleItemClick(item)">
            <img :src="item.image_url" class="item-thumb" referrerpolicy="no-referrer" @error="handleImgError"/>
            <div class="item-info">
              <h4 class="item-title">{{ item.name }}</h4>
              <div class="item-meta">
                <span class="date">{{ item.release_date }}</span>
                <span class="tag cat">{{ item.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-col">
        <div class="section-header">
          <h3>📡 最新活动/企划</h3>
          <span class="more-link" @click="$router.push('/events')">全部情报 ></span>
        </div>

        <div v-if="loading" class="loading-skel">加载中...</div>
        <div v-else class="item-list">
          <div v-for="ev in mixedEvents" :key="ev.uniqueId" class="list-item event-style" @click="handleItemClick(ev)">
            <img :src="ev.image_url" class="item-thumb" referrerpolicy="no-referrer" @error="handleImgError"/>
            <div class="item-info">
              <h4 class="item-title">{{ ev.name }}</h4>
              <div class="item-meta">
                <span class="status-badge" :class="ev.statusClass">{{ ev.statusText }}</span>
                <span class="tag" :class="ev.isProject ? 'proj-tag' : 'evt-tag'">{{ ev.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()

const latestGoods = ref([])
const mixedEvents = ref([]) // 混合数据源
const loading = ref(true)

// 轮播图
const banners = ref([])
const activeIndex = ref(0)
let timer = null

// 定义活动分类 (不含同人企划，因为同人企划现在从 projects 表取)
const OFFICIAL_EVENT_CATEGORIES = ['魔法未来', '雪未来', 'MIKU EXPO', '交响乐会', '演唱会', '联动/咖啡厅', '展览/漫展', '线下活动', '同人活动']

onMounted(async () => {
  await Promise.all([fetchData(), fetchBanners()])
  startCarousel()
})

onUnmounted(() => {
  if(timer) clearInterval(timer)
})

const fetchBanners = async () => {
  const { data } = await supabase.from('home_banners').select('*').eq('is_active', true).order('sort_order', { ascending: false })
  if (data) banners.value = data
}

const startCarousel = () => {
  timer = setInterval(() => {
    if (banners.value.length > 1) {
      activeIndex.value = (activeIndex.value + 1) % banners.value.length
    }
  }, 5000)
}

const handleBannerClick = (b) => {
  if (b.link_url) {
    if (b.link_url.startsWith('http')) window.open(b.link_url, '_blank')
    else router.push(b.link_url)
  }
}

const handleItemClick = (item) => {
  if (item.isProject) {
    router.push(`/project/${item.id}`)
  } else if (item.link && item.link.startsWith('http')) {
    window.open(item.link, '_blank')
  } else {
    router.push(`/item/${item.id}`) // 或者是 events 详情，这里暂且跳 item
  }
}

const fetchData = async () => {
  loading.value = true
  
  // 1. 左边：查周边 (排除活动)
  const { data: goods } = await supabase.from('items').select('*')
    .not('category', 'in', `(${OFFICIAL_EVENT_CATEGORIES.map(c=>`"${c}"`).join(',')}, "同人企划", "企划")`) 
    .eq('status', 'approved').order('created_at', { ascending: false }).limit(5)
  if (goods) latestGoods.value = goods

  // 2. 右边：混合查询 (items 表的官方活动 + projects 表的新企划)
  const p1 = supabase.from('items').select('*').in('category', OFFICIAL_EVENT_CATEGORIES).eq('status', 'approved').order('created_at', { ascending: false }).limit(5)
  // 获取新企划 (projects 表)
  const p2 = supabase.from('projects').select('*').eq('allow_external', true).order('created_at', { ascending: false }).limit(5)

  const [res1, res2] = await Promise.all([p1, p2])
  
  let combined = []
  
  // 处理官方活动
  if (res1.data) {
    combined = res1.data.map(e => ({
      ...e,
      isProject: false,
      uniqueId: 'ev_' + e.id,
      statusClass: getEventStatus(e).class,
      statusText: getEventStatus(e).text
    }))
  }

  // 处理新企划 (映射字段以匹配显示)
  if (res2.data) {
    const projectsMapped = res2.data.map(p => ({
      id: p.id,
      name: p.name,
      image_url: p.image_url,
      category: '同人企划',
      created_at: p.created_at,
      isProject: true,
      uniqueId: 'pj_' + p.id,
      statusClass: p.recruit_status === 'recruiting' ? 'active' : 'ended',
      statusText: p.recruit_status === 'recruiting' ? '招募中' : (p.recruit_status === 'ongoing' ? '进行中' : '已结束')
    }))
    combined = [...combined, ...projectsMapped]
  }

  // 合并后按时间倒序
  combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  
  // 取前 6 个展示
  mixedEvents.value = combined.slice(0, 6)
  
  loading.value = false
}

const handleImgError = (e) => { e.target.src = 'https://via.placeholder.com/100x100?text=No+Img' }

const getEventStatus = (ev) => {
  const today = new Date().toISOString().split('T')[0]
  if (ev.release_date && today < ev.release_date) return { text: '即将开始', class: 'upcoming' }
  if (ev.event_end_date && today > ev.event_end_date) return { text: '已结束', class: 'ended' }
  return { text: '进行中', class: 'active' }
}
</script>

<style scoped>
.home-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; color: #333; }

/* 轮播图样式 */
.banner-wrapper { height: 380px; border-radius: 12px; overflow: hidden; position: relative; margin-bottom: 30px; background: #333; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.carousel-container { width: 100%; height: 100%; position: relative; }
.banner-slide { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0; transition: opacity 0.5s ease; cursor: pointer; }
.banner-slide.active { opacity: 1; z-index: 1; }
.banner-bg { width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
.banner-text { position: absolute; bottom: 30px; left: 40px; color: white; text-shadow: 0 2px 6px rgba(0,0,0,0.6); z-index: 2; max-width: 80%; }
.banner-text h2 { margin: 0; font-size: 32px; font-weight: bold; }
.banner-text p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; line-height: 1.5; }
.indicators { position: absolute; bottom: 20px; right: 30px; display: flex; gap: 10px; z-index: 3; }
.indicators span { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.4); cursor: pointer; transition: 0.3s; }
.indicators span.active { background: white; transform: scale(1.3); }

/* Nav Grid */
.nav-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 40px; }
@media (max-width: 768px) { .nav-grid { grid-template-columns: repeat(2, 1fr); } }

.nav-card { background: white; border: 1px solid #eee; border-radius: 12px; padding: 20px; cursor: pointer; transition: transform 0.2s; text-align: center; }
.nav-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
.icon { font-size: 24px; margin-bottom: 8px; }
.nav-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #333; }
.nav-card p { margin: 0; font-size: 11px; color: #888; }

.wiki-card { border-bottom: 3px solid #39c5bb; }
.event-card { border-bottom: 3px solid #8b5cf6; } 
.project-card { border-bottom: 3px solid #f472b6; }
.profile-card { border-bottom: 3px solid #fbbf24; }

/* Split Layout */
.content-split { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
@media (max-width: 768px) { .content-split { grid-template-columns: 1fr; } } 

.section-col { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
.section-header h3 { margin: 0; font-size: 18px; color: #2c3e50; border-left: 4px solid #39C5BB; padding-left: 10px; }
.more-link { font-size: 12px; color: #999; cursor: pointer; }
.more-link:hover { color: #39C5BB; }

/* List Items */
.item-list { display: flex; flex-direction: column; gap: 15px; }
.list-item { display: flex; gap: 15px; padding: 10px; border-radius: 8px; transition: 0.2s; cursor: pointer; border: 1px solid transparent; }
.list-item:hover { background: #f9f9f9; border-color: #eee; }
.item-thumb { width: 80px; height: 80px; border-radius: 6px; object-fit: cover; background: #eee; flex-shrink: 0; }

.item-info { flex: 1; display: flex; flex-direction: column; justify-content: space-around; }
.item-title { margin: 0; font-size: 14px; line-height: 1.4; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.item-meta { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-top: 5px; }

.date { color: #aaa; font-family: monospace; }
.tag { padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.tag.cat { background: #e3f2fd; color: #1565c0; }
.proj-tag { background: #f3e5f5; color: #7b1fa2; font-weight: bold; }
.evt-tag { background: #e0f2f1; color: #00695c; }

/* Event Styles */
.event-style .item-title { font-weight: bold; }
.status-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.status-badge.active { background: #e0f2f1; color: #00695c; }
.status-badge.upcoming { background: #fff3e0; color: #ef6c00; }
.status-badge.ended { background: #eee; color: #999; }
</style>