<template>
  <div class="container">
    <div class="floating-nav left">
      <button @click="$router.push('/')" title="返回首页">🏠</button>
      <button @click="$router.go(-1)" title="返回上一页">⬅</button>
    </div>
    <div class="floating-nav right">
      <button @click="scrollToTop" title="回到顶部">⬆</button>
    </div>

    <div class="top-bar">
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

    <h1 class="site-title">葱葱维基</h1>

    <div class="mode-switch-container">
      <button 
        class="mode-btn" 
        :class="{ active: currentMode === 'official' }" 
        @click="currentMode = 'official'"
      >
        🏢 官方情报 (时间线)
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
        <div v-for="(group, index) in timelineGroups" :key="group.key" class="month-section">
          <div class="month-header" :class="{ 'active': group.isOpen }" @click="toggleMonth(index)">
            <div class="timeline-dot"></div>
            <h2 class="month-title">
              {{ group.year }}年 {{ group.month }}月
              <span class="toggle-icon">{{ group.isOpen ? '▼' : '▶' }}</span>
            </h2>
          </div>
          <div v-show="group.isOpen" class="month-content">
            <div v-if="group.isLoading" class="loading-state">⏳ 读取中...</div>
            <div v-else-if="group.items && group.items.length > 0" class="grid">
              <WikiCard v-for="item in group.items" :key="item.id" :item="item" />
            </div>
            <div v-else class="empty-month-state">🍃 本月无新周边</div>
          </div>
        </div>
        <button @click="loadMoreMonths" class="load-history-btn">📜 查看更早历史</button>
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

// ✅ [修复] 路径全部改为 ../../ 开头，因为本文件在 views/archive/ 下
import { useUserStore } from '../../stores/userStore' 
import { fetchWikiByMonth, searchWiki } from '../../services/wikiData' 
import WikiCard from '../../components/wiki/WikiCard.vue' 
import { supabase } from '../../services/supabase'

const userStore = useUserStore()
const searchInput = ref('')
const isSearchMode = computed(() => searchInput.value.trim() !== '')
const items = ref([]) 
const quickFilter = ref('')
const timelineGroups = ref([]) 
let debounceTimer = null

// ✅ 新增状态
const currentMode = ref('official') // 'official' 或 'dojin'
const dojinItems = ref([])
const dojinLoading = ref(false)

onMounted(() => {
  initTimeline()
})

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// --- 官方时间线逻辑 (保持不变) ---
const initTimeline = () => {
  const now = new Date()
  const groups = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 - 1 - i, 1)
    groups.push({ 
      key: `${d.getFullYear()}-${d.getMonth()+1}`, 
      year: d.getFullYear(), 
      month: d.getMonth()+1, 
      isOpen: i === 0, 
      isLoading: false, 
      loaded: false, 
      items: [] 
    })
  }
  timelineGroups.value = groups
  if (groups.length > 0) loadMonthData(0)
}

const loadMoreMonths = () => {
  const lastGroup = timelineGroups.value[timelineGroups.value.length - 1]
  const newGroups = []
  for (let i = 1; i <= 12; i++) {
    const d = new Date(lastGroup.year, lastGroup.month - 1 - i, 1)
    newGroups.push({ 
      key: `${d.getFullYear()}-${d.getMonth()+1}`, 
      year: d.getFullYear(), 
      month: d.getMonth()+1, 
      isOpen: false, 
      isLoading: false, 
      loaded: false, 
      items: [] 
    })
  }
  timelineGroups.value.push(...newGroups)
}

const toggleMonth = (index) => {
  const group = timelineGroups.value[index]
  group.isOpen = !group.isOpen
  if (group.isOpen && !group.loaded) loadMonthData(index)
}

const loadMonthData = async (index) => {
  const group = timelineGroups.value[index]
  group.isLoading = true
  try {
    const data = await fetchWikiByMonth(group.year, group.month)
    group.items = data
    group.loaded = true
  } catch (e) {
    console.error(e)
  } finally {
    group.isLoading = false
  }
}

// --- 官方搜索逻辑 (保持不变) ---
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
    items.value = await searchWiki(searchInput.value)
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

// --- ✅ 新增：同人专区逻辑 ---
const switchToDojin = () => {
  currentMode.value = 'dojin'
  if (dojinItems.value.length === 0) {
    loadDojinData()
  }
}

