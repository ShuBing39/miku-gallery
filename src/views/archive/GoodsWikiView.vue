<template>
  <div class="container">
    <div class="header-nav">
      <div class="nav-left">
        <button class="back-home-btn" @click="$router.push('/')">⬅ 首页</button>
      </div>

      <div class="nav-right">
        <div v-if="userStore.user" class="user-info">
          <span>👋 {{ userStore.user.user_metadata?.username || '葱粉' }}</span>
          <router-link to="/profile" class="profile-link">👤 个人中心</router-link>
        </div>
        <div v-else class="auth-links">
          <router-link to="/login">登录</router-link>
          <span class="divider">|</span>
          <router-link to="/register">申请内测</router-link>
        </div>
      </div>
    </div>

    <div class="floating-nav right">
      <button @click="scrollToTop" title="回到顶部">⬆</button>
    </div>

    <h1 class="site-title">葱葱维基</h1>

    <div class="mode-switch-container">
      <button 
        class="mode-btn" 
        :class="{ active: currentMode === 'official' }" 
        @click="currentMode = 'official'"
      >
        🏢 官方情报 (年份索引)
      </button>
      <button 
        class="mode-btn" 
        :class="{ active: currentMode === 'dojin' }" 
        @click="switchToDojin"
      >
        🎁 同人/无料 (按活动)
      </button>
    </div>

    <div v-show="currentMode === 'official'">
      <div class="toolbar">
        <div class="search-box">
          <input 
            v-model="searchInput" 
            type="text" 
            placeholder="🔍 搜: 葱 2025 / ID 105"
            class="search-input"
            @input="handleInput"
          >
          <button v-if="searchInput" @click="clearSearch" class="clear-btn">✕</button>
        </div>
        
        <select v-model="quickFilter" class="filter-select" @change="applyQuickFilter">
          <option value="" disabled selected>📂 筛选...</option>
          <option value="手办">🗿 手办</option>
          <option value="玩偶">🧸 玩偶</option>
          <option value="衣服">👕 服饰</option>
          <option value="徽章">📛 徽章</option>
          <option value="2025">📅 2025</option>
        </select>

        <router-link to="/submit" class="add-btn-toolbar">➕ 投稿/新增</router-link>
      </div>

      <div v-if="isSearchMode">
        <div class="result-count">🔍 找到 {{ items.length }} 个结果</div>
        <div v-if="items.length > 0" class="grid">
          <WikiCard v-for="item in items" :key="item.id" :item="item" />
        </div>
        <div v-else class="empty-state">🤷‍♂️ 找不到...</div>
      </div>

      <div v-else class="timeline-container">
        <div v-for="(yearGroup, index) in timelineYears" :key="yearGroup.year" class="year-section">
          
          <div class="year-header" :class="{ 'active': yearGroup.isOpen }" @click="toggleYear(index)">
            <div class="year-title-wrap">
              <h2 class="year-title">{{ yearGroup.year }}年</h2>
              <span class="year-subtitle" v-if="yearGroup.isOpen">
                当前查看: {{ yearGroup.selectedMonth }}月
              </span>
            </div>
            <span class="toggle-icon">{{ yearGroup.isOpen ? '▼' : '▶' }}</span>
          </div>

          <div v-show="yearGroup.isOpen" class="year-content">
            
            <div class="month-selector">
              <button 
                v-for="m in 12" 
                :key="m"
                class="month-tag"
                :class="{ active: yearGroup.selectedMonth === m }"
                @click.stop="selectMonth(yearGroup, m)"
              >
                {{ m }}月
              </button>
            </div>

            <div class="month-data-area">
              <div v-if="yearGroup.isLoading" class="loading-state">⏳ 读取 {{ yearGroup.selectedMonth }}月 数据中...</div>
              
              <div v-else-if="yearGroup.items && yearGroup.items.length > 0" class="grid fade-in">
                <WikiCard v-for="item in yearGroup.items" :key="item.id" :item="item" />
              </div>
              
              <div v-else class="empty-month-state">
                🍂 {{ yearGroup.year }}年{{ yearGroup.selectedMonth }}月 暂无收录数据
              </div>
            </div>

          </div>
        </div>

        <button @click="loadMoreYears" class="load-history-btn">📜 加载更早的年份</button>
      </div>
    </div>

    <div v-show="currentMode === 'dojin'" class="dojin-container">
      <div class="dojin-header-tip">
        <p>🎁 这里展示大家在各类活动中制作/交换的同人周边与无料。</p>
        <small>(大多为用爱发电免费交换，请勿高价倒卖)</small>
      </div>

      <div v-if="dojinLoading" class="loading-state">⏳ 正在加载同人宝藏...</div>
      
      <div v-else>
        <div v-for="(items, eventName) in groupedDojinItems" :key="eventName" class="event-section">
          <div class="event-header">
            <span class="event-icon">📍</span> 
            {{ eventName === 'unknown' ? '其他/未分类活动' : eventName }}
          </div>
          
          <div class="grid dojin-grid">
            <div 
              v-for="item in items" 
              :key="item.id" 
              class="dojin-card" 
              @click="$router.push(`/items/${item.id}`)"
            >
              <div class="dojin-img-box">
                <img :src="item.image_url" loading="lazy">
                <span class="dojin-tag">同人</span>
              </div>
              <div class="dojin-info">
                <h4>{{ item.name }}</h4>
                <p v-if="item.description && item.description.includes('画师')" class="artist-name">
                  {{ item.description }}
                </p>
                <div class="user-credit">
                  by {{ item.profiles?.username || '葱粉' }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="Object.keys(groupedDojinItems).length === 0" class="empty-state">
          还没有同人周边投递哦，快去点右下角“➕”分享吧！
        </div>
      </div>
    </div>
    
    <router-link to="/submit" class="fab-btn" title="发布新周边">➕</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore' 
import { fetchWikiByMonth, searchWiki } from '../../services/wikiData' 
import WikiCard from '../../components/wiki/WikiCard.vue' 
import { supabase } from '../../services/supabase'
import { fixUrl } from '../../utils/formatters' 

const userStore = useUserStore()
const searchInput = ref('')
const isSearchMode = computed(() => searchInput.value.trim() !== '')
const items = ref([]) 
const quickFilter = ref('')
const timelineYears = ref([]) 
let debounceTimer = null

const currentMode = ref('official') 
const dojinItems = ref([])
const dojinLoading = ref(false)

onMounted(() => {
  initTimeline()
})

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 🔥 核心：图片清洗逻辑 + ✅ 价格修复逻辑
const processItems = (rawData) => {
  if (!rawData) return []
  return rawData.map(item => {
    // 1. 处理图片
    let finalUrl = ''
    if (item.cover_image_url) {
      finalUrl = item.cover_image_url
    } else if (item.image_url) {
      const str = String(item.image_url).trim()
      if (str.startsWith('[') && str.endsWith(']')) {
        try {
          const parsed = JSON.parse(str)
          if (Array.isArray(parsed) && parsed.length > 0) {
            finalUrl = parsed[0]
          }
        } catch (e) { console.error('Parsed image error:', e) }
      } else {
        finalUrl = str
      }
    }

    // 2. ✅ 处理价格显示 (修复0元bug)
    // WikiCard 通常直接读取 item.price，我们这里优先读取 price_jpy 并覆盖 displayPrice
    let displayPrice = item.price || ''
    if (item.price_jpy && item.price_jpy > 0) {
      // 如果有日元价格，格式化为 "JP¥ 1,234"
      displayPrice = `JP¥ ${item.price_jpy.toLocaleString()}`
    } else if (!displayPrice || displayPrice === '0' || displayPrice === '¥0') {
      // 如果既没有日元价格，原价格也是0或空，则显示暂无
      displayPrice = '暂无定价'
    }

    return { 
      ...item, 
      image_url: fixUrl(finalUrl),
      price: displayPrice // 覆盖 price 字段供 WikiCard 显示
    }
  })
}

// --- ✅ 新版年份时间轴逻辑 ---
const initTimeline = () => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // 初始化生成最近 5 年
  generateYears(currentYear + 1, currentYear - 4, currentYear, currentMonth)
}

