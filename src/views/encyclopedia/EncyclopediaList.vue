<template>
  <div class="encyclopedia-container">
    <div class="hero-header">
      <h1>📖 葱葱百科知识库</h1>
      <div class="search-bar">
        <input v-model="searchText" @keyup.enter="handleSearch" placeholder="搜索词条 (如: 荧光棒, 魔法未来)..." />
        <button @click="handleSearch">🔍</button>
      </div>
      <div class="quick-tags">
        <span v-for="tag in hotTags" :key="tag" @click="applyTag(tag)" class="tag-pill">#{{ tag }}</span>
      </div>
    </div>

    <div class="action-row">
      <h3>📚 最新收录</h3>
      <button class="btn-create" @click="$router.push('/encyclopedia/edit')">➕ 创建新词条</button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="entries.length > 0" class="entries-grid">
      <div v-for="entry in entries" :key="entry.id" class="entry-card" @click="$router.push(`/encyclopedia?id=${entry.id}`)">
        <div class="card-icon">{{ getIcon(entry.category) }}</div>
        <div class="card-body">
          <h4>{{ entry.title }}</h4>
          <p>{{ entry.summary || '暂无摘要' }}</p>
          <div class="card-tags">
            <span v-for="t in (entry.tags || []).slice(0,3)" :key="t" class="mini-tag">{{ t }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>未找到相关词条，<a @click="$router.push('/encyclopedia/edit')">去创建</a> 一个？</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// ✅ 修正路径：../../
import { getEncyclopediaEntries } from '../../services/encyclopediaData'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const entries = ref([])
const searchText = ref('')
const hotTags = ['应援棒', '魔法未来', '打call', '祭坛', '痛包', '雪未来']

onMounted(() => {
  if (route.query.q) {
    searchText.value = route.query.q
  }
  loadData()
})

watch(() => route.query.q, (newVal) => {
  searchText.value = newVal || ''
  loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    entries.value = await getEncyclopediaEntries(searchText.value)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  router.push({ query: { ...route.query, q: searchText.value } })
}

const applyTag = (tag) => {
  searchText.value = tag
  handleSearch()
}

const getIcon = (cat) => {
  const map = { '攻略': '📘', '历史': '📜', '周边': '🎁', '应援': '📢', '冷知识': '💡' }
  return map[cat] || '📄'
}
</script>

<style scoped>
.encyclopedia-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.hero-header { text-align: center; padding: 40px 20px; background: #fff8e1; border-radius: 16px; margin-bottom: 30px; border: 1px solid #ffe0b2; }
.hero-header h1 { margin: 0 0 20px 0; color: #f57c00; }

.search-bar { display: flex; max-width: 600px; margin: 0 auto 15px; background: white; padding: 5px; border-radius: 30px; box-shadow: 0 4px 10px rgba(245, 124, 0, 0.1); border: 1px solid #ffe0b2; }
.search-bar input { flex: 1; border: none; padding: 10px 20px; outline: none; font-size: 16px; border-radius: 30px; }
.search-bar button { background: #ff9800; color: white; border: none; padding: 0 25px; border-radius: 20px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.search-bar button:hover { background: #f57c00; }

.quick-tags { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.tag-pill { background: rgba(255, 255, 255, 0.6); color: #e65100; padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; border: 1px solid #ffe0b2; transition: 0.2s; }
.tag-pill:hover { background: white; border-color: #ff9800; }

.action-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.action-row h3 { margin: 0; color: #333; border-left: 4px solid #ff9800; padding-left: 10px; }
.btn-create { background: #39C5BB; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }

.loading-state { text-align: center; padding: 50px; }
.spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top: 4px solid #ff9800; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto; }
@keyframes spin { 100% {transform: rotate(360deg);} }

.entries-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.entry-card { background: white; border: 1px solid #eee; border-radius: 12px; padding: 20px; cursor: pointer; transition: 0.2s; display: flex; gap: 15px; }
.entry-card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); border-color: #ffcc80; }
.card-icon { font-size: 32px; background: #fff3e0; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 12px; flex-shrink: 0; }
.card-body h4 { margin: 0 0 5px 0; font-size: 16px; color: #333; }
.card-body p { margin: 0 0 10px 0; color: #666; font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-tags { display: flex; gap: 5px; }
.mini-tag { font-size: 11px; background: #f5f5f5; color: #888; padding: 2px 6px; border-radius: 4px; }

.empty-state { text-align: center; padding: 50px; color: #999; }
.empty-state a { color: #39C5BB; cursor: pointer; text-decoration: underline; }
</style>