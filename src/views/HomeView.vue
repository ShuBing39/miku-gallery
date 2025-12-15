<template>
  <div class="container">
    
    <div class="top-bar">
      <div v-if="currentUser" class="user-info">
        <span>👋 {{ currentUser.user_metadata?.username || '葱粉' }}</span>
        <router-link to="/profile" class="profile-link">👤 个人中心</router-link>
      </div>
      <div v-else class="auth-links">
        <router-link to="/login">登录</router-link>
        <span class="divider">|</span>
        <router-link to="/register">申请内测</router-link>
        <router-link to="/circle" class="profile-link" style="margin-right: 5px; background: #fff3e0; color: #e65100;">
  🏯 我的社团
</router-link>
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

      <router-link to="/submit" class="add-btn-toolbar">
        ➕ 投稿/新增
      </router-link>
    </div>

    <div v-if="isSearchMode">
      <div class="result-count">🔍 找到 {{ items.length }} 个结果</div>
      <div v-if="items.length > 0" class="grid">
        <router-link v-for="item in items" :key="item.id" :to="'/item/' + item.id" class="card">
          <div class="card-img-box">
            <span class="id-badge">#{{ item.id }}</span>
            <img :src="item.image_url" class="card-image" loading="lazy" />
            <span v-if="item.is_fan_work" class="fan-tag">🎨 同人作品</span>
          </div>

          <div class="card-info">
            <h3 class="card-title">{{ item.name }}</h3>
            <div class="card-footer">
               <span class="price">¥{{ item.market_price || item.price || '??' }}</span>
               <span class="date-tag">{{ item.release_date || '未知' }}</span>
            </div>
          </div>
        </router-link>
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
            <router-link v-for="item in group.items" :key="item.id" :to="'/item/' + item.id" class="card">
              <div class="card-img-box">
                <span class="id-badge">#{{ item.id }}</span>
                <img :src="item.image_url" class="card-image" loading="lazy" />
                <span v-if="item.is_fan_work" class="fan-tag">🎨 同人作品</span>
              </div>

              <div class="card-info">
                <div class="tags">
                   <span class="tag char-tag">{{ item.character }}</span>
                   <span class="tag cat-tag">{{ item.category }}</span>
                </div>
                <h3 class="card-title">{{ item.name }}</h3>
                <div class="card-footer">
                   <div class="price-box">
                     <p v-if="item.market_price" class="market-price">¥{{ item.market_price }}</p>
                     <p class="price" :class="{ 'original-crossed': item.market_price }">¥{{ item.price }}</p>
                   </div>
                </div>
              </div>
            </router-link>
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
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

const searchInput = ref('')
const isSearchMode = computed(() => searchInput.value.trim() !== '')
const items = ref([]) 
const quickFilter = ref('')
const timelineGroups = ref([]) 
const currentUser = ref(null)
let debounceTimer = null

const nicknameMap = { '葱': '初音未来', 'miku': '初音未来', '初音': '初音未来', '橘': '镜音铃', '蕉': '镜音连', '双子': '镜音双子', '章鱼': '巡音流歌', '大哥': 'KAITO', '大姐': 'MEIKO' }
const categoryMap = { '手办': '手办模型', '衣服': '服饰穿搭', '徽章': '徽章/吧唧', '玩偶': '毛绒玩偶' }

onMounted(async () => {
  initTimeline()
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
})

const initTimeline = () => {
  const now = new Date()
  const groups = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 - 1 - i, 1)
    groups.push({ key: `${d.getFullYear()}-${d.getMonth()+1}`, year: d.getFullYear(), month: d.getMonth()+1, isOpen: i === 0, isLoading: false, loaded: false, items: [] })
  }
  timelineGroups.value = groups
  if (groups.length > 0) fetchMonthData(0)
}

const loadMoreMonths = () => {
  const lastGroup = timelineGroups.value[timelineGroups.value.length - 1]
  const newGroups = []
  for (let i = 1; i <= 12; i++) {
    const d = new Date(lastGroup.year, lastGroup.month - 1 - i, 1)
    newGroups.push({ key: `${d.getFullYear()}-${d.getMonth()+1}`, year: d.getFullYear(), month: d.getMonth()+1, isOpen: false, isLoading: false, loaded: false, items: [] })
  }
  timelineGroups.value.push(...newGroups)
}

const toggleMonth = (index) => {
  const group = timelineGroups.value[index]
  group.isOpen = !group.isOpen
  if (group.isOpen && !group.loaded) fetchMonthData(index)
}

