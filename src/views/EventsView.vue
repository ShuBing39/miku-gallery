<template>
  <div class="events-container">
    
    <button class="back-home-btn" @click="$router.push('/')">
      ⬅ 返回首页
    </button>

    <div class="header-section">
      <h1 class="main-title">📡 活动情报局</h1>
      <p class="sub-title">收录官方资讯 & 同人企划动态</p>
    </div>

    <div class="tabs-wrapper">
      <div class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'active' }"
          @click="switchTab('active')"
        >
          🔥 正在进行 (活动 / 招募中)
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'ended' }"
          @click="switchTab('ended')"
        >
          🕰️ 往期档案 (已结束 / 完结)
        </button>
      </div>
      <button @click="resetAndFetch" class="refresh-btn" :disabled="loading">
        {{ loading ? '📡 搜索中...' : '🔄 刷新列表' }}
      </button>
    </div>

    <div class="events-grid">
      <div 
        v-for="item in mixedEvents" 
        :key="item.uniqueId" 
        class="event-card" 
        :class="item.statusClass"
        @click="handleCardClick(item)"
      >
        
        <div class="image-wrapper">
          <img 
            :src="item.image_url" 
            class="event-img" 
            referrerpolicy="no-referrer" 
            loading="lazy"
            @error="handleImageError"
          />
          <div class="category-badge">{{ item.category }}</div>
          
          <div class="status-overlay" :class="item.overlayClass">
            {{ item.statusText }}
          </div>
        </div>

        <div class="info-content">
          <h3 class="event-title">{{ item.name }}</h3>
          
          <div class="meta-row">
            <span class="meta-tag char" v-if="item.isProject">👤 {{ item.hostName || '主催' }}</span>
            <span class="meta-tag char" v-else-if="item.character">{{ item.character }}</span>
          </div>
          
          <div class="date-range-box">
             <span class="d-label">时间:</span>
             <span class="d-val">{{ formatDate(item.date) }}</span>
             <span class="d-sep" v-if="item.endDate"> ~ </span>
             <span class="d-val" v-if="item.endDate">{{ formatDate(item.endDate) }}</span>
          </div>

          <p class="desc-preview">
             {{ item.isProject ? '查看企划详情 ➜' : '查看活动情报 ➜' }}
          </p>
        </div>
      </div>
    </div>

    <div class="footer-status">
      <div v-if="loading" class="loading-spinner">📡 数据传输中...</div>
      <div v-else-if="mixedEvents.length === 0" class="empty-state">
        🛸 暂无相关情报...
      </div>
      <div v-else class="end-text">🏁 - 仅展示最新 50 条情报 -</div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()

const mixedEvents = ref([])
const loading = ref(false)
const activeTab = ref('active') 

const OFFICIAL_CATS = ['魔法未来', '雪未来', 'MIKU EXPO', '交响乐会', '演唱会', '联动/咖啡厅', '展览/漫展', '线下活动', '同人活动']

onMounted(() => { resetAndFetch() })

const switchTab = (tab) => { activeTab.value = tab; resetAndFetch() }

