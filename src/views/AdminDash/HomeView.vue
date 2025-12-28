<template>
  <div class="home-container">
    <div class="banner-wrapper">
      <div v-if="banners.length > 0" class="carousel-container">
        <div 
          v-for="(b, index) in banners" 
          :key="b.id" 
          class="banner-slide" 
          :class="{ active: index === activeIndex }"
          :style="{ backgroundImage: `url(${fixUrl(b.image_url)})` }"
          @click="handleBannerClick(b)"
        >
          <div v-if="b.title || b.description" class="banner-text">
            <h2 v-if="b.title">{{ b.title }}</h2>
            <p v-if="b.description">{{ b.description }}</p>
          </div>
        </div>
        <div class="indicators">
          <span v-for="(b, idx) in banners" :key="idx" :class="{ active: idx === activeIndex }" @click="activeIndex = idx"></span>
        </div>
      </div>
      <div v-else class="banner-content default-banner">
        <img src="https://ec.crypton.co.jp/pages/prod/vocaloid/img/main_mikuv4x_b.png" class="banner-bg" />
        <div class="banner-text"><h2>Miku World</h2><p>Loading...</p></div>
      </div>
    </div>

    <div class="hero-search-section">
      <div class="search-wrap">
        <input v-model="homeSearch" @keyup.enter="goToEncyclopedia" placeholder="💡 搜搜葱葱百科！(如: 应援棒、门票)" />
        <button @click="goToEncyclopedia">🔍 搜索百科</button>
      </div>
      <div class="hero-actions">
        <button class="btn-hero-action" @click="$router.push('/submit-project')">📢 发起企划</button>
        <button class="btn-hero-action primary" @click="$router.push('/submit-group-buy')">📦 我要开团</button>
      </div>
    </div>

    <div class="nav-grid">
      <div class="nav-card wiki-card" @click="$router.push('/wiki')"><div class="icon">📚</div><h3>葱葱维基</h3><p>查周边、看年份</p></div>
      <div class="nav-card gb-card" @click="$router.push('/group-buy-lobby')"><div class="icon">🛍️</div><h3>拼团代购</h3><p>吃谷、拼团回血</p></div>
      <div class="nav-card kb-card" @click="$router.push('/encyclopedia')"><div class="icon">📖</div><h3>葱葱百科</h3><p>知识科普、攻略</p></div>
      <div class="nav-card event-card" @click="$router.push('/events')"><div class="icon">📅</div><h3>活动情报</h3><p>魔法未来 / Live</p></div>
      <div class="nav-card ticket-card" @click="$router.push('/tickets')"><div class="icon">🎫</div><h3>票务中心</h3><p>门票转让、交换</p></div>
      <div class="nav-card project-card" @click="$router.push('/projects')"><div class="icon">🤝</div><h3>企划大厅</h3><p>加入创作</p></div>
      <div class="nav-card profile-card" @click="$router.push('/profile')"><div class="icon">👤</div><h3>个人中心</h3><p>管理我的发布</p></div>
    </div>

    <div class="content-split">
      <div class="section-col">
        <div class="section-header"><h3>✨ 最新收录周边</h3><span class="more-link" @click="$router.push('/wiki')">查看更多 ></span></div>
        <div v-if="loading" class="loading-skel">加载中...</div>
        <div v-else class="item-list">
          <div v-for="item in latestGoods" :key="item.id" class="list-item" @click="handleItemClick(item)">
            <img :src="fixUrl(item.image_url)" class="item-thumb" referrerpolicy="no-referrer" @error="handleImgError"/>
            <div class="item-info">
              <h4 class="item-title">{{ item.name }}</h4>
              <div class="item-meta">
                <span class="date">{{ formatDate(item.release_date || item.created_at) }}</span>
                <span class="tag cat">{{ item.category || '周边' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="section-col">
        <div class="section-header"><h3>📡 最新活动/企划</h3><span class="more-link" @click="$router.push('/events')">全部情报 ></span></div>
        <div v-if="loading" class="loading-skel">加载中...</div>
        <div v-else class="item-list">
          <div v-for="ev in mixedEvents" :key="ev.uniqueId" class="list-item event-style" @click="handleItemClick(ev)">
            <img :src="fixUrl(ev.image_url)" class="item-thumb" referrerpolicy="no-referrer" @error="handleImgError"/>
            <div class="item-info">
              <h4 class="item-title">{{ ev.name }}</h4>
              <div class="item-meta">
                <span class="status-badge" :class="ev.statusClass">{{ ev.statusText }}</span>
                <span class="tag" :class="ev.isProject ? 'proj-tag' : 'evt-tag'">{{ ev.category || '活动' }}</span>
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
import { useRouter } from 'vue-router'
import { supabase } from '../../services/supabase'
import { formatDate, handleImgError, fixUrl } from '../../utils/formatters'

const router = useRouter()
const latestGoods = ref([])
const mixedEvents = ref([])
const loading = ref(true)
const banners = ref([])
const activeIndex = ref(0)
const homeSearch = ref('')
let timer = null

// 官方活动关键词
const OFFICIAL_EVENT_CATEGORIES = ['魔法未来', '雪未来', 'MIKU EXPO', '交响乐会', '演唱会', '联动/咖啡厅', '展览/漫展', '线下活动', '同人活动']

onMounted(() => {
  loading.value = true
  fetchBanners().then(data => {
    banners.value = data
    startCarousel()
  })
  fetchData().finally(() => {
    loading.value = false
  })
})

onUnmounted(() => { if(timer) clearInterval(timer) })

const goToEncyclopedia = () => { if (homeSearch.value.trim()) { router.push({ path: '/encyclopedia', query: { q: homeSearch.value.trim() } }) } else { router.push('/encyclopedia') } }
const handleBannerClick = (b) => { if (b.link_url) { if (b.link_url.startsWith('http')) window.open(b.link_url, '_blank'); else router.push(b.link_url) } }
const handleItemClick = (item) => { if (item.isProject) { router.push(`/project/${item.id}`) } else if (item.link && item.link.startsWith('http')) { window.open(item.link, '_blank') } else { router.push(`/item/${item.id}`) } }

// 辅助函数：根据日期判断状态 (增加了容错，防止日期字段缺失报错)
const getEventStatus = (ev) => {
  // 如果是企划
  if (ev.isProject) {
    if (ev.recruit_status === 'recruiting') return { text: '招募中', class: 'active' }
    if (ev.recruit_status === 'ended') return { text: '已结束', class: 'ended' }
    return { text: '进行中', class: 'active' }
  }
  
  // 如果是活动，且有日期字段
  if (ev.release_date || ev.event_end_date) {
    const today = new Date().toISOString().split('T')[0]
    if (ev.release_date && today < ev.release_date) return { text: '即将开始', class: 'upcoming' }
    if (ev.event_end_date && today > ev.event_end_date) return { text: '已结束', class: 'ended' }
  }
  
  return { text: '进行中', class: 'active' }
}

const fetchBanners = async () => { 
  // 使用 select('*') 避免因缺少 sort_order 等特定字段报错
  const { data } = await supabase.from('home_banners').select('*')
  // 如果有 sort_order 字段，就在前端排序；如果没有，就原样返回
  if (data && data.length > 0 && data[0].sort_order !== undefined) {
    return data.sort((a, b) => b.sort_order - a.sort_order)
  }
  return data || [] 
}

const startCarousel = () => { 
  timer = setInterval(() => { if (banners.value.length > 1) { activeIndex.value = (activeIndex.value + 1) % banners.value.length } }, 5000) 
}

// ✅ 核心修改：安全获取数据逻辑
const fetchData = async () => {
  try {
    // 1. 获取周边：使用 select('*') 获取所有存在的列
    const { data: rawItems, error: err1 } = await supabase
      .from('items')
      .select('*') 
      .order('created_at', { ascending: false })
      .limit(50) // 多取一点，以便在前端过滤

    if (err1) throw err1

    if (rawItems) {
      // 在前端进行过滤，而不是在数据库查询时过滤
      // 这样如果 status 列不存在，item.status 就是 undefined，代码不会崩，只会显示所有数据
      let filtered = rawItems.filter(i => {
        // 如果 category 是活动类，排除
        if (OFFICIAL_EVENT_CATEGORIES.includes(i.category)) return false
        // 如果 category 是企划类，排除
        if (i.category === '同人企划' || i.category === '企划') return false
        
        // 如果数据库里真的有 status 列，且不是 approved，排除
        // 如果没有 status 列 (undefined)，则默认通过 (避免新库空数据不显示)
        if (i.status && i.status !== 'approved') return false
        
        return true
      })
      latestGoods.value = filtered.slice(0, 5)
    }

    // 2. 获取活动
    const p1 = supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    // 3. 获取企划
    const p2 = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    const [res1, res2] = await Promise.all([p1, p2])

    let combined = []

    // 处理活动数据
    if (res1.data) {
      const events = res1.data.filter(e => {
        // 只保留活动类别
        if (!OFFICIAL_EVENT_CATEGORIES.includes(e.category)) return false
        // 如果有 status 字段则检查，没有则忽略
        if (e.status && e.status !== 'approved') return false
        return true
      })
      
      combined = events.map(e => ({ 
        ...e, 
        isProject: false, 
        uniqueId: 'ev_' + e.id, 
        statusClass: getEventStatus(e).class, 
        statusText: getEventStatus(e).text 
      }))
    }

    // 处理企划数据
    if (res2.data) {
      const projects = res2.data.filter(p => {
        // 如果有 allow_external 字段则检查
        if (p.allow_external === false) return false
        // 如果有 recruit_status 字段则检查
        if (p.recruit_status === 'ended') return false
        return true
      })

      const projectsMapped = projects.map(p => ({ 
        id: p.id, 
        name: p.name, 
        image_url: p.image_url, 
        category: '同人企划', 
        created_at: p.created_at, 
        isProject: true, 
        uniqueId: 'pj_' + p.id, 
        // 传递原始字段以便 getEventStatus 使用
        recruit_status: p.recruit_status, 
        statusClass: getEventStatus({...p, isProject: true}).class, 
        statusText: getEventStatus({...p, isProject: true}).text 
      }))
      combined = [...combined, ...projectsMapped] 
    }

    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    mixedEvents.value = combined.slice(0, 6)

  } catch (err) {
    console.error('Home fetchData safe mode error:', err)
  }
}
</script>

<style scoped>
/* 样式完全保留 */
.home-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; color: #333; }
.hero-search-section { margin-bottom: 30px; display: flex; flex-direction: column; align-items: center; gap: 15px; }
.search-wrap { display: flex; width: 100%; max-width: 700px; box-shadow: 0 8px 25px rgba(57, 197, 187, 0.15); border-radius: 40px; background: white; padding: 5px; border: 2px solid #e0f2f1; transition: 0.3s; }
.search-wrap:hover { box-shadow: 0 10px 30px rgba(57, 197, 187, 0.25); }
.search-wrap input { flex: 1; border: none; outline: none; padding: 15px 25px; font-size: 16px; border-radius: 40px; background: transparent; }
.search-wrap button { background: #39C5BB; color: white; border: none; padding: 0 35px; border-radius: 40px; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; }
.hero-actions { display: flex; gap: 15px; }
.btn-hero-action { padding: 8px 20px; border-radius: 20px; border: 1px solid #ddd; background: white; cursor: pointer; font-weight: bold; color: #666; transition: 0.2s; }
.btn-hero-action:hover { border-color: #39C5BB; color: #39C5BB; }
.btn-hero-action.primary { background: #39C5BB; color: white; border: none; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
.btn-hero-action.primary:hover { background: #2da8a0; transform: translateY(-2px); }
.nav-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-bottom: 40px; }
.nav-card { background: white; border: 1px solid #eee; border-radius: 12px; padding: 20px; cursor: pointer; transition: transform 0.2s; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.nav-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
.icon { font-size: 28px; margin-bottom: 8px; }
.nav-card h3 { margin: 0 0 5px 0; font-size: 15px; color: #333; font-weight: bold; }
.nav-card p { margin: 0; font-size: 12px; color: #888; }
.wiki-card { border-bottom: 3px solid #39c5bb; }
.kb-card { border-bottom: 3px solid #ffa000; } 
.gb-card { border-bottom: 3px solid #ff5252; }
.ticket-card { border-bottom: 3px solid #00e676; }
.event-card { border-bottom: 3px solid #8b5cf6; } 
.project-card { border-bottom: 3px solid #f472b6; }
.profile-card { border-bottom: 3px solid #fbbf24; }
.content-split { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
@media (max-width: 768px) { .content-split { grid-template-columns: 1fr; } }
.banner-wrapper { height: 200px; border-radius: 12px; overflow: hidden; position: relative; margin-bottom: 20px; background: #333; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.carousel-container { width: 100%; height: 100%; position: relative; }
.banner-slide { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0; transition: opacity 0.5s ease; cursor: pointer; }
.banner-slide.active { opacity: 1; z-index: 1; }
.banner-text { position: absolute; bottom: 20px; left: 30px; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 2; }
.banner-text h2 { margin: 0; font-size: 24px; }
.banner-text p { margin: 5px 0 0 0; opacity: 0.9; }
.indicators { position: absolute; bottom: 15px; right: 20px; display: flex; gap: 8px; z-index: 3; }
.indicators span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.5); cursor: pointer; transition: 0.3s; }
.indicators span.active { background: white; transform: scale(1.2); }
.section-col { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
.section-header h3 { margin: 0; font-size: 18px; color: #2c3e50; border-left: 4px solid #39C5BB; padding-left: 10px; }
.more-link { font-size: 12px; color: #999; cursor: pointer; }
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
.event-style .item-title { font-weight: bold; }
.status-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.status-badge.active { background: #e0f2f1; color: #00695c; }
.status-badge.upcoming { background: #fff3e0; color: #ef6c00; }
.status-badge.ended { background: #eee; color: #999; }
.loading-skel { text-align: center; color: #999; padding: 20px; }
</style>