<template>
  <div class="lobby-container">
    <div class="lobby-header">
      <div class="header-content">
        <h1>🛍️ 参团大厅</h1>
        <p>发现正在进行的同人团购 / 代购车队</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <input v-model="searchText" placeholder="搜索团购..." @keyup.enter="handleSearch">
          <button @click="handleSearch">🔍</button>
        </div>
        <button class="create-btn" @click="$router.push('/submit-group-buy')">
          ✨ 我要开团
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在寻找车队...</p>
    </div>

    <div v-else-if="list.length > 0" class="goods-grid">
      <div 
        v-for="item in list" 
        :key="item.id" 
        class="goods-card"
        @click="goToDetail(item.id)"
      >
        <div class="card-img-box">
          <img :src="getCoverImage(item)" class="card-img" loading="lazy">
          <div class="status-badge">进行中</div>
        </div>

        <div class="card-info">
          <h3 class="goods-title">{{ item.name }}</h3>
          
          <div class="price-row">
            <div class="price">
              <span class="symbol">¥</span>
              <span class="num">{{ getPriceDisplay(item) }}</span>
            </div>
            <div class="organizer">
              团长: {{ item.authorName || '未知' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">🍃</div>
      <p>暂时没有正在进行的团购</p>
      <button class="sub-btn" @click="$router.push('/submit-group-buy')">成为第一个团长</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'

const router = useRouter()
const list = ref([])
const loading = ref(true)
const searchText = ref('')

onMounted(() => {
  loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    // 1. 查 projects
    let query = supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (searchText.value) {
      query = query.ilike('name', `%${searchText.value}%`)
    }

    const { data, error } = await query
    if (error) throw error

    // 2. 解析 JSON 并收集 userIds
    const userIds = new Set()
    const parsedList = data.map(p => {
      let details = {}
      try {
        if (typeof p.description === 'string' && p.description.startsWith('{')) {
          details = JSON.parse(p.description)
        }
      } catch (e) {}
      
      if (p.uploader_id) userIds.add(p.uploader_id)

      return {
        ...p,
        parsedDetails: details,
        authorName: '加载中...'
      }
    })

    // 3. 批量查人 (✅ 修正：查 username)
    if (userIds.size > 0) {
      const { data: users, error: uError } = await supabase
        .from('profiles')
        .select('id, username') // 👈 这里改成了 username
        .in('id', Array.from(userIds))
      
      if (!uError && users) {
        const userMap = {}
        users.forEach(u => userMap[u.id] = u.username)
        
        parsedList.forEach(p => {
          p.authorName = userMap[p.uploader_id] || '未知用户'
        })
      }
    }

    // 4. 过滤拼团
    list.value = parsedList.filter(p => p.parsedDetails?.is_group_buy)

  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => loadData()

const goToDetail = (id) => {
  router.push(`/group-buy/${id}`)
}

// 辅助函数
const getCoverImage = (p) => {
  if (p.parsedDetails?.items && p.parsedDetails.items.length > 0) {
    return p.parsedDetails.items[0].image_url
  }
  return p.image_url || 'https://placehold.co/300x200?text=No+Img'
}

const getPriceDisplay = (p) => {
  const d = p.parsedDetails
  if (!d || !d.items || d.items.length === 0) return '??'
  
  // 简单找最低价
  const rate = d.exchange_rate || 0.055
  const fee = d.calculated_fee || 0
  
  const prices = d.items.map(i => Math.ceil((i.price||0)*rate + fee + (Number(i.adjust_price)||0)))
  return Math.min(...prices) + ' 起'
}
</script>

<style scoped>
.lobby-container { max-width: 1200px; margin: 0 auto; padding: 20px; min-height: 100vh; background: #f4f6f8; }

.lobby-header { background: white; padding: 30px; border-radius: 16px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.header-content h1 { margin: 0 0 5px 0; color: #333; font-size: 24px; }
.header-content p { margin: 0; color: #888; font-size: 14px; }

.header-actions { display: flex; gap: 15px; align-items: center; }
.search-box { display: flex; background: #f5f5f5; border-radius: 30px; padding: 5px 15px; border: 1px solid #eee; }
.search-box input { border: none; background: transparent; outline: none; padding: 8px; font-size: 14px; width: 200px; }
.search-box button { border: none; background: none; cursor: pointer; }

.create-btn { background: linear-gradient(135deg, #39C5BB, #42d392); color: white; border: none; padding: 10px 25px; border-radius: 30px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(57, 197, 187, 0.3); transition: 0.2s; }
.create-btn:hover { transform: translateY(-2px); }

.goods-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }

.goods-card { background: white; border-radius: 12px; overflow: hidden; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #eee; }
.goods-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); border-color: #39C5BB; }

.card-img-box { height: 200px; position: relative; overflow: hidden; background: #fafafa; }
.card-img { width: 100%; height: 100%; object-fit: cover; }
.status-badge { position: absolute; top: 10px; left: 10px; background: #39C5BB; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }

.card-info { padding: 15px; }
.goods-title { margin: 0 0 8px 0; font-size: 16px; color: #333; line-height: 1.4; height: 44px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

.price-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 5px; }
.price { color: #ff5252; font-weight: bold; }
.price .symbol { font-size: 12px; margin-right: 2px; }
.price .num { font-size: 20px; }
.organizer { font-size: 12px; color: #bbb; }

.loading-state, .empty-state { text-align: center; padding: 60px; color: #999; }
.empty-icon { font-size: 40px; margin-bottom: 10px; }
.sub-btn { margin-top: 15px; padding: 8px 20px; border: 1px solid #39C5BB; color: #39C5BB; background: white; border-radius: 20px; cursor: pointer; }
</style>