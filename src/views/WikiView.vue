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
    
    <router-link to="/submit" class="fab-btn" title="发布新周边">➕</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore' // 使用 Store 获取用户信息
import { fetchWikiByMonth, searchWiki } from '../services/wikiData' // 使用新的 Service
import WikiCard from '../components/wiki/WikiCard.vue' // 使用新的组件

const userStore = useUserStore()
const searchInput = ref('')
const isSearchMode = computed(() => searchInput.value.trim() !== '')
const items = ref([]) 
const quickFilter = ref('')
const timelineGroups = ref([]) 
let debounceTimer = null

onMounted(() => {
  initTimeline()
})

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// --- 时间轴逻辑 ---
const initTimeline = () => {
  const now = new Date()
  const groups = []
  // 预生成最近24个月
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
</style>