const resetAndFetch = async () => {
  loading.value = true
  mixedEvents.value = []
  
  try {
    // 1. 获取官方活动 (items 表)
    const { data: officials } = await supabase.from('items')
      .select('*')
      .in('category', OFFICIAL_CATS)
      .order('release_date', { ascending: false })
      .limit(50)

    // 2. 获取同人企划 (projects 表)
    const { data: projects } = await supabase.from('projects')
      .select('*')
      .eq('allow_external', true) // 只看公开招募的
      .order('created_at', { ascending: false })
      .limit(50)

    // 3. 获取企划发起人名字 (为了显示更好看)
    let userMap = {}
    if (projects && projects.length > 0) {
      const uids = [...new Set(projects.map(p => p.uploader_id).filter(Boolean))]
      const { data: users } = await supabase.from('profiles').select('id, username').in('id', uids)
      users?.forEach(u => userMap[u.id] = u.username)
    }

    // 4. 数据标准化与合并
    let combined = []

    // 处理官方活动
    if (officials) {
      combined.push(...officials.map(ev => {
        const status = getOfficialStatus(ev)
        // 过滤逻辑：Active Tab 只看未结束的
        if (activeTab.value === 'active' && status.code === 'ended') return null
        if (activeTab.value === 'ended' && status.code !== 'ended') return null
        
        return {
          uniqueId: 'ev_' + ev.id,
          id: ev.id,
          name: ev.name,
          image_url: ev.image_url,
          category: ev.category,
          character: ev.character,
          date: ev.release_date,
          endDate: ev.event_end_date,
          link: ev.link,
          isProject: false,
          statusText: status.text,
          overlayClass: status.class,
          statusClass: status.code === 'ended' ? 'is-ended' : ''
        }
      }).filter(Boolean))
    }

    // 处理同人企划
    if (projects) {
      combined.push(...projects.map(p => {
        const isEnded = p.recruit_status === 'ended'
        
        // 过滤逻辑
        if (activeTab.value === 'active' && isEnded) return null
        if (activeTab.value === 'ended' && !isEnded) return null

        let statusText = '进行中'
        let overlayClass = 'active'
        
        if (p.recruit_status === 'recruiting') {
          statusText = '🔥 招募中'
          overlayClass = 'upcoming' // 用橙色
        } else if (p.recruit_status === 'ongoing') {
          statusText = '🔨 制作中'
          overlayClass = 'active' // 用青色
        } else {
          statusText = '🏁 已完结'
          overlayClass = 'ended' // 用灰色
        }

        return {
          uniqueId: 'pj_' + p.id,
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          category: '同人企划',
          hostName: userMap[p.uploader_id] || '未知',
          date: p.start_date || p.created_at,
          endDate: p.end_date,
          isProject: true,
          statusText: statusText,
          overlayClass: overlayClass,
          statusClass: isEnded ? 'is-ended' : ''
        }
      }).filter(Boolean))
    }

    // 5. 排序：按开始时间倒序
    combined.sort((a, b) => new Date(b.date) - new Date(a.date))
    mixedEvents.value = combined

  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 辅助逻辑
const getOfficialStatus = (item) => {
  const today = new Date().toISOString().split('T')[0]
  const start = item.release_date
  const end = item.event_end_date

  if (start && today < start) return { code: 'upcoming', text: '📅 即将开始', class: 'upcoming' }
  if (end && today > end) return { code: 'ended', text: '🚫 已结束', class: 'ended' }
  return { code: 'active', text: '🟢 正在进行', class: 'active' }
}

const handleCardClick = (item) => {
  if (item.isProject) {
    router.push(`/project/${item.id}`)
  } else if (item.link && item.link.startsWith('http')) {
    window.open(item.link, '_blank')
  } else {
    // 官方活动目前没有详情页，暂时跳外链或无动作，或者可以考虑跳 item 详情
    // 这里为了体验一致，如果没外链就不做动作，或者可以提示
    if(!item.link) alert('该官方活动暂无详情页')
  }
}

const handleImageError = (e) => { e.target.src = 'https://via.placeholder.com/400x300?text=No+Image' }
const formatDate = (d) => d ? d.split('T')[0].replace(/-/g, '/') : '待定'
</script>

<style scoped>
.events-container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; min-height: 100vh; position: relative; font-family: sans-serif; }

.back-home-btn { position: absolute; top: 20px; left: 20px; background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; color: #555; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: 0.2s; z-index: 10; }
.back-home-btn:hover { background: #39C5BB; color: white; border-color: #39C5BB; }

.header-section { text-align: center; margin-bottom: 30px; margin-top: 20px; }
.main-title { font-size: 2.5rem; color: #2c3e50; margin: 0; }
.sub-title { color: #7f8c8d; margin-top: 10px; }

.tabs-wrapper { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
.tabs { display: flex; background: #f1f2f6; padding: 5px; border-radius: 30px; }
.tab-btn { padding: 10px 25px; border: none; background: transparent; cursor: pointer; border-radius: 25px; font-weight: bold; color: #95a5a6; transition: 0.3s; }
.tab-btn.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
.refresh-btn { background: white; border: 2px solid #39C5BB; color: #39C5BB; padding: 8px 16px; border-radius: 20px; cursor: pointer; }

.events-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }

.event-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05); cursor: pointer; transition: 0.3s; border: 1px solid #eee; display: flex; flex-direction: column; }
.event-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(57, 197, 187, 0.2); border-color: #39C5BB; }

.event-card.is-ended { filter: grayscale(90%); opacity: 0.8; }
.event-card.is-ended:hover { filter: grayscale(0%); opacity: 1; }

.image-wrapper { height: 180px; width: 100%; position: relative; background: #f0f0f0; overflow: hidden; }
.event-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.event-card:hover .event-img { transform: scale(1.05); }

.category-badge { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; backdrop-filter: blur(4px); }

.status-overlay { position: absolute; top: 10px; left: 10px; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
.status-overlay.active { background: #39C5BB; }
.status-overlay.upcoming { background: #ff9800; }
.status-overlay.ended { background: #666; }

.info-content { padding: 15px; flex: 1; display: flex; flex-direction: column; }
.event-title { margin: 0 0 10px 0; font-size: 16px; line-height: 1.4; color: #2c3e50; height: 44px; overflow: hidden; }
.meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 12px; }
.meta-tag { background: #e0f2f1; color: #00695c; padding: 2px 6px; border-radius: 4px; }

.date-range-box { background: #fafafa; padding: 8px; border-radius: 6px; font-size: 12px; color: #555; margin-bottom: 10px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.d-label { color: #999; font-weight: normal; margin-right: 2px; }
.d-val { font-weight: bold; color: #333; }
.d-sep { color: #ccc; }

.desc-preview { margin-top: auto; font-size: 12px; color: #39C5BB; font-weight: bold; text-align: right; }

.footer-status { margin-top: 40px; text-align: center; color: #999; }
.empty-state { padding: 40px; font-style: italic; }
</style>