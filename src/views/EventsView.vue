<template>
    <div class="events-container">
      
      <button class="back-home-btn" @click="$router.push('/')">
        ⬅ 返回首页
      </button>
  
      <div class="header-section">
        <h1 class="main-title">📡 活动情报局</h1>
        <p class="sub-title">收录官方最新演出、展览、联动信息</p>
      </div>
  
      <div class="tabs-wrapper">
        <div class="tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'active' }"
            @click="switchTab('active')"
          >
            🔥 近期情报 (即将开始/进行中)
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'ended' }"
            @click="switchTab('ended')"
          >
            🕰️ 往期档案 (已结束)
          </button>
        </div>
        <button @click="resetAndFetch" class="refresh-btn" :disabled="loading">
          {{ loading ? '📡 正在更新...' : '🔄 刷新列表' }}
        </button>
      </div>
  
      <div class="events-grid">
        <div 
          v-for="item in events" 
          :key="item.id" 
          class="event-card" 
          :class="getStatusClass(item)"
          @click="openLink(item.link)"
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
            
            <div v-if="getEventStatus(item) === 'upcoming'" class="status-overlay upcoming">
              📅 即将开始
            </div>
            <div v-else-if="getEventStatus(item) === 'ended'" class="status-overlay ended">
              🚫 已结束
            </div>
            <div v-else class="status-overlay active">
              🟢 正在进行
            </div>
          </div>
  
          <div class="info-content">
            <h3 class="event-title">{{ item.name }}</h3>
            
            <div class="meta-row">
              <span class="meta-tag char" v-if="item.character">{{ item.character }}</span>
            </div>
            
            <div class="date-range-box">
               <span class="d-label">时间:</span>
               <span class="d-val">{{ formatDate(item.release_date) }}</span>
               <span class="d-sep" v-if="item.event_end_date"> ~ </span>
               <span class="d-val" v-if="item.event_end_date">{{ formatDate(item.event_end_date) }}</span>
            </div>
  
            <p class="desc-preview">
               {{ getEventStatus(item) === 'ended' ? '查看存档 ➜' : '查看详情 ➜' }}
            </p>
          </div>
        </div>
      </div>
  
      <div class="footer-status">
        <div v-if="loading" class="loading-spinner">📡 数据传输中...</div>
        <div v-else-if="events.length === 0" class="empty-state">
          🛸 没有探测到相关活动...
        </div>
        <button v-else-if="hasMore" @click="loadMore" class="load-more-btn">
          📂 加载更多
        </button>
        <div v-else class="end-text">🏁 到底啦</div>
      </div>
  
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { createClient } from '@supabase/supabase-js'
  
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  
  const events = ref([])
  const loading = ref(false)
  const activeTab = ref('active') 
  const page = ref(0)
  const PAGE_SIZE = 12
  const hasMore = ref(true)
  
  const EVENT_CATEGORIES = ['魔法未来', '雪未来', 'MIKU EXPO', '交响乐会', '演唱会', '联动/咖啡厅', '展览/漫展', '线下活动']
  
  onMounted(() => { resetAndFetch() })
  
  // 🔥 核心逻辑：获取活动状态
  const getEventStatus = (item) => {
    const today = new Date().toISOString().split('T')[0]
    const start = item.release_date // 开始日期
    const end = item.event_end_date // 结束日期
  
    // 1. 如果有开始日期，且今天还没到 -> 即将开始
    if (start && today < start) return 'upcoming'
  
    // 2. 如果有结束日期，且今天已经过了 -> 已结束
    if (end && today > end) return 'ended'
  
    // 3. 其他情况 -> 正在进行
    return 'active'
  }
  
  const getStatusClass = (item) => {
    const status = getEventStatus(item)
    if (status === 'ended') return 'is-ended'
    if (status === 'upcoming') return 'is-upcoming'
    return ''
  }
  
  const switchTab = (tab) => { activeTab.value = tab; resetAndFetch() }
  const resetAndFetch = async () => { page.value = 0; events.value = []; hasMore.value = true; await fetchEvents() }
  const loadMore = async () => { page.value++; await fetchEvents() }
  
  const fetchEvents = async () => {
    loading.value = true
    try {
      let query = supabase
        .from('items')
        .select('*')
        .in('category', EVENT_CATEGORIES)
        .range(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE - 1)
  
      // 默认都按开始日期倒序排（最新的在前面）
      query = query.order('release_date', { ascending: false })
  
      const { data, error } = await query
      if (error) throw error
  
      if (data) {
        // 🔥 前端过滤逻辑：根据 Tab 决定显示哪些状态
        const filtered = data.filter(item => {
          const status = getEventStatus(item)
          if (activeTab.value === 'active') {
            // 活跃Tab：显示【正在进行】和【即将开始】
            return status === 'active' || status === 'upcoming'
          } else {
            // 历史Tab：只显示【已结束】
            return status === 'ended'
          }
        })
  
        if (filtered.length > 0) {
          events.value.push(...filtered)
        }
        
        // 注意：由于我们在前端进行了过滤，可能会导致后端还有数据但前端显示不够PAGE_SIZE
        // 这里简单处理：如果原始数据少于PAGE_SIZE，说明后端也没了
        if (data.length < PAGE_SIZE) hasMore.value = false
      }
    } catch (e) { console.error(e) } 
    finally { loading.value = false }
  }
  
  const openLink = (url) => { if (url) window.open(url, '_blank') }
  const handleImageError = (e) => { e.target.src = 'https://via.placeholder.com/400x300?text=No+Image' }
  const formatDate = (d) => d ? d.replace(/-/g, '/') : ''
  </script>
  
  <style scoped>
  .events-container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; min-height: 100vh; position: relative; font-family: sans-serif; }
  
  /* 🔙 */
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
  
  /* 状态样式逻辑 */
  .event-card.is-ended { filter: grayscale(90%); opacity: 0.8; }
  .event-card.is-ended:hover { filter: grayscale(0%); opacity: 1; }
  .event-card.is-upcoming { border-color: #ffe0b2; } /* 即将开始的卡片有点黄色边框 */
  
  .image-wrapper { height: 180px; width: 100%; position: relative; background: #f0f0f0; overflow: hidden; }
  .event-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
  .event-card:hover .event-img { transform: scale(1.05); }
  
  .category-badge { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; backdrop-filter: blur(4px); }
  
  /* 状态标 */
  .status-overlay { position: absolute; top: 10px; left: 10px; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
  .status-overlay.active { background: #39C5BB; }
  .status-overlay.upcoming { background: #ff9800; }
  .status-overlay.ended { background: #666; }
  
  .info-content { padding: 15px; flex: 1; display: flex; flex-direction: column; }
  .event-title { margin: 0 0 10px 0; font-size: 16px; line-height: 1.4; color: #2c3e50; height: 44px; overflow: hidden; }
  .meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 12px; }
  .meta-tag { background: #e0f2f1; color: #00695c; padding: 2px 6px; border-radius: 4px; }
  
  /* 日期范围 */
  .date-range-box { background: #fafafa; padding: 8px; border-radius: 6px; font-size: 12px; color: #555; margin-bottom: 10px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
  .d-label { color: #999; font-weight: normal; margin-right: 2px; }
  .d-val { font-weight: bold; color: #333; }
  .d-sep { color: #ccc; }
  
  .desc-preview { margin-top: auto; font-size: 12px; color: #39C5BB; font-weight: bold; text-align: right; }
  
  .footer-status { margin-top: 40px; text-align: center; color: #999; }
  .load-more-btn { background: white; border: 1px solid #ddd; padding: 10px 30px; border-radius: 25px; cursor: pointer; color: #666; font-size: 14px; }
  .load-more-btn:hover { border-color: #39C5BB; color: #39C5BB; }
  </style>