<template>
  <div class="projects-hall">
    <div class="hall-header">
      <h1>🤝 企划大厅</h1>
      <p>加入同人创作，为爱发电</p>
      
      <div class="actions">
        <div class="search-bar">
          <input v-model="searchText" placeholder="搜索企划..." @keyup.enter="handleSearch" />
          <button @click="handleSearch">🔍</button>
        </div>
        <button class="btn-create" @click="$router.push('/submit-project')">+ 发起新企划</button>
      </div>
    </div>

    <div class="promo-section" v-if="promotedProjects.length > 0">
      <h3 class="promo-title">🌟 新星企划招募中</h3>
      <div class="promo-grid">
        <div v-for="p in promotedProjects" :key="p.id" class="promo-card" @click="goToDetail(p.id)">
          <div class="promo-img" :style="p.image_url ? { backgroundImage: `url(${p.image_url})` } : {}">
            <span class="status-badge">急募</span>
          </div>
          <div class="promo-info">
            <h4>{{ p.name }}</h4>
            <p>{{ p.description ? p.description.slice(0, 30) + '...' : '' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>正在加载企划...</p>
    </div>

    <div v-else-if="projects.length > 0" class="projects-grid">
      <div v-for="p in projects" :key="p.id" class="project-card" @click="goToDetail(p.id)">
        <div class="card-cover" :style="p.image_url ? { backgroundImage: `url(${p.image_url})` } : { backgroundColor: '#ddd' }">
          <span class="status-tag" :class="p.recruit_status">
            {{ getStatusText(p.recruit_status) }}
          </span>
        </div>
        <div class="card-body">
          <h3 class="card-title">{{ p.name }}</h3>
          <p class="card-desc">{{ p.description ? p.description.slice(0, 40) + '...' : '暂无描述' }}</p>
          <div class="card-footer">
            <span class="author">👤 {{ p.uploader_name || '未知' }}</span>
            <span class="time">{{ formatDate(p.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>🍃 暂时没有符合条件的企划</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProjectsList, getPromotedProjects, incrementView } from '../services/projectData'
import { formatDate } from '../utils/formatters'

const router = useRouter()
const projects = ref([])
const promotedProjects = ref([])
const loading = ref(true)
const searchText = ref('')

onMounted(() => {
  loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    const [list, promo] = await Promise.all([
      getProjectsList(searchText.value),
      getPromotedProjects() // 获取宣传位数据
    ])
    projects.value = list
    promotedProjects.value = promo
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => loadData()

const goToDetail = (id) => {
  incrementView(id)
  router.push(`/project/${id}`)
}

const getStatusText = (s) => ({ recruiting:'招募中', ongoing:'进行中', paused:'暂停', ended:'已结束' }[s] || s)
</script>

<style scoped>
.projects-hall { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.hall-header { text-align: center; margin-bottom: 30px; padding: 30px 0; background: linear-gradient(to right, #e0f7fa, #f3e5f5); border-radius: 16px; }
.hall-header h1 { margin: 0 0 10px; color: #333; }
.hall-header p { color: #666; margin-bottom: 20px; }
.actions { display: flex; justify-content: center; gap: 15px; }
.search-bar { display: flex; background: white; padding: 5px; border-radius: 30px; border: 1px solid #ddd; }
.search-bar input { border: none; padding: 8px 15px; outline: none; }
.search-bar button { border: none; background: none; cursor: pointer; }
.btn-create { background: #39C5BB; color: white; border: none; padding: 8px 20px; border-radius: 30px; font-weight: bold; cursor: pointer; }

/* 🌟 宣传栏样式 */
.promo-section { margin-bottom: 40px; }
.promo-title { font-size: 18px; margin-bottom: 15px; color: #333; border-left: 4px solid #ff9800; padding-left: 10px; }
.promo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.promo-card { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); cursor: pointer; transition: 0.2s; border: 1px solid #ffe0b2; }
.promo-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(255, 152, 0, 0.15); }
.promo-img { height: 120px; background-size: cover; background-position: center; position: relative; background-color: #eee; }
.status-badge { position: absolute; top: 10px; right: 10px; background: #ff9800; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
.promo-info { padding: 10px; }
.promo-info h4 { margin: 0 0 5px; font-size: 14px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.promo-info p { margin: 0; font-size: 11px; color: #888; }

/* 列表网格 */
.projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
.project-card { background: white; border-radius: 12px; overflow: hidden; border: 1px solid #f0f0f0; cursor: pointer; transition: 0.2s; }
.project-card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
.card-cover { height: 140px; background-size: cover; background-position: center; position: relative; }
.status-tag { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; padding: 3px 6px; border-radius: 4px; font-size: 10px; }
.status-tag.recruiting { background: #39C5BB; }
.card-body { padding: 12px; }
.card-title { margin: 0 0 6px; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-desc { font-size: 12px; color: #888; margin-bottom: 10px; height: 32px; overflow: hidden; }
.card-footer { display: flex; justify-content: space-between; font-size: 11px; color: #aaa; border-top: 1px solid #f5f5f5; padding-top: 8px; }
</style>