<template>
    <div class="kb-container">
      <div class="kb-header">
        <button class="back-btn" @click="$router.push('/')">⬅ 返回首页</button>
        <h1>📖 葱葱百科</h1>
        <p>初音未来相关知识、演唱会攻略、应援文化科普</p>
        
        <div class="big-search-box">
          <input 
            v-model="searchQuery" 
            @input="handleSearch" 
            placeholder="🔍 搜索问题 (如: 应援棒去哪买、门票怎么抽)"
            class="kb-search-input"
          />
          <button class="create-btn" @click="$router.push('/encyclopedia/edit')">➕ 创建新词条</button>
        </div>
      </div>
  
      <div class="kb-content">
        <div v-if="loading" class="loading">📡 正在分析您的问题...</div>
  
        <div v-else-if="articles.length > 0" class="article-list">
          <h3 v-if="searchQuery">💡 猜您想问：</h3>
          <h3 v-else>✨ 热门科普</h3>
  
          <div class="grid">
            <div v-for="art in articles" :key="art.id" class="article-card" @click="openArticle(art)">
              <div class="art-body">
                <div class="art-main">
                  <h2 class="art-title">{{ art.title }}</h2>
                  <div class="art-meta">
                    <span v-if="art.matchedTag" class="tag match-tag">🎯 命中: {{ art.matchedTag }}</span>
                    <span v-else class="tag">{{ art.category }}</span>
                    
                    <span class="time">更新于 {{ formatDate(art.updated_at) }}</span>
                  </div>
                  <p class="art-snippet">{{ getSnippet(art.content) }}</p>
                </div>
                <div v-if="art.image_url" class="art-img-box">
                  <img :src="art.image_url" class="art-thumb">
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <div v-else class="empty-state">
          <p>🛸 看起来知识库里还没有收录这个问题</p>
          <div v-if="searchQuery">
            <p>核心关键词可能是：<strong>{{ extractKeyword(searchQuery) }}</strong></p>
            <button class="create-link" @click="$router.push('/encyclopedia/edit?title=' + searchQuery)">
              🚀 我知道答案！点此创建 "{{ searchQuery }}" 词条
            </button>
          </div>
        </div>
      </div>
  
      <div v-if="selectedArticle" class="modal-overlay" @click.self="selectedArticle = null">
        <div class="modal-content read-mode">
          <button class="close-btn" @click="selectedArticle = null">✕</button>
          <div class="article-header">
            <span class="cat-badge">{{ selectedArticle.category }}</span>
            <h1>{{ selectedArticle.title }}</h1>
            <div class="meta-info">
              <span>最后编辑: {{ selectedArticle.editor_name || '热心葱粉' }}</span>
              <span>{{ formatDate(selectedArticle.updated_at) }}</span>
              <button class="edit-link" @click="goToEdit(selectedArticle.id)">✎ 编辑 / 完善此条</button>
            </div>
          </div>
          <div class="article-body">
            <img v-if="selectedArticle.image_url" :src="selectedArticle.image_url" class="hero-img">
            <div class="text-content" v-html="formatContent(selectedArticle.content)"></div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { createClient } from '@supabase/supabase-js'
  import { useRouter, useRoute } from 'vue-router'
  
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  const router = useRouter()
  const route = useRoute()
  
  const articles = ref([])
  const loading = ref(false)
  const searchQuery = ref('')
  const selectedArticle = ref(null)
  let debounceTimer = null
  
  onMounted(() => {
    if (route.query.q) {
      searchQuery.value = route.query.q
    }
    fetchArticles()
  })
  
  const handleSearch = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(fetchArticles, 300)
  }
  
  // 🔥 核心：智能搜索逻辑
  const fetchArticles = async () => {
    loading.value = true
    
    // 1. 获取所有文章 (量大时应改为后端 Search，但目前前端过滤效果最好)
    // 我们只取最近的 100 条热数据进行匹配，保证速度
    const { data } = await supabase.from('wiki_articles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100)
  
    if (!data) {
      articles.value = []
      loading.value = false
      return
    }
  
    const query = searchQuery.value.trim().toLowerCase()
  
    if (!query) {
      // 没搜索词，直接显示最新的
      articles.value = data
    } else {
      // 🔥 混合匹配算法
      const matched = data.map(item => {
        let score = 0
        let matchedTag = null
  
        // A. 正向匹配：标题包含搜索词 (权重最高)
        if (item.title.toLowerCase().includes(query)) score += 10
  
        // B. 逆向匹配：搜索词包含了文章的 Tag (核心逻辑)
        // 例如用户搜 "应援棒哪里买"，文章Tag是 "应援棒" -> 命中！
        if (item.tags && Array.isArray(item.tags)) {
          for (const tag of item.tags) {
            if (query.includes(tag.toLowerCase())) {
              score += 5
              matchedTag = tag
              break // 命中一个即可
            }
          }
        }
  
        // C. 正向匹配：内容包含搜索词 (权重低)
        if (item.content.toLowerCase().includes(query)) score += 1
  
        return { ...item, score, matchedTag }
      })
      
      // 过滤掉无匹配的，并按分数排序
      articles.value = matched
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
    }
  
    loading.value = false
  }
  
  // 简单的关键词提取展示 (用于空状态引导)
  const extractKeyword = (str) => {
    if (str.length > 10) return str.slice(0, 5) + '...'
    return str
  }
  
  const openArticle = async (art) => {
    if (art.last_updated_by && !art.editor_name) {
      const { data } = await supabase.from('profiles').select('username').eq('id', art.last_updated_by).single()
      art.editor_name = data?.username
    }
    selectedArticle.value = art
  }
  
  const goToEdit = (id) => {
    router.push(`/encyclopedia/edit?id=${id}`)
  }
  
  const formatDate = (s) => s ? new Date(s).toLocaleDateString() : ''
  const getSnippet = (text) => text ? text.slice(0, 80) + '...' : ''
  const formatContent = (text) => text ? text.replace(/\n/g, '<br>') : ''
  </script>
  
  <style scoped>
  .kb-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; min-height: 100vh; }
  .kb-header { text-align: center; margin-bottom: 40px; padding: 40px 20px; background: linear-gradient(135deg, #e0f7fa 0%, #fff 100%); border-radius: 16px; position: relative; }
  .back-btn { position: absolute; top: 20px; left: 20px; border: 1px solid #ddd; background: white; padding: 5px 15px; border-radius: 20px; cursor: pointer; color: #666; font-weight: bold; }
  .kb-header h1 { color: #00695c; margin-bottom: 10px; font-size: 2.5em; }
  .kb-header p { color: #555; margin-bottom: 25px; }
  
  .big-search-box { display: flex; max-width: 700px; margin: 0 auto; gap: 10px; }
  .kb-search-input { flex: 1; padding: 15px 25px; border: 2px solid #39C5BB; border-radius: 30px; font-size: 16px; outline: none; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.2); }
  .create-btn { padding: 0 25px; background: #39C5BB; color: white; border: none; border-radius: 30px; font-weight: bold; cursor: pointer; white-space: nowrap; }
  
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
  .article-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #eee; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.03); }
  .article-card:hover { transform: translateY(-3px); border-color: #39C5BB; box-shadow: 0 8px 20px rgba(57, 197, 187, 0.15); }
  
  .art-body { display: flex; justify-content: space-between; gap: 15px; }
  .art-main { flex: 1; }
  .art-title { margin: 0 0 8px 0; color: #333; font-size: 18px; }
  .art-meta { display: flex; gap: 10px; font-size: 12px; color: #999; margin-bottom: 10px; align-items: center; }
  .tag { background: #e0f2f1; color: #00695c; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
  .tag.match-tag { background: #fff3e0; color: #e65100; border: 1px solid #ffe0b2; } /* 命中的Tag高亮 */
  
  .art-snippet { color: #666; font-size: 14px; line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .art-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; background: #eee; border: 1px solid #f0f0f0; }
  
  .empty-state { text-align: center; padding: 60px; color: #999; }
  .create-link { margin-top: 15px; background: white; border: 2px dashed #39C5BB; color: #39C5BB; padding: 12px 30px; border-radius: 30px; cursor: pointer; font-weight: bold; font-size: 15px; }
  
  /* 弹窗 */
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 2000; backdrop-filter: blur(4px); }
  .modal-content.read-mode { width: 800px; max-width: 90%; max-height: 85vh; overflow-y: auto; background: white; padding: 40px; border-radius: 16px; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
  .close-btn { position: absolute; top: 20px; right: 20px; font-size: 24px; background: none; border: none; cursor: pointer; color: #bbb; }
  .article-header { border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
  .cat-badge { background: #39C5BB; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 10px; }
  .article-header h1 { margin: 5px 0 15px 0; font-size: 32px; color: #333; }
  .meta-info { color: #999; font-size: 13px; display: flex; gap: 20px; align-items: center; }
  .edit-link { border: 1px solid #ddd; background: white; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-size: 12px; color: #555; }
  .edit-link:hover { color: #39C5BB; border-color: #39C5BB; }
  .hero-img { width: 100%; max-height: 350px; object-fit: cover; border-radius: 12px; margin-bottom: 30px; border: 1px solid #eee; }
  .text-content { font-size: 16px; line-height: 1.8; color: #444; white-space: pre-wrap; }
  </style>