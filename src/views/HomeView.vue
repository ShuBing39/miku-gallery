<template>
    <div class="container">
      <h1 class="site-title">初音未来周边图鉴</h1>
      
      <div class="toolbar">
        <div class="search-box">
          <input 
            v-model="searchInput" 
            type="text" 
            placeholder="🔍 搜索全库：手办、KAITO..."
            class="search-input"
            @input="handleInput"
          >
          <button v-if="searchInput" @click="clearSearch" class="clear-btn">✕</button>
        </div>
  
        <select v-model="sortBy" class="sort-select" @change="resetAndLoad">
          <option value="newest">📅 最新上架</option>
          <option value="price_asc">💰 价格: 低 → 高</option>
          <option value="price_desc">💎 价格: 高 → 低</option>
        </select>
      </div>
  
      <div class="result-count">
        <span v-if="isLoading && items.length === 0">正在从数据库搜索...</span>
        <span v-else>已展示 {{ items.length }} 个结果</span>
      </div>
  
      <div class="grid">
        <router-link 
          v-for="item in items" 
          :key="item.id" 
          :to="'/item/' + item.id"
          class="card"
        >
          <img :src="item.image_url" class="card-image" loading="lazy" />
          
          <div class="card-info">
            <div class="tags">
              <span v-if="item.character" class="tag char-tag" @click.prevent="updateSearch(item.character)">
                {{ item.character }}
              </span>
              <span v-if="item.category" class="tag cat-tag" @click.prevent="updateSearch(item.category)">
                {{ item.category }}
              </span>
            </div>
            <h3 class="card-title">{{ item.name }}</h3>
            <p class="price">¥{{ item.price }}</p>
          </div>
        </router-link>
      </div>
  
      <div class="load-more-area">
        <div v-if="items.length === 0 && !isLoading" class="empty-state">
          😭 数据库里找不到关于 "{{ searchQuery }}" 的周边...
        </div>
  
        <button 
          v-if="hasMore" 
          @click="loadData" 
          class="load-btn" 
          :disabled="isLoading"
        >
          {{ isLoading ? '正在搜索中...' : '✨ 加载更多 ✨' }}
        </button>
        
        <p v-else-if="items.length > 0" class="end-text">
          🎉 底裤都翻出来啦，没有更多了！
        </p>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch } from 'vue'
  import { createClient } from '@supabase/supabase-js'
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('🚨 致命错误：环境变量未设置！请检查 .env 文件。')
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // 核心数据
  const items = ref([])
  const searchInput = ref('') 
  const searchQuery = ref('') 
  const sortBy = ref('newest')
  
  // 分页控制
  const PAGE_SIZE = 24
  const page = ref(0)
  const hasMore = ref(true)
  const isLoading = ref(false)
  let debounceTimer = null
  
  // 核心升级：从数据库进货 (带搜索功能)
  const loadData = async () => {
    if (isLoading.value) return
    isLoading.value = true
  
    const from = page.value * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
  
    console.log(`📡 请求数据库: page=${page.value}, query="${searchQuery.value}"`)
  
    let query = supabase
      .from('items')
      .select('id, name, price, image_url, link, character, category, release_date')
      .range(from, to)
  
    if (searchQuery.value) {
      const q = searchQuery.value
      query = query.or(`name.ilike.%${q}%,character.ilike.%${q}%,category.ilike.%${q}%`)
    }
  
    // 排序逻辑
    if (sortBy.value === 'newest') {
      query = query.order('release_date', { ascending: false, nullsFirst: false })
                   .order('id', { ascending: true }) 
    } 
    else if (sortBy.value === 'price_asc') query = query.order('price', { ascending: true })
    else if (sortBy.value === 'price_desc') query = query.order('price', { ascending: false })
  
    const { data, error } = await query
  
    if (error) {
      console.error('API Error:', error)
    } else {
      if (page.value === 0) {
        items.value = data 
      } else {
        items.value.push(...data) 
      }
  
      if (data.length < PAGE_SIZE) hasMore.value = false
      else page.value++
    }
    
    isLoading.value = false
  }
  
  const resetAndLoad = () => {
    page.value = 0
    hasMore.value = true
    items.value = [] 
    loadData()
  }
  
  const updateSearch = (keyword) => {
    searchInput.value = keyword
    searchQuery.value = keyword 
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const clearSearch = () => {
    searchInput.value = ''
    searchQuery.value = ''
  }
  
  const handleInput = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchQuery.value = searchInput.value
    }, 500)
  }
  
  watch(searchQuery, () => {
    resetAndLoad()
  })
  
  onMounted(() => {
    loadData()
  })
  </script>
  
  <style scoped>
  /* 这里直接用你刚才发的样式，或者之前的样式，为了节省篇幅我就不重复粘贴了 */
  /* 记得保留 .container, .grid 等所有 CSS */
  .container {
    width: 92%;
    max-width: 1600px;
    margin: 0 auto;
    padding: 20px;
    padding-bottom: 80px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }
  
  .site-title { color: #39C5BB; text-align: center; margin-bottom: 25px; font-size: 1.8rem; }
  .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
  .search-box { position: relative; flex: 1; min-width: 280px; }
  .search-input { width: 100%; padding: 10px 40px 10px 15px; border: 2px solid #eee; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.3s; }
  .search-input:focus { border-color: #39C5BB; }
  .clear-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #999; cursor: pointer; }
  .sort-select { padding: 10px 15px; border: 2px solid #eee; border-radius: 8px; background: white; cursor: pointer; outline: none; font-size: 14px; min-width: 140px; }
  .result-count { font-size: 0.9rem; color: #666; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
  
  /* 网格布局 */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); 
    gap: 12px; 
  }
  @media (min-width: 640px) { .grid { grid-template-columns: repeat(3, 1fr); gap: 15px; } }
  @media (min-width: 1024px) { .grid { grid-template-columns: repeat(5, 1fr); gap: 20px; } }
  @media (min-width: 1440px) { .grid { grid-template-columns: repeat(6, 1fr); gap: 25px; } }
  
  /* 卡片样式 */
  .card {
    background: white;
    border-radius: 10px; 
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    overflow: hidden;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    text-decoration: none; /* 关键：去掉下划线 */
    color: inherit;
    border: 1px solid #f0f0f0;
    cursor: pointer;
  }
  
  .card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); border-color: #39C5BB; }
  .card-image { width: 100%; aspect-ratio: 1 / 1; object-fit: contain; background-color: #fff; padding: 10px; }
  .card-info { padding: 10px 12px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
  .tags { display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap; }
  .tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background-color: #f5f5f5; color: #666; cursor: pointer; transition: all 0.2s; }
  .tag:hover { filter: brightness(0.9); transform: scale(1.05); }
  .char-tag { background-color: #e0f7fa; color: #006064; }
  .cat-tag { background-color: #f3e5f5; color: #4a148c; }
  .card-title { font-size: 13px; margin: 0 0 6px 0; line-height: 1.4; color: #333; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.8em; }
  .price { color: #ff5588; font-weight: 700; font-size: 15px; margin: 0; text-align: left; }
  .load-more-area { margin-top: 40px; text-align: center; }
  .load-btn { background-color: white; color: #39C5BB; border: 1px solid #39C5BB; padding: 8px 25px; font-size: 14px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
  .load-btn:hover:not(:disabled) { background-color: #39C5BB; color: white; }
  .load-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .empty-state { text-align: center; color: #999; margin-top: 50px; font-size: 1.2rem; }
  .end-text { color: #999; font-size: 0.9rem; margin-top: 20px; }
  </style>