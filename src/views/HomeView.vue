<template>
  <div class="home-container">
    
    <div class="banner-wrapper">
      <div class="banner-content">
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
          <div v-for="ev in latestEvents" :key="ev.id" class="list-item event-style" @click="handleItemClick(ev)">
            <img :src="ev.image_url" class="item-thumb" referrerpolicy="no-referrer" @error="handleImgError"/>
            <div class="item-info">
              <h4 class="item-title">{{ ev.name }}</h4>
              <div class="item-meta">
                <span class="status-badge" :class="getEventStatus(ev).class">
                  {{ getEventStatus(ev).text }}
                </span>
                <span class="tag" :class="ev.category === '同人企划' ? 'proj-tag' : 'evt-tag'">{{ ev.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()

const latestGoods = ref([])
const latestEvents = ref([])
const loading = ref(true)

// 定义活动分类 (包含企划)
const EVENT_CATEGORIES = [
  '魔法未来', '雪未来', 'MIKU EXPO', '交响乐会', '演唱会', 
  '联动/咖啡厅', '展览/漫展', '线下活动', '同人活动', '企划', '同人企划'
]

onMounted(async () => {
  await fetchData()
})

// 🔥 核心修改：智能跳转逻辑
const handleItemClick = (item) => {
  if (item.category === '同人企划' || item.category === '企划') {
    // 如果是企划，去企划专用看板 /project/ID
    router.push(`/project/${item.id}`)
  } else if (item.link && item.link.startsWith('http')) {
    // 如果有外部链接且不是企划 (部分活动直接跳官网)
    window.open(item.link, '_blank')
  } else {
    // 默认去周边/Wiki详情页 /item/ID
    router.push(`/item/${item.id}`)
  }
}

const fetchData = async () => {
  loading.value = true
  
  // 1. 左边：查周边 (排除活动分类列表中的所有项)
  const { data: goods } = await supabase
    .from('items')
    .select('*')
    .not('category', 'in', `(${EVENT_CATEGORIES.map(c=>`"${c}"`).join(',')})`) 
    .eq('status', 'approved') 
    .order('created_at', { ascending: false }) 
    .limit(5)

  if (goods) latestGoods.value = goods

  // 2. 右边：查活动 (只查活动分类列表中的项)
  const { data: events } = await supabase
    .from('items')
    .select('*')
    .in('category', EVENT_CATEGORIES)
    .eq('status', 'approved')
    .order('created_at', { ascending: false }) 
    .limit(5)
  
  if (events) latestEvents.value = events
  
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

/* Banner */
.banner-wrapper { height: 200px; border-radius: 12px; overflow: hidden; position: relative; margin-bottom: 30px; background: #333; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.banner-bg { width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
.banner-text { position: absolute; bottom: 20px; left: 30px; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.banner-text h2 { margin: 0; font-size: 24px; }
.banner-text p { margin: 5px 0 0 0; opacity: 0.9; }

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