<template>
  <div class="container">
    <h1 class="site-title">葱葱维基</h1>
    
    <div class="toolbar">
      <div class="search-box">
        <input 
          v-model="searchInput" 
          type="text" 
          placeholder="🔍 试搜: 葱 2025 / 徽章 Rella / ID 105"
          class="search-input"
          @input="handleInput"
        >
        <button v-if="searchInput" @click="clearSearch" class="clear-btn">✕</button>
      </div>
      
      <select v-model="quickFilter" class="filter-select" @change="applyQuickFilter">
        <option value="" disabled selected>📂 快速分类筛选...</option>
        <option value="手办">🗿 手办/模型</option>
        <option value="玩偶">🧸 毛绒玩偶</option>
        <option value="衣服">👕 服饰穿搭</option>
        <option value="徽章">📛 徽章/吧唧</option>
        <option value="立牌">🧍‍♀️ 亚克力立牌</option>
        <option value="应援棒">🔦 应援棒/灯</option>
        <option value="食品">🍪 食品/饮料</option>
        <option value="CD">💿 音乐/CD</option>
        <option value="画集">📚 书籍/画册</option>
        <option value="游戏">🎮 游戏联动</option>
        <option value="2025">📅 2025年新品</option>
        <option value="2024">📅 2024年往期</option>
      </select>
    </div>

    <div v-if="isSearchMode">
      <div class="result-count">
        🔍 关键词 "{{ searchInput }}" 匹配到 {{ items.length }} 个结果
      </div>
      
      <div v-if="items.length > 0" class="grid">
        <router-link v-for="item in items" :key="item.id" :to="'/item/' + item.id" class="card">
          <span class="id-badge">#{{ item.id }}</span>
          <img :src="item.image_url" class="card-image" loading="lazy" />
          <div class="card-info">
            <h3 class="card-title">{{ item.name }}</h3>
            <p v-if="item.author" class="author-tag">🎨 {{ item.author }}</p>
            <div class="card-footer">
               <p class="price">¥{{ item.price }}</p>
               <span class="date-tag">{{ item.release_date || '未知日期' }}</span>
            </div>
          </div>
        </router-link>
      </div>
      
      <div v-else class="empty-state">
        🤷‍♂️ 找不到相关周边...<br>
        <small>试试其他关键词</small>
      </div>
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
          <div v-if="group.isLoading" class="loading-state">⏳ 正在读取 {{ group.month }}月的数据...</div>
          <div v-else-if="group.items && group.items.length > 0" class="grid">
            <router-link v-for="item in group.items" :key="item.id" :to="'/item/' + item.id" class="card">
              <span class="id-badge">#{{ item.id }}</span>
              <img :src="item.image_url" class="card-image" loading="lazy" />
              <div class="card-info">
                <div class="tags">
                   <span class="tag char-tag">{{ item.character }}</span>
                   <span class="tag cat-tag">{{ item.category }}</span>
                </div>
                <h3 class="card-title">{{ item.name }}</h3>
                <p v-if="item.author" class="author-tag">🎨 {{ item.author }}</p>
                <div class="card-footer">
                   <p class="price">¥{{ item.price }}</p>
                   <span class="date-tag">{{ item.release_date ? item.release_date.slice(5) : '' }}</span>
                </div>
              </div>
            </router-link>
          </div>
          <div v-else class="empty-month-state">🍃 这个月没有收录新的周边哦</div>
        </div>
      </div>
      <button @click="loadMoreMonths" class="load-history-btn">📜 查看更早的历史月份</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// --- 搜索相关 ---
const searchInput = ref('')
const isSearchMode = computed(() => searchInput.value.trim() !== '')
const items = ref([]) 
const quickFilter = ref('') // ✨ 新增：快速筛选绑定值
let debounceTimer = null

// 🎭 昵称字典
const nicknameMap = {
  '葱': '初音未来', 'miku': '初音未来', '初音': '初音未来', 'ミク': '初音未来',
  '橘': '镜音铃', '铃': '镜音铃', 'rin': '镜音铃',
  '蕉': '镜音连', '连': '镜音连', 'len': '镜音连',
  '双子': '镜音双子', '镜音双子': '镜音双子',
  '章鱼': '巡音流歌', 'luka': '巡音流歌', '巡音': '巡音流歌',
  '大哥': 'KAITO', '冰': 'KAITO', 'kaito': 'KAITO',
  '大姐': 'MEIKO', '酒': 'MEIKO', 'meiko': 'MEIKO'
}