// 生成年份组
const generateYears = (startYear, endYear, activeYear, activeMonth) => {
  const newYears = []
  for (let y = startYear; y >= endYear; y--) {
    const isCurrent = y === activeYear
    newYears.push({
      year: y,
      isOpen: isCurrent, 
      selectedMonth: isCurrent ? activeMonth : 12, 
      items: [],
      isLoading: false,
      hasLoaded: false 
    })
  }
  
  timelineYears.value = [...timelineYears.value, ...newYears]
  
  const openYear = timelineYears.value.find(y => y.isOpen)
  if (openYear) {
    fetchDataForYearMonth(openYear)
  }
}

// 加载更多年份
const loadMoreYears = () => {
  const lastYear = timelineYears.value[timelineYears.value.length - 1].year
  generateYears(lastYear - 1, lastYear - 5, -1, -1)
}

// 切换年份折叠/展开
const toggleYear = (index) => {
  const group = timelineYears.value[index]
  group.isOpen = !group.isOpen
  if (group.isOpen && group.items.length === 0 && !group.hasLoaded) {
    fetchDataForYearMonth(group)
  }
}

// 切换月份
const selectMonth = (yearGroup, month) => {
  if (yearGroup.selectedMonth === month) return
  yearGroup.selectedMonth = month
  fetchDataForYearMonth(yearGroup)
}