const loadDojinData = async () => {
  dojinLoading.value = true
  // 获取所有 is_fan_work = true 的物品
  // 并尝试联表查询活动名 (events:event_id) 和 上传者名 (profiles:user_id)
  const { data, error } = await supabase
    .from('items')
    .select(`
      *,
      events:event_id(name),
      profiles:user_id(username)
    `)
    .eq('is_fan_work', true)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (!error) {
    dojinItems.value = data
  } else {
    // 降级：如果联表失败，只查 items
    const { data: backup } = await supabase
      .from('items')
      .select('*')
      .eq('is_fan_work', true)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    dojinItems.value = backup || []
  }
  dojinLoading.value = false
}

// 按活动名分组
const groupedDojinItems = computed(() => {
  const groups = {}
  for (const item of dojinItems.value) {
    // 优先使用关联的 event.name，如果没有则归为 'unknown'
    const eventName = item.events?.name || '其他/未分类活动'
    if (!groups[eventName]) {
      groups[eventName] = []
    }
    groups[eventName].push(item)
  }
  return groups
})

</script>

<style scoped>
.container { width: 92%; max-width: 1200px; margin: 0 auto; padding: 20px; padding-bottom: 80px; position: relative; }

/* 悬浮导航 */
.floating-nav { position: fixed; bottom: 30px; display: flex; flex-direction: column; gap: 10px; z-index: 1000; }
.floating-nav.left { left: 20px; }
.floating-nav.right { right: 20px; }
.floating-nav button { width: 40px; height: 40px; border-radius: 50%; border: none; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); cursor: pointer; font-size: 18px; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
.floating-nav button:hover { transform: scale(1.1); background: #39C5BB; color: white; }

.top-bar { display: flex; justify-content: flex-end; font-size: 13px; margin-bottom: 10px; color: #666; }
.auth-links a { color: #666; text-decoration: none; font-weight: bold; }
.auth-links a:hover { color: #39C5BB; }
.divider { margin: 0 8px; color: #ddd; }
.user-info { display: flex; gap: 15px; align-items: center; }
.profile-link { background: #e0f2f1; color: #00695c; padding: 4px 10px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 12px; transition: 0.2s; }
.site-title { color: #39C5BB; text-align: center; margin-bottom: 20px; font-size: 1.8rem; }

/* ✅ 模式切换开关 */
.mode-switch-container { display: flex; justify-content: center; gap: 15px; margin-bottom: 30px; }
.mode-btn { border: none; background: #f5f5f5; padding: 10px 20px; border-radius: 25px; color: #666; font-weight: bold; cursor: pointer; transition: 0.3s; font-size: 15px; }
.mode-btn.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57,197,187,0.3); }

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

.timeline-container { position: relative; border-left: 2px solid #e0e0e0; margin-left: 10px; padding-left: 30px; }
.month-section { margin-bottom: 20px; }
.month-header { position: relative; cursor: pointer; padding: 10px 0; display: flex; align-items: center; transition: all 0.2s; }
.month-header:hover .month-title { color: #39C5BB; }
.timeline-dot { position: absolute; left: -37px; width: 12px; height: 12px; background: white; border: 3px solid #ccc; border-radius: 50%; transition: 0.3s; }
.month-header.active .timeline-dot { border-color: #39C5BB; background: #39C5BB; transform: scale(1.2); }
.month-title { font-size: 1.2rem; color: #555; margin: 0; font-weight: bold; }
.month-content { padding-top: 15px; }
.load-history-btn { display: block; width: 100%; padding: 15px; background: #f9f9f9; border: 1px dashed #ccc; color: #666; cursor: pointer; margin-top: 30px; border-radius: 8px; }

.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
@media (min-width: 640px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(5, 1fr); } }

.loading-state, .empty-month-state, .empty-state { color: #999; font-style: italic; padding: 20px 0; text-align: center; }

/* ✅ 同人专区样式 */
.dojin-container { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.dojin-header-tip { text-align: center; background: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
.dojin-header-tip p { margin: 0; font-weight: bold; }
.dojin-header-tip small { font-size: 0.85em; opacity: 0.8; }

.event-section { margin-bottom: 40px; }
.event-header { display: flex; align-items: center; font-size: 1.2rem; font-weight: bold; color: #333; margin-bottom: 15px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.event-icon { margin-right: 10px; }

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