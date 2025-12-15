<template>
  <div class="container">
    <h1 class="site-title">初音未来周边图鉴</h1>
    
    <div class="search-box">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="🔍 输入关键词搜索（如：雪ミク、2025...）"
        class="search-input"
      >
      <span class="result-count">找到 {{ filteredItems.length }} 个宝贝</span>
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
          <h3 class="card-title">{{ item.name }}</h3>
          <p class="price">¥{{ item.price }}</p>
        </div>
      </a>
    </div>

    <div v-if="filteredItems.length === 0" class="empty-state">
      😭 没找到你想要的周边...
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue' // ✨ 引入 computed
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rsktcmqaaycjxgwxgwxq.supabase.co'
// 为了方便，Key 继续放这里（虽然不完美但能用）
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJza3RjbXFhYXljanhnd3hnd3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDE0MzUsImV4cCI6MjA4MTAxNzQzNX0.qw1KfL-ZOnwhhWQ0JYGuCLBAh4vTTi61B2ynpf5wv1g'

const supabase = createClient(supabaseUrl, supabaseKey)

const items = ref([])       // 存放所有数据
const searchQuery = ref('') // ✨ 存放用户输入的搜索词

// ✨ 核心魔法：计算属性
// 只要 searchQuery 变了，这个结果会自动重新计算
const filteredItems = computed(() => {
  // 如果搜索框是空的，就返回所有
  if (!searchQuery.value) return items.value
  
  // 否则，筛选出名字里包含搜索词的商品
  const lowerQuery = searchQuery.value.toLowerCase()
  return items.value.filter(item => 
    item.name && item.name.toLowerCase().includes(lowerQuery)
  )
})

onMounted(async () => {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, price, image_url, link')
    // 按 ID 倒序排列，新的在前面
    .order('id', { ascending: false }) 
    
  if (data) {
    items.value = data
  } else {
    console.error(error)
  }
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
  margin-bottom: 30px;
}

/* ✨ 搜索框样式 */
.search-box {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.search-input {
  width: 100%;
  max-width: 400px;
  padding: 12px 20px;
  border: 2px solid #eee;
  border-radius: 50px; /* 圆溜溜的搜索框 */
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #39C5BB; /* 聚焦时变初音绿 */
  box-shadow: 0 0 8px rgba(57, 197, 187, 0.3);
}

.result-count {
  color: #666;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  color: #999;
  margin-top: 50px;
  font-size: 1.2rem;
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
  box-shadow: 0 15px 30px rgba(57, 197, 187, 0.15); /* 悬停时带点绿色的光晕 */
  border-color: #39C5BB;
}

.card-image {
  width: 100%;
  height: 220px;
  object-fit: contain;
  display: block;
  background-color: #f8f9fa;
  padding: 10px; /* 给图片一点呼吸空间 */
}

.card-info {
  padding: 15px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: white;
}

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
  color: #ff5588; /* 换个更醒目的粉色 */
  font-weight: 800;
  font-size: 1.2rem;
  margin: 0;
  text-align: right; /* 价格靠右放 */
}
</style>