// 📦 分类映射字典
const categoryMap = {
  '手办': '手办模型', '模型': '手办模型', '粘土人': '手办模型',
  '衣服': '服饰穿搭', 't恤': '服饰穿搭', '痛衣': '服饰穿搭', '鞋': '服饰穿搭',
  '徽章': '徽章/吧唧', '吧唧': '徽章/吧唧', '铁片': '徽章/吧唧',
  '食品': '食品/饮料', '吃的': '食品/饮料', '饮料': '食品/饮料', '零食': '食品/饮料',
  '应援棒': '应援棒/灯', '棒子': '应援棒/灯', '灯': '应援棒/灯',
  '玩偶': '毛绒玩偶', '娃娃': '毛绒玩偶', '公仔': '毛绒玩偶',
  'cd': '音乐/CD', '唱片': '音乐/CD',
  '书': '书籍/画册', '画集': '书籍/画册',
  '立牌': '小谷子/立牌'
}

// --- 时间线相关 ---
const timelineGroups = ref([]) 
const initTimeline = () => {
  const now = new Date()
  const groups = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 - 1 - i, 1)
    groups.push({
      key: `${d.getFullYear()}-${d.getMonth()+1}`,
      year: d.getFullYear(), month: d.getMonth()+1, isOpen: i === 0, isLoading: false, loaded: false, items: []
    })
  }
  timelineGroups.value = groups
  if (groups.length > 0) fetchMonthData(0)
}
const loadMoreMonths = () => {
  const lastGroup = timelineGroups.value[timelineGroups.value.length - 1]
  const newGroups = []
  for (let i = 1; i <= 12; i++) {
    const d = new Date(lastGroup.year, lastGroup.month - 1 - i, 1)
    newGroups.push({
      key: `${d.getFullYear()}-${d.getMonth()+1}`,
      year: d.getFullYear(), month: d.getMonth()+1, isOpen: false, isLoading: false, loaded: false, items: []
    })
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
  const { data } = await supabase.from('items').select('id, name, price, image_url, character, category, author, release_date').gte('release_date', startStr).lt('release_date', nextMonth.toISOString()).order('release_date', { ascending: false })
  if (data) { group.items = data; group.loaded = true; }
  group.isLoading = false
}

// ✨ 新增：快速筛选逻辑
const applyQuickFilter = () => {
  if (quickFilter.value) {
    searchInput.value = quickFilter.value // 把下拉菜单的值填进搜索框
    searchData() // 触发搜索
    quickFilter.value = '' // 选完后重置下拉框，方便下次选
  }
}

const searchData = async () => {
  const rawQ = searchInput.value.trim()
  if (!rawQ) return

  let query = supabase.from('items').select('id, name, price, image_url, character, category, author, release_date')
  const keywords = rawQ.split(/\s+/).filter(k => k.length > 0)

  keywords.forEach(key => {
    const lowerKey = key.toLowerCase()

    if (monthMatch(key)) { /* ...日期逻辑... */ } 
    
    // 1. 📅 月份/日期
    const monthMatchResult = key.match(/^(\d{4})[./-](\d{1,2})$/)
    const cnMonthMatchResult = key.match(/^(\d{4})年(\d{1,2})月$/)
    if (monthMatchResult || cnMonthMatchResult) {
      const y = monthMatchResult ? monthMatchResult[1] : cnMonthMatchResult[1]
      const m = monthMatchResult ? monthMatchResult[2] : cnMonthMatchResult[2]
      const start = `${y}-${m}-01`
      const nextM = new Date(y, m, 1)
      query = query.gte('release_date', start).lt('release_date', nextM.toISOString())
    }
    // 2. 📅 年份
    else if (/^\d{4}$/.test(key)) {
      query = query.gte('release_date', `${key}-01-01`).lte('release_date', `${key}-12-31`)
    } 
    // 3. 🆔 ID
    else if (/^\d+$/.test(key) && key.length < 4) {
      query = query.eq('id', key)
    }
    // 4. 🎭 昵称
    else if (nicknameMap[lowerKey]) {
      query = query.ilike('character', `%${nicknameMap[lowerKey]}%`)
    }
    // 5. 📦 分类
    else if (categoryMap[lowerKey]) {
      query = query.ilike('category', `%${categoryMap[lowerKey]}%`)
    }
    // 6. 📝 文本搜索
    else {
      query = query.or(`name.ilike.%${key}%,category.ilike.%${key}%,author.ilike.%${key}%`)
    }
  })
  
  // 🗑️ 删掉了 sortBy 的判断，直接强制按最新排序
  query = query.order('release_date', { ascending: false, nullsFirst: false })
  query = query.limit(50)
  
  const { data } = await query
  items.value = data || []
}

// 辅助函数：避免 searchData 里逻辑太乱
const monthMatch = (key) => key.match(/^(\d{4})[./-](\d{1,2})$/) || key.match(/^(\d{4})年(\d{1,2})月$/)

const handleInput = () => { if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(searchData, 500); }
const clearSearch = () => { searchInput.value = ''; items.value = []; }

onMounted(() => { initTimeline() })
</script>

<style scoped>
/* 保持原样 */
.container { width: 92%; max-width: 1200px; margin: 0 auto; padding: 20px; padding-bottom: 80px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.site-title { color: #39C5BB; text-align: center; margin-bottom: 30px; font-size: 1.8rem; }
.toolbar { margin-bottom: 30px; display: flex; gap: 10px; }
.search-box { flex: 1; position: relative; }
.search-input { width: 100%; padding: 12px 15px; border: 2px solid #eee; border-radius: 8px; font-size: 14px; transition: 0.3s; }
.search-input:focus { border-color: #39C5BB; outline: none; }
.clear-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); border: none; background: none; color: #999; cursor: pointer; }

/* ✨ 改动：筛选下拉框样式 */
.filter-select { 
  padding: 0 15px; 
  border: 2px solid #eee; 
  border-radius: 8px; 
  background: white; 
  cursor: pointer; 
  height: 42px; 
  font-size: 13px;
  color: #555;
  min-width: 130px;
}
.filter-select:hover { border-color: #39C5BB; }

/* 其他样式保持不变... */
.timeline-container { position: relative; border-left: 2px solid #e0e0e0; margin-left: 10px; padding-left: 30px; }
.month-section { margin-bottom: 20px; }
.month-header { position: relative; cursor: pointer; padding: 10px 0; display: flex; align-items: center; transition: all 0.2s; }
.month-header:hover .month-title { color: #39C5BB; }
.timeline-dot { position: absolute; left: -37px; width: 12px; height: 12px; background: white; border: 3px solid #ccc; border-radius: 50%; transition: 0.3s; }
.month-header.active .timeline-dot { border-color: #39C5BB; background: #39C5BB; transform: scale(1.2); }
.month-title { font-size: 1.2rem; color: #555; margin: 0; font-weight: bold; }
.month-header.active .month-title { color: #333; font-size: 1.4rem; }
.toggle-icon { font-size: 0.8rem; color: #999; margin-left: 8px; vertical-align: middle; }
.month-content { padding-top: 15px; padding-bottom: 20px; animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.loading-state, .empty-month-state, .empty-state { color: #999; font-style: italic; padding: 20px 0; text-align: center; }
.load-history-btn { display: block; width: 100%; padding: 15px; background: #f9f9f9; border: 1px dashed #ccc; color: #666; cursor: pointer; margin-top: 30px; border-radius: 8px; transition: 0.2s; }
.load-history-btn:hover { background: #f0f0f0; color: #333; border-color: #999; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
@media (min-width: 640px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(5, 1fr); } }
.card { background: white; border-radius: 10px; border: 1px solid #f0f0f0; overflow: hidden; text-decoration: none; color: inherit; position: relative; transition: transform 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.03); }
.card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); border-color: #39C5BB; }
.id-badge { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.4); color: white; font-size: 10px; padding: 2px 5px; border-radius: 4px; z-index: 2; }
.card-image { width: 100%; aspect-ratio: 1/1; object-fit: contain; padding: 10px; background: #fff; }
.card-info { padding: 10px; }
.tags { margin-bottom: 5px; }
.tag { font-size: 10px; padding: 2px 6px; background: #f0f0f0; border-radius: 4px; color: #666; }
.cat-tag { background-color: #f3e5f5; color: #4a148c; }
.char-tag { background-color: #e0f7fa; color: #006064; }
.card-title { font-size: 13px; margin: 0 0 8px 0; height: 2.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.card-footer { display: flex; justify-content: space-between; align-items: baseline; }
.price { color: #ff5588; font-weight: bold; font-size: 15px; margin: 0; }
.date-tag { font-size: 11px; color: #bbb; }
.author-tag { font-size: 11px; color: #39C5BB; margin: 0 0 5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
</style>