const fetchMonthData = async (index) => {
  const group = timelineGroups.value[index]
  group.isLoading = true
  const startStr = `${group.year}-${group.month}-01`
  const nextMonth = new Date(group.year, group.month, 1) 
  
  // ✨ 改动点：select里增加了 is_fan_work
  const { data } = await supabase.from('items')
    .select('id, name, price, market_price, image_url, character, category, author, release_date, is_fan_work')
    .eq('status', 'approved')
    .gte('release_date', startStr)
    .lt('release_date', nextMonth.toISOString())
    .order('release_date', { ascending: false })
    
  if (data) { group.items = data; group.loaded = true; }
  group.isLoading = false
}

const applyQuickFilter = () => { if (quickFilter.value) { searchInput.value = quickFilter.value; searchData(); quickFilter.value = '' } }

const searchData = async () => {
  const rawQ = searchInput.value.trim()
  if (!rawQ) return
  // ✨ 改动点：select里增加了 is_fan_work
  let query = supabase.from('items').select('id, name, price, market_price, image_url, character, category, author, release_date, is_fan_work').eq('status', 'approved')
  const keywords = rawQ.split(/\s+/).filter(k => k.length > 0)

  keywords.forEach(key => {
    const lowerKey = key.toLowerCase()
    if (/^\d{4}$/.test(key)) { query = query.gte('release_date', `${key}-01-01`).lte('release_date', `${key}-12-31`) } 
    else if (/^\d+$/.test(key) && key.length < 4) { query = query.eq('id', key) }
    else if (nicknameMap[lowerKey]) { query = query.ilike('character', `%${nicknameMap[lowerKey]}%`) }
    else if (categoryMap[lowerKey]) { query = query.ilike('category', `%${categoryMap[lowerKey]}%`) }
    else { query = query.or(`name.ilike.%${key}%,category.ilike.%${key}%,author.ilike.%${key}%`) }
  })
  
  query = query.order('release_date', { ascending: false, nullsFirst: false }).limit(50)
  const { data } = await query
  items.value = data || []
}

const handleInput = () => { if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(searchData, 500); }
const clearSearch = () => { searchInput.value = ''; items.value = []; }
</script>

<style scoped>
.container { width: 92%; max-width: 1200px; margin: 0 auto; padding: 20px; padding-bottom: 80px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.site-title { color: #39C5BB; text-align: center; margin-bottom: 20px; font-size: 1.8rem; }
.top-bar { display: flex; justify-content: flex-end; font-size: 13px; margin-bottom: 10px; color: #666; }
.auth-links a { color: #666; text-decoration: none; font-weight: bold; }
.auth-links a:hover { color: #39C5BB; }
.divider { margin: 0 8px; color: #ddd; }
.user-info { display: flex; gap: 15px; align-items: center; }
.profile-link { background: #e0f2f1; color: #00695c; padding: 4px 10px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 12px; transition: 0.2s; }

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

.card { background: white; border-radius: 10px; border: 1px solid #f0f0f0; overflow: hidden; text-decoration: none; color: inherit; position: relative; transition: transform 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.03); }
.card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); border-color: #39C5BB; }

/* ✨ 图片容器相关样式 */
.card-img-box { position: relative; width: 100%; aspect-ratio: 1/1; background: #fff; padding: 10px; box-sizing: border-box; }
.card-image { width: 100%; height: 100%; object-fit: contain; }
.id-badge { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.4); color: white; font-size: 10px; padding: 2px 5px; border-radius: 4px; z-index: 2; }

/* ✨ 同人标签样式 */
.fan-tag { 
  position: absolute; 
  top: 6px; 
  left: 6px; 
  background: rgba(255, 152, 0, 0.9); /* 橙色背景 */
  color: white; 
  font-size: 10px; 
  padding: 3px 6px; 
  border-radius: 4px; 
  z-index: 2; 
  font-weight: bold; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  backdrop-filter: blur(2px);
}

.card-info { padding: 10px; }
.tags { margin-bottom: 5px; }
.tag { font-size: 10px; padding: 2px 6px; background: #f0f0f0; border-radius: 4px; color: #666; }
.cat-tag { background-color: #f3e5f5; color: #4a148c; }
.char-tag { background-color: #e0f7fa; color: #006064; }
.card-title { font-size: 13px; margin: 0 0 8px 0; height: 2.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.card-footer { display: flex; justify-content: space-between; align-items: flex-end; } 
.price-box { display: flex; flex-direction: column; align-items: flex-start; }
.price { color: #ff5588; font-weight: bold; font-size: 15px; margin: 0; }
.original-crossed { text-decoration: line-through; color: #ccc; font-size: 12px; font-weight: normal; }
.market-price { color: #ff5500; font-weight: 800; font-size: 15px; margin: 0; }
.loading-state, .empty-month-state, .empty-state { color: #999; font-style: italic; padding: 20px 0; text-align: center; }
</style>