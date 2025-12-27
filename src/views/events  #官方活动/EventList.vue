<template>
  <div class="events-container">
    <div class="header-section">
      <h1>📅 官方活动情报</h1>
      <p>Official Event Information / 公式イベント情報</p>
      
      <div class="controls-wrapper">
        <div class="filter-bar">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            class="filter-chip"
            :class="{ active: currentCategory === cat.id }"
            @click="currentCategory = cat.id"
          >
            {{ cat.name }}
          </button>
        </div>

        <div class="toggle-row">
          <label class="toggle-switch">
            <input type="checkbox" v-model="hideEnded">
            <span class="slider"></span>
          </label>
          <span class="toggle-label">隐藏已结束的活动</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <div v-else class="events-grid">
      <div 
        v-for="event in filteredEvents" 
        :key="event.id" 
        class="event-card"
        :class="{ 'ended-card': isEnded(event) }" 
        @click="goToDetail(event.id)"
      >
        <div class="card-image">
          <img 
            :src="event.image_url || '/placeholder.png'" 
            :alt="event.title" 
            @error="handleImgError" 
          />
          
          <div class="status-overlay">
            <span class="status-tag" :class="getStatusClass(event)">{{ getStatusText(event) }}</span>
          </div>
        </div>

        <div class="card-content">
          <h3 class="title" :title="event.title">
            {{ event.title || 'No Title' }}
          </h3>
          
          <div class="meta-row">
            <span class="icon">📅</span>
            <span class="date-text">
              {{ formatDate(event.start_date) }} ~ {{ formatDate(event.end_date) }}
            </span>
          </div>
          
          <div class="meta-row">
            <span class="icon">📍</span>
            <span class="location-text">OFFICIAL / JAPAN</span>
          </div>

          <p class="description">
            {{ event.description || '...' }}
          </p>

          <div class="card-footer">
             <button class="btn-detail">詳細を見る →</button>
             <button v-if="isAdmin" class="btn-quick-edit" @click.stop="goToEdit(event.id)">
               ⚙️
             </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && filteredEvents.length === 0" class="empty-state">
      <p>🍃 No Events Found...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getEvents } from '../services/eventData'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const userStore = useUserStore()
const events = ref([])
const loading = ref(true)
const currentCategory = ref('all')
const hideEnded = ref(false) // 默认为 false，显示所有

const categories = [
  { id: 'all', name: 'ALL' },
  { id: 'concert', name: 'MAGICAL MIRAI' },
  { id: 'snow', name: 'SNOW MIKU' },
  { id: 'expo', name: 'MIKU EXPO' },
  { id: 'other', name: 'OTHERS' }
]

const isAdmin = computed(() => !!userStore.user)

onMounted(async () => {
  loading.value = true
  events.value = await getEvents()
  loading.value = false
})

const isEnded = (ev) => {
  if (!ev.end_date) return false
  const now = new Date()
  const end = new Date(ev.end_date)
  end.setHours(23, 59, 59, 999)
  return now > end
}

// ✅ 核心逻辑：双重过滤
const filteredEvents = computed(() => {
  let result = events.value

  // 1. 先过滤分类
  if (currentCategory.value !== 'all') {
    result = result.filter(e => {
      if (currentCategory.value === 'concert') return e.title.includes('マジカルミライ') || e.title.includes('魔法未来')
      if (currentCategory.value === 'snow') return e.title.includes('雪ミク') || e.title.includes('Snow Miku')
      if (currentCategory.value === 'expo') return e.title.includes('EXPO')
      return true // other 暂不细分
    })
  }

  // 2. 再过滤是否隐藏已结束
  if (hideEnded.value) {
    result = result.filter(e => !isEnded(e))
  }

  return result
})

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'TBD'
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

const getStatusText = (ev) => {
  if (isEnded(ev)) return '🏁 已结束'
  if (ev.life_cycle_status === 'reserving') return '🔥 抢票中'
  if (ev.life_cycle_status === 'active') return '🎉 进行中'
  return '受付中' 
}

