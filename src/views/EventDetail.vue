<template>
    <div class="event-detail-container">
      <div v-if="loading" class="loading-box">
        <div class="spinner"></div>
        <p>正在获取情报...</p>
      </div>
  
      <div v-else-if="event" class="content-box">
        <button class="back-btn" @click="$router.go(-1)">⬅ 返回列表</button>
  
        <div class="hero-section">
          <div class="poster-area">
            <img :src="fixUrl(event.image_url)" class="poster-img" />
          </div>
          
          <div class="info-area">
            <span class="category-tag">{{ event.category }}</span>
            <h1 class="title">{{ event.name }}</h1>
            
            <div class="meta-row">
              <div class="meta-item">
                <span class="label">📅 活动时间</span>
                <span class="value time-highlight">
                  {{ event.release_date || '待定' }} <span class="arrow">➔</span> {{ event.event_end_date || '待定' }}
                </span>
              </div>
              <div class="meta-item">
                <span class="label">📍 地点/主办</span>
                <span class="value">{{ event.author || '官方' }}</span>
              </div>
            </div>
  
            <div class="action-row">
              <button class="btn-official" @click="goOfficial">
                🌏 前往官方网页
              </button>
              <button class="btn-share" @click="copyLink">🔗 分享情报</button>
            </div>
          </div>
        </div>
  
        <div class="desc-section">
          <h3>📝 情报详情 (本地化)</h3>
          <div class="desc-content">
            <p v-if="event.description" style="white-space: pre-wrap;">{{ event.description }}</p>
            <p v-else class="empty-desc">
              🚧 管理员暂未填写中文介绍。<br>
              请点击上方按钮前往官网查看原始信息。
            </p>
          </div>
        </div>
      </div>
  
      <div v-else class="not-found">
        <p>未找到该活动信息</p>
        <button @click="$router.push('/events')">返回</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { getItemDetail } from '../services/itemData'
  import { fixUrl } from '../utils/formatters' // 🟢 引入 fixUrl
  
  const route = useRoute()
  const event = ref(null)
  const loading = ref(true)
  
  onMounted(async () => {
    loading.value = true
    try {
      event.value = await getItemDetail(route.params.id)
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  })
  
  const goOfficial = () => {
    const url = event.value.external_link || event.value.link
    if (url) {
      window.open(url, '_blank')
    } else {
      alert('暂无官方链接')
    }
  }
  
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('已复制本页链接')
  }
  </script>
  
  <style scoped>
  .event-detail-container { max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: 'Segoe UI', sans-serif; min-height: 80vh; }
  .loading-box { text-align: center; padding: 100px; color: #666; }
  .spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top: 4px solid #39C5BB; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 15px; }
  @keyframes spin { 100% {transform: rotate(360deg);} }
  
  .back-btn { background: none; border: 1px solid #ddd; padding: 6px 15px; border-radius: 20px; cursor: pointer; color: #666; margin-bottom: 20px; transition: 0.2s; }
  .back-btn:hover { border-color: #39C5BB; color: #39C5BB; }
  
  .hero-section { display: flex; gap: 30px; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.05); margin-bottom: 30px; }
  .poster-area { width: 300px; flex-shrink: 0; }
  .poster-img { width: 100%; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
  
  .info-area { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .category-tag { display: inline-block; background: #e3f2fd; color: #1565c0; padding: 4px 10px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; align-self: flex-start; }
  .title { margin: 0 0 20px; font-size: 28px; line-height: 1.3; color: #333; }
  
  .meta-row { display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 25px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
  .meta-item { display: flex; flex-direction: column; }
  .label { font-size: 12px; color: #888; margin-bottom: 4px; }
  .value { font-size: 16px; font-weight: 500; color: #333; }
  .time-highlight { color: #e91e63; font-weight: bold; font-family: monospace; font-size: 18px; }
  .arrow { color: #ccc; margin: 0 5px; }
  
  .action-row { display: flex; gap: 15px; }
  .btn-official { flex: 2; background: linear-gradient(135deg, #39C5BB, #009688); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 15px rgba(57, 197, 187, 0.3); }
  .btn-official:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(57, 197, 187, 0.4); }
  .btn-share { flex: 1; background: white; border: 1px solid #ddd; color: #555; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
  .btn-share:hover { background: #f5f5f5; }
  
  .desc-section { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
  .desc-section h3 { margin: 0 0 20px; border-left: 4px solid #39C5BB; padding-left: 12px; color: #333; }
  .desc-content { line-height: 1.8; color: #444; font-size: 15px; }
  .empty-desc { color: #999; font-style: italic; text-align: center; padding: 30px; background: #fafafa; border-radius: 8px; border: 1px dashed #eee; }
  
  @media (max-width: 768px) {
    .hero-section { flex-direction: column; }
    .poster-area { width: 100%; }
  }
  </style>