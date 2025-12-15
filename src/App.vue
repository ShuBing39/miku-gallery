<template>
  <div class="container">
    <h1 class="site-title">初音未来周边图鉴</h1>
    
    <div class="toolbar">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="🔍 搜：手办、KAITO、2025..."
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
      找到 {{ filteredItems.length }} 个宝贝
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
            <span 
              v-if="item.character" 
              class="tag char-tag"
              @click.prevent="updateSearch(item.character)"
            >
              {{ item.character }}
            </span>
            <span 
              v-if="item.category" 
              class="tag cat-tag"
              @click.prevent="updateSearch(item.category)"
            >
              {{ item.category }}
            </span>
          </div>

          <h3 class="card-title">{{ item.name }}</h3>
          <p class="price">¥{{ item.price }}</p>
        </div>
      </a>
    </div>

    <div v-if="filteredItems.length === 0" class="empty-state">
      😭 没找到这种周边...
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rsktcmqaaycjxgwxgwxq.supabase.co'
// ⚠️ 确保这里是你最新的 Key (Anon Public)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJza3RjbXFhYXljanhnd3hnd3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDE0MzUsImV4cCI6MjA4MTAxNzQzNX0.qw1KfL-ZOnwhhWQ0JYGuCLBAh4vTTi61B2ynpf5wv1g'

const supabase = createClient(supabaseUrl, supabaseKey)

const items = ref([])
const searchQuery = ref('')
const sortBy = ref('newest') // ✨ 默认按最新排序

// ✨ 新增函数：点击标签时调用
const updateSearch = (keyword) => {
  searchQuery.value = keyword
  // 自动滚动到顶部，体验更好
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const filteredItems = computed(() => {
  // 1. 先进行搜索筛选
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

  // 2. 再进行排序 ✨
  // 为了不修改原数组，我们用 spread operator [...] 复制一份
  return [...result].sort((a, b) => {
    if (sortBy.value === 'price_asc') {
      return a.price - b.price // 价格从低到高
    } else if (sortBy.value === 'price_desc') {
      return b.price - a.price // 价格从高到低
    } else {
      return b.id - a.id // 默认：ID越大越新
    }
  })
})

onMounted(async () => {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, price, image_url, link, character, category')
    .order('id', { ascending: false }) 
    
  if (data) items.value = data
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.site-title {
  color: #39C5BB; 
  text-align: center;
  margin-bottom: 20px;
}

/* ✨ 工具栏样式 */
.toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 20px; /* 右边留空给清除按钮 */
  border: 2px solid #eee;
  border-radius: 50px;
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #39C5BB;
  box-shadow: 0 0 8px rgba(57, 197, 187, 0.3);
}

.clear-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
}

.sort-select {
  padding: 12px 15px;
  border: 2px solid #eee;
  border-radius: 12px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  outline: none;
}

.result-count {
  text-align: center;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 30px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 25px;
}

.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  border: 1px solid transparent;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(57, 197, 187, 0.15);
  border-color: #39C5BB;
}

.card-image {
  width: 100%;
  height: 220px;
  object-fit: contain;
  display: block;
  background-color: #f8f9fa;
  padding: 10px;
}

.card-info {
  padding: 15px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: white;
}

.tags {
  display: flex;
  gap: 5px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.tag {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: bold;
  transition: all 0.2s;
  /* ✨ 新增：让标签看起来能点 */
  cursor: pointer;
}

.tag:hover {
  /* ✨ 新增：悬停变暗一点 */
  filter: brightness(0.9);
  transform: scale(1.05);
}

.char-tag { background-color: #e0f7fa; color: #006064; }
.cat-tag { background-color: #f3e5f5; color: #4a148c; }

.card-title {
  margin: 0 0 10px 0;
  font-size: 1rem;
  line-height: 1.5;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 3em; 
}

.price {
  color: #ff5588;
  font-weight: 800;
  font-size: 1.2rem;
  margin: 0;
  text-align: right;
}

.empty-state {
  text-align: center;
  color: #999;
  margin-top: 50px;
  font-size: 1.2rem;
}
</style>