const getStatusClass = (ev) => {
  if (isEnded(ev)) return 'status-gray'
  if (ev.life_cycle_status === 'reserving') return 'status-red'
  return 'status-green'
}

const handleImgError = (e) => {
  e.target.src = '/placeholder.png'
  e.target.onerror = null 
}

const goToDetail = (id) => {
  router.push(`/event/${id}`)
}

const goToEdit = (id) => {
  router.push(`/event/${id}`)
}
</script>

<style scoped>
.events-container { max-width: 1100px; margin: 0 auto; padding: 20px; min-height: 80vh; font-family: 'Segoe UI', sans-serif; }

.header-section { text-align: center; margin-bottom: 30px; padding: 30px 20px; background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); border-radius: 16px; color: #555; }
.header-section h1 { margin: 0 0 5px 0; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.1); letter-spacing: 1px; }
.header-section p { margin: 0 0 20px 0; color: #fff; opacity: 0.9; font-size: 0.9rem; }

.controls-wrapper { display: flex; flex-direction: column; align-items: center; gap: 15px; }

.filter-bar { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
.filter-chip { background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.5); padding: 5px 14px; border-radius: 20px; color: #fff; cursor: pointer; transition: 0.2s; backdrop-filter: blur(4px); font-size: 13px; font-weight: 500; }
.filter-chip.active, .filter-chip:hover { background: white; color: #2196f3; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

/* 🔥 开关样式 */
.toggle-row { display: flex; align-items: center; gap: 8px; color: white; font-size: 14px; background: rgba(0,0,0,0.1); padding: 5px 15px; border-radius: 20px; }
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.4); transition: .4s; border-radius: 20px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: #2196f3; }
input:checked + .slider:before { transform: translateX(16px); }

.events-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }

.event-card { background: white; border-radius: 10px; overflow: hidden; border: 1px solid #eee; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; display: flex; flex-direction: column; }
.event-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.06); }

/* 灰色卡片样式 */
.event-card.ended-card { filter: grayscale(100%); opacity: 0.7; }
.event-card.ended-card:hover { filter: grayscale(0%); opacity: 1; }

.card-image { height: 180px; background: #f0f0f0; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.card-image img { width: 100%; height: 100%; object-fit: cover; transition: 0.3s; display: block; }
.event-card:hover .card-image img { transform: scale(1.05); }
.card-image img[src*="placeholder"] { object-fit: contain; padding: 40px; opacity: 0.4; }

.status-overlay { position: absolute; top: 10px; left: 10px; }
.status-tag { padding: 4px 10px; border-radius: 4px; color: white; font-size: 11px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.status-green { background: #4caf50; }
.status-red { background: #ff5252; }
.status-gray { background: #757575; }

.card-content { padding: 16px; flex: 1; display: flex; flex-direction: column; }
.title { margin: 0 0 8px 0; font-size: 15px; color: #333; line-height: 1.5; font-weight: bold; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 45px; }

.meta-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #999; margin-bottom: 4px; }
.description { font-size: 12px; color: #777; margin: 12px 0 auto 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; opacity: 0.8; }

.card-footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #f9f9f9; display: flex; justify-content: space-between; align-items: center; }
.btn-detail { color: #2196f3; background: none; border: none; padding: 0; font-size: 12px; cursor: pointer; font-weight: 500; }
.btn-detail:hover { text-decoration: underline; }

.btn-quick-edit { background: none; border: none; font-size: 14px; cursor: pointer; color: #ddd; }
.btn-quick-edit:hover { color: #333; }

.loading-box, .empty-state { text-align: center; padding: 60px; color: #ccc; }
.spinner { margin: 0 auto 10px; width: 30px; height: 30px; border: 3px solid #eee; border-top-color: #2196f3; border-radius: 50%; animation: spin 1s infinite linear; }
@keyframes spin { 100% {transform: rotate(360deg);} }
</style>