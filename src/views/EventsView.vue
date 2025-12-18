<template>
  <div class="events-container">
    <div class="page-header">
      <h1>📅 官方活动情报</h1>
      <p>魔法未来 / MIKU EXPO / 雪未来 / 联名活动</p>
      
      <div class="filter-tabs">
        <button 
          v-for="cat in categories" 
          :key="cat" 
          :class="{ active: currentCategory === cat }"
          @click="currentCategory = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>正在读取情报...</p>
    </div>

    <div v-else-if="events.length > 0" class="events-list">
      <div v-for="ev in events" :key="ev.id" class="event-card" @click="goDetail(ev)">
        <div class="poster-wrapper">
          <img :src="ev.image_url" loading="lazy" />
          <div class="status-overlay" :class="getStatus(ev).class">
            {{ getStatus(ev).text }}
          </div>
        </div>
        <div class="event-info">
          <div class="date-badge">
            <span class="month">{{ getMonth(ev.release_date) }}月</span>
            <span class="day">{{ getDay(ev.release_date) }}</span>
          </div>
          <div class="info-main">
            <span class="cat-tag">{{ ev.category }}</span>
            <h3>{{ ev.name }}</h3>
            <p class="loc">📍 {{ ev.author || '地点待定' }}</p>
          </div>
          <button class="btn-arrow">➔</button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>📭 暂无此类活动情报</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getEvents } from '../services/eventData' // ✅ 使用新服务
import { OFFICIAL_EVENT_CATEGORIES } from '../constants'

const router = useRouter()
const loading = ref(true)
const events = ref([])
const currentCategory = ref('全部')

const categories = ['全部', ...OFFICIAL_EVENT_CATEGORIES]

onMounted(() => {
  loadEvents()
})

watch(currentCategory, () => {
  loadEvents()
})

const loadEvents = async () => {
  loading.value = true
  try {
    // 调用 Service 获取数据
    events.value = await getEvents(currentCategory.value)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const goDetail = (ev) => {
  if (ev.link && ev.link.startsWith('http')) window.open(ev.link, '_blank')
  else router.push(`/item/${ev.id}`)
}

// 辅助函数
const getStatus = (ev) => {
  const today = new Date().toISOString().split('T')[0]
  if (ev.release_date && today < ev.release_date) return { text: '即将开始', class: 'upcoming' }
  // 假设活动结束时间是 release_date 后推3天 (如果没有专门的 end_date 字段)
  // 实际项目中建议在数据库加 event_end_date 字段
  if (ev.release_date && today > ev.release_date) return { text: '进行中', class: 'active' }
  return { text: '进行中', class: 'active' }
}

const getMonth = (d) => d ? new Date(d).getMonth() + 1 : '?'
const getDay = (d) => d ? new Date(d).getDate() : '?'
</script>

<style scoped>
.events-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.page-header { text-align: center; margin-bottom: 40px; padding: 40px 20px; background: linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%); border-radius: 16px; color: white; box-shadow: 0 4px 15px rgba(142, 197, 252, 0.3); }
.page-header h1 { margin: 0 0 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.filter-tabs { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 25px; }
.filter-tabs button { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: white; padding: 6px 16px; border-radius: 20px; cursor: pointer; transition: 0.2s; font-size: 14px; backdrop-filter: blur(5px); }
.filter-tabs button.active { background: white; color: #8ec5fc; font-weight: bold; transform: scale(1.05); }
.filter-tabs button:hover:not(.active) { background: rgba(255,255,255,0.4); }

.loading-box { text-align: center; padding: 50px; color: #999; }
.spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #8ec5fc; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.events-list { display: grid; gap: 20px; }
.event-card { background: white; border-radius: 12px; overflow: hidden; display: flex; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: 0.2s; cursor: pointer; border: 1px solid #eee; }
.event-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); border-color: #8ec5fc; }

.poster-wrapper { width: 200px; position: relative; flex-shrink: 0; }
.poster-wrapper img { width: 100%; height: 100%; object-fit: cover; }
.status-overlay { position: absolute; top: 10px; left: 10px; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; }
.status-overlay.active { background: #00b894; }
.status-overlay.upcoming { background: #fdcb6e; color: #333; }

.event-info { flex: 1; padding: 20px; display: flex; align-items: center; gap: 20px; }
.date-badge { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 60px; height: 60px; background: #f8f9fa; border-radius: 12px; color: #555; flex-shrink: 0; }
.month { font-size: 12px; } .day { font-size: 24px; font-weight: bold; color: #8ec5fc; }

.info-main { flex: 1; }
.cat-tag { font-size: 12px; color: #a29bfe; background: #f3f0ff; padding: 2px 8px; border-radius: 4px; }
.info-main h3 { margin: 8px 0; font-size: 18px; color: #333; }
.loc { margin: 0; color: #999; font-size: 14px; }

.btn-arrow { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #eee; background: white; color: #ccc; font-size: 18px; cursor: pointer; transition: 0.2s; }
.event-card:hover .btn-arrow { background: #8ec5fc; color: white; border-color: #8ec5fc; }

.empty-state { text-align: center; padding: 60px; color: #aaa; }

@media (max-width: 600px) {
  .event-card { flex-direction: column; }
  .poster-wrapper { width: 100%; height: 150px; }
  .event-info { padding: 15px; }
}
</style>