// 获取特定年月数据的核心函数
const fetchDataForYearMonth = async (yearGroup) => {
  yearGroup.isLoading = true
  try {
    const data = await fetchWikiByMonth(yearGroup.year, yearGroup.selectedMonth)
    yearGroup.items = processItems(data)
    yearGroup.hasLoaded = true
  } catch (e) {
    console.error(e)
  } finally {
    yearGroup.isLoading = false
  }
}

// --- 搜索逻辑 ---
const applyQuickFilter = () => { 
  if (quickFilter.value) { 
    searchInput.value = quickFilter.value
    runSearch()
    quickFilter.value = '' 
  } 
}

const runSearch = async () => {
  if (!searchInput.value.trim()) return
  try {
    const rawData = await searchWiki(searchInput.value)
    items.value = processItems(rawData)
  } catch (e) {
    console.error(e)
  }
}

const handleInput = () => { 
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(runSearch, 500)
}

const clearSearch = () => { 
  searchInput.value = ''
  items.value = [] 
}

// --- 同人专区逻辑 ---
const switchToDojin = () => {
  currentMode.value = 'dojin'
  if (dojinItems.value.length === 0) {
    loadDojinData()
  }
}

const loadDojinData = async () => {
  dojinLoading.value = true
  
  const { data, error } = await supabase
    .from('items')
    .select(`*, events:event_id(name), profiles:user_id(username)`)
    .eq('is_fan_work', true)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  let rawDojinData = []
  if (!error) rawDojinData = data
  else {
    const { data: backup } = await supabase.from('items').select('*').eq('is_fan_work', true).eq('status', 'approved').order('created_at', { ascending: false })
    rawDojinData = backup || []
  }

  dojinItems.value = processItems(rawDojinData)
  dojinLoading.value = false
}

const groupedDojinItems = computed(() => {
  const groups = {}
  for (const item of dojinItems.value) {
    const eventName = item.events?.name || '其他/未分类活动'
    if (!groups[eventName]) groups[eventName] = []
    groups[eventName].push(item)
  }
  return groups
})
</script>

<style scoped>
.container { width: 92%; max-width: 1200px; margin: 0 auto; padding: 20px; padding-bottom: 80px; position: relative; }

/* 顶部布局 */
.header-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.nav-left { flex: 1; }
.nav-right { display: flex; align-items: center; font-size: 13px; color: #666; }
.back-home-btn { background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; color: #666; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-size: 14px; }
.back-home-btn:hover { background: #39C5BB; color: white; border-color: #39C5BB; }
.auth-links a { color: #666; text-decoration: none; font-weight: bold; }
.auth-links a:hover { color: #39C5BB; }
.divider { margin: 0 8px; color: #ddd; }
.user-info { display: flex; gap: 15px; align-items: center; }
.profile-link { background: #e0f2f1; color: #00695c; padding: 4px 10px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 12px; transition: 0.2s; }
.site-title { color: #39C5BB; text-align: center; margin-bottom: 20px; font-size: 1.8rem; margin-top: -10px; }

/* 悬浮按钮 */
.floating-nav { position: fixed; bottom: 30px; display: flex; flex-direction: column; gap: 10px; z-index: 1000; }
.floating-nav.right { right: 20px; }
.floating-nav button { width: 40px; height: 40px; border-radius: 50%; border: none; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); cursor: pointer; font-size: 18px; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
.floating-nav button:hover { transform: scale(1.1); background: #39C5BB; color: white; }

/* 模式切换 */
.mode-switch-container { display: flex; justify-content: center; gap: 15px; margin-bottom: 30px; }
.mode-btn { border: none; background: #f5f5f5; padding: 10px 20px; border-radius: 25px; color: #666; font-weight: bold; cursor: pointer; transition: 0.3s; font-size: 15px; }
.mode-btn.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57,197,187,0.3); }

/* 工具栏 */
.toolbar { margin-bottom: 30px; display: flex; gap: 10px; align-items: center; }
.search-box { flex: 1; position: relative; }
.search-input { width: 100%; padding: 12px 15px; border: 2px solid #eee; border-radius: 8px; font-size: 14px; transition: 0.3s; box-sizing: border-box; }
.search-input:focus { border-color: #39C5BB; outline: none; }
.clear-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); border: none; background: none; color: #999; cursor: pointer; }
.filter-select { padding: 0 10px; border: 2px solid #eee; border-radius: 8px; background: white; cursor: pointer; height: 44px; font-size: 13px; color: #555; width: 100px; }
.add-btn-toolbar { background: #39C5BB; color: white; padding: 0 20px; height: 44px; display: flex; align-items: center; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; white-space: nowrap; box-shadow: 0 4px 10px rgba(57,197,187,0.3); transition: 0.2s; }
.add-btn-toolbar:hover { background: #2da8a0; transform: translateY(-2px); }
.fab-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: #39C5BB; color: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; text-decoration: none; font-size: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 100; transition: transform 0.2s; }
.fab-btn:hover { transform: scale(1.1) rotate(90deg); background: #2da8a0; }

/* ✅ 时间轴样式优化 */
.timeline-container { position: relative; }
.year-section { margin-bottom: 15px; border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: white; }
.year-header { background: #f9f9f9; padding: 15px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; }
.year-header:hover { background: #f0fcfb; }
.year-header.active { background: #e0f2f1; color: #00695c; }
.year-title-wrap { display: flex; align-items: baseline; gap: 10px; }
.year-title { margin: 0; font-size: 1.4rem; font-weight: bold; }
.year-subtitle { font-size: 0.9rem; color: #00796b; opacity: 0.8; }
.toggle-icon { font-size: 0.8rem; color: #999; }
.year-content { padding: 20px; border-top: 1px solid #eee; }

/* ✅ 月份选择器 */
.month-selector { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; border-bottom: 1px dashed #eee; padding-bottom: 15px; }
.month-tag { border: 1px solid #ddd; background: white; padding: 5px 12px; border-radius: 20px; font-size: 13px; color: #666; cursor: pointer; transition: 0.2s; }
.month-tag:hover { border-color: #39C5BB; color: #39C5BB; }
.month-tag.active { background: #39C5BB; color: white; border-color: #39C5BB; font-weight: bold; transform: scale(1.05); }

/* 数据展示 */
.month-data-area { min-height: 200px; }
.load-history-btn { display: block; width: 100%; padding: 15px; background: #f9f9f9; border: 1px dashed #ccc; color: #666; cursor: pointer; margin-top: 30px; border-radius: 8px; transition: 0.2s; }
.load-history-btn:hover { background: #f0f0f0; border-color: #999; }
.fade-in { animation: fadeIn 0.4s ease; }

.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
@media (min-width: 640px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(5, 1fr); } }

.loading-state, .empty-month-state, .empty-state { color: #999; font-style: italic; padding: 40px 0; text-align: center; }

/* 同人区样式 (保持) */
.dojin-container { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.dojin-header-tip { text-align: center; background: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
.event-section { margin-bottom: 40px; }
.event-header { display: flex; align-items: center; font-size: 1.2rem; font-weight: bold; color: #333; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.dojin-card { background: white; border-radius: 8px; overflow: hidden; border: 1px solid #eee; cursor: pointer; transition: 0.2s; }
.dojin-card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); border-color: #4caf50; }
.dojin-img-box { position: relative; aspect-ratio: 1; background: #fafafa; }
.dojin-img-box img { width: 100%; height: 100%; object-fit: contain; }
.dojin-tag { position: absolute; bottom: 5px; right: 5px; background: rgba(76, 175, 80, 0.8); color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.dojin-info { padding: 10px; }
.dojin-info h4 { margin: 0 0 5px 0; font-size: 14px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.artist-name { font-size: 12px; color: #666; margin: 0 0 5px 0; }
.user-credit { font-size: 11px; color: #999; text-align: right; }
</style>