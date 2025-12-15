<template>
  <div class="container">
    <h1 class="site-title">初音未来周边图鉴</h1>
    
    <div class="toolbar">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="🔍 在已加载的结果中搜索..."
          class="search-input"
        >
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
      </div>

      <select v-model="sortBy" class="sort-select">
        <option value="newest">📅 最新上架</option>
        <option value="price_asc">💰 价格: 低 → 高</option>
        <option value="price_desc">💎 价格: 高 → 低</option>
      </select>
    </div>

    <div class="result-count">
      已展示 {{ filteredItems.length }} / 库里可能有更多
    </div>

    <div class="grid">
      <a 
        v-for="item in filteredItems" 
        :key="item.id" 
        :href="item.link" 
        target="_blank" 
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
      </a>
    </div>

    <div class="load-more-area">
      <div v-if="filteredItems.length === 0 && !isLoading" class="empty-state">
        😭 暂无数据
      </div>

      <button 
        v-if="hasMore" 
        @click="loadMore" 
        class="load-btn" 
        :disabled="isLoading"
      >
        {{ isLoading ? '正在搬运中...' : '✨ 加载更多 ✨' }}
      </button>
      
      <p v-else-if="items.length > 0" class="end-text">
        🎉 到底啦！你已经看完了所有库存。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rsktcmqaaycjxgwxgwxq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJza3RjbXFhYXljanhnd3hnd3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDE0MzUsImV4cCI6MjA4MTAxNzQzNX0.qw1KfL-ZOnwhhWQ0JYGuCLBAh4vTTi61B2ynpf5wv1g'
const supabase = createClient(supabaseUrl, supabaseKey)

const items = ref([])
const searchQuery = ref('')
const sortBy = ref('newest')

// ✨ 分页控制变量
const PAGE_SIZE = 24; // 每次拿24个（正好是3列或4列的倍数，好看）
const page = ref(0);  // 当前是第几页（从0开始）
const hasMore = ref(true); // 还有没有更多数据？
const isLoading = ref(false); // 是否正在加载中？

const updateSearch = (keyword) => {
  searchQuery.value = keyword
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ✨ 核心函数：去数据库进货
const loadData = async () => {
  if (isLoading.value) return; // 如果正在加载，别重复点
  isLoading.value = true;

  // 计算范围：比如第0页是 0-23，第1页是 24-47
  const from = page.value * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  console.log(`正在加载第 ${page.value} 页数据 (${from} - ${to})...`);

  // 1. 构建查询
  let query = supabase
    .from('items')
    .select('id, name, price, image_url, link, character, category')
    .range(from, to); // ✨ 关键：只要这一段

  // 2. 根据排序方式向数据库要数据 (服务端排序)
  if (sortBy.value === 'newest') {
    query = query.order('id', { ascending: false });
  } else if (sortBy.value === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (sortBy.value === 'price_desc') {
    query = query.order('price', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('加载失败:', error);
  } else {
    // 3. 把新货上架 (追加到 items 数组后面)
    if (data.length > 0) {
      items.value.push(...data);
      page.value++; // 准备好下一页
    }
    
    // 4. 如果拿回来的数据少于我们要的数量，说明后面没货了
    if (data.length < PAGE_SIZE) {
      hasMore.value = false;
    }
  }

  isLoading.value = false;
}

// 点击按钮时触发
const loadMore = () => {
  loadData();
}

// 页面一打开，先加载第一页
onMounted(() => {
  loadData();
})

// 前端筛选（只筛选已加载的数据）
const filteredItems = computed(() => {
  let result = items.value
  
  if (searchQuery.value) {
    const lowerQuery = searchQuery.value.toLowerCase()
    result = result.filter(item => {
      const nameMatch = (item.name || '').toLowerCase().includes(lowerQuery)
      const charMatch = (item.character || '').toLowerCase().includes(lowerQuery)
      const catMatch = (item.category || '').toLowerCase().includes(lowerQuery)
      return nameMatch || charMatch || catMatch
    })
  }
  return result; // 这里不再重复排序，因为数据库已经排好了
})
</script>

<style scoped>
  /* ✨ 1. 全局容器：加宽！从 1200 改到 1440，或者直接用百分比 */
  .container {
    width: 92%;           /* 占据屏幕 92% 的宽度，不再留大白边 */
    max-width: 1600px;    /* 限制最大宽度，防止在 4K 屏上太夸张 */
    margin: 0 auto;
    padding: 20px;
    padding-bottom: 80px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }
  
  .site-title { color: #39C5BB; text-align: center; margin-bottom: 25px; font-size: 1.8rem; }
  
  /* 2. 工具栏 */
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  
  .search-box {
    position: relative;
    flex: 1;
    min-width: 280px;
  }
  
  .search-input {
    width: 100%;
    padding: 12px 40px 12px 15px; /* 加高一点点 */
    border: 2px solid #eee;
    border-radius: 8px;
    font-size: 15px;
    outline: none;
    transition: border-color 0.3s;
  }
  
  .search-input:focus { border-color: #39C5BB; }
  .clear-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #999; cursor: pointer; }
  
  .sort-select {
    padding: 12px 15px; /* 加高一点点，跟搜索框对齐 */
    border: 2px solid #eee;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    outline: none;
    font-size: 14px;
    min-width: 140px;
  }
  
  .result-count {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }
  
  /* ✨ 3. 网格布局调整 (关键修改) */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 手机默认 2 列 */
    gap: 15px;
  }
  
  /* 📱 平板/小笔记本 (大于 640px): 变成 3 列 */
  @media (min-width: 640px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
  }
  
  /* 💻 普通笔记本 (大于 1024px): 变成 4 列 (之前是 5 列，太挤了) */
  @media (min-width: 1024px) {
    .grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 25px;
    }
  }
  
  /* 🖥️ 大屏台式机 (大于 1400px): 才变成 5 列 */
  @media (min-width: 1400px) {
    .grid {
      grid-template-columns: repeat(5, 1fr);
    }
  }
  
  /* ✨ 4. 卡片优化 */
  .card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    overflow: hidden;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
    border: 1px solid #f0f0f0;
  }
  
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    border-color: #39C5BB;
  }
  
  .card-image {
    width: 100%;
    aspect-ratio: 1 / 1; /* 保持正方形 */
    object-fit: contain; 
    background-color: #fff;
    padding: 15px; /* 稍微加大一点内边距，让图片不贴边 */
  }
  
  .card-info {
    padding: 12px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  .tags { display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap; }
  .tag { font-size: 11px; padding: 2px 6px; border-radius: 4px; background-color: #f5f5f5; color: #666; }
  .char-tag { background-color: #e0f7fa; color: #006064; }
  .cat-tag { background-color: #f3e5f5; color: #4a148c; }
  
  .card-title {
    font-size: 15px; /* 字号稍微加大 */
    margin: 0 0 8px 0;
    line-height: 1.4;
    color: #333;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    height: 2.8em; 
  }
  
  .price { color: #ff5588; font-weight: 700; font-size: 16px; margin: 0; text-align: left; }
  .load-more-area { margin-top: 40px; text-align: center; }
  .load-btn { background-color: white; color: #39C5BB; border: 1px solid #39C5BB; padding: 10px 30px; font-size: 15px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
  .load-btn:hover:not(:disabled) { background-color: #39C5BB; color: white; }
  .load-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .empty-state { text-align: center; color: #999; margin-top: 50px; font-size: 1.2rem; }
  .end-text { color: #999; font-size: 0.9rem; margin-top: 20px; }
  </style>