<template>
  <div class="detail-container">
    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="item" class="content-wrapper">
      <button class="back-btn" @click="$router.go(-1)">⬅ 返回</button>
      
      <div class="top-section">
        <div class="img-box">
          <img :src="fixUrl(item.image_url)" class="main-img" @click="openLightbox" />
        </div>
        
        <div class="info-box">
          <div class="tags">
            <span class="tag cat">{{ item.category }}</span>
            <span v-if="item.is_fan_work" class="tag fan">同人作品</span>
          </div>
          
          <h1 class="title">{{ item.name }}</h1>
          
          <div class="meta-grid">
            <div class="meta-item">
              <span class="label">📅 发售日期</span>
              <span class="value">{{ formatDate(item.release_date) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">🎨 制作/发行</span>
              <span class="value">{{ item.author || '未知' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">💰 参考价格</span>
              <span class="value price">¥{{ item.price }}</span>
            </div>
            <div class="meta-item">
              <span class="label">👤 对应角色</span>
              <span class="value">{{ item.character || '初音未来' }}</span>
            </div>
          </div>

          <div class="action-bar">
            <button class="btn-like" @click="handleLike">❤️ 想要</button>
            <button class="btn-share" @click="copyLink">🔗 分享</button>
          </div>
        </div>
      </div>

      <div class="bottom-section">
        <div class="desc-panel">
          <h3>📝 详细介绍</h3>
          <p class="desc-text">{{ item.description || '暂无详细介绍...' }}</p>
        </div>

        <div class="comment-panel">
          <h3>💬 大家的讨论 ({{ comments.length }})</h3>
          
          <div class="comment-list">
            <div v-for="c in comments" :key="c.id" class="comment-row">
              <div class="c-user">{{ c.username }}</div>
              <div class="c-content">{{ c.content }}</div>
              <div class="c-time">{{ formatDate(c.created_at) }}</div>
            </div>
            <div v-if="comments.length === 0" class="empty-comment">还没有人评论，快来抢沙发！</div>
          </div>

          <div class="comment-input">
            <input v-model="newComment" placeholder="发表你的看法..." @keyup.enter="sendComment">
            <button @click="sendComment">发送</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="not-found">
      <h2>404</h2>
      <p>未找到该物品信息</p>
      <button @click="$router.push('/')">回首页</button>
    </div>

    <div v-if="showLightbox" class="lightbox" @click="showLightbox = false">
      <img :src="fixUrl(item.image_url)" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { getItemDetail, getItemComments, postItemComment } from '../services/itemData'
import { formatDate, fixUrl } from '../utils/formatters' // 🟢 引入 fixUrl

const route = useRoute()
const userStore = useUserStore()

const item = ref(null)
const comments = ref([])
const loading = ref(true)
const newComment = ref('')
const showLightbox = ref(false)

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    const id = route.params.id
    item.value = await getItemDetail(id)
    if (item.value) {
      comments.value = await getItemComments(id)
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const sendComment = async () => {
  if (!userStore.user) return alert('请先登录')
  if (!newComment.value.trim()) return

  try {
    await postItemComment(item.value.id, userStore.user.id, newComment.value)
    newComment.value = ''
    comments.value = await getItemComments(item.value.id)
  } catch (e) {
    alert('发送失败')
  }
}

const handleLike = () => alert('功能开发中：已加入愿望单！')
const copyLink = () => {
  navigator.clipboard.writeText(window.location.href)
  alert('链接已复制！')
}
const openLightbox = () => showLightbox.value = true
</script>

<style scoped>
.detail-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
.loading-box { text-align: center; padding: 50px; }
.spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #39C5BB; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto; }
@keyframes spin { 100% {transform: rotate(360deg);} }

.back-btn { background: none; border: 1px solid #ddd; padding: 5px 15px; border-radius: 20px; cursor: pointer; margin-bottom: 20px; transition: 0.2s; }
.back-btn:hover { border-color: #39C5BB; color: #39C5BB; }

.top-section { display: flex; gap: 40px; margin-bottom: 40px; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.img-box { width: 400px; height: 400px; background: #f9f9f9; display: flex; align-items: center; justify-content: center; border-radius: 8px; overflow: hidden; cursor: zoom-in; }
.main-img { max-width: 100%; max-height: 100%; object-fit: contain; }

.info-box { flex: 1; }
.tags { margin-bottom: 10px; }
.tag { font-size: 12px; padding: 4px 8px; border-radius: 4px; margin-right: 5px; }
.tag.cat { background: #e0f2f1; color: #00695c; }
.tag.fan { background: #fff3e0; color: #ef6c00; }
.title { font-size: 28px; margin: 0 0 20px 0; line-height: 1.3; }

.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
.meta-item { display: flex; flex-direction: column; }
.meta-item .label { font-size: 12px; color: #888; margin-bottom: 4px; }
.meta-item .value { font-size: 16px; font-weight: 500; }
.meta-item .price { color: #f57c00; font-weight: bold; font-size: 20px; }

.action-bar { display: flex; gap: 10px; }
.action-bar button { padding: 12px 25px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-like { background: #ff4081; color: white; }
.btn-like:hover { background: #f50057; }
.btn-share { background: #f0f0f0; color: #333; }
.btn-share:hover { background: #e0e0e0; }

.bottom-section { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
.desc-panel, .comment-panel { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
.desc-text { line-height: 1.8; color: #444; white-space: pre-wrap; }

.comment-list { max-height: 400px; overflow-y: auto; margin-bottom: 20px; }
.comment-row { border-bottom: 1px solid #eee; padding: 10px 0; }
.c-user { font-size: 12px; font-weight: bold; color: #39C5BB; margin-bottom: 4px; }
.c-content { font-size: 14px; color: #333; margin-bottom: 4px; }
.c-time { font-size: 11px; color: #999; }
.empty-comment { text-align: center; color: #999; padding: 20px; }

.comment-input { display: flex; gap: 10px; }
.comment-input input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.comment-input button { padding: 0 20px; background: #39C5BB; color: white; border: none; border-radius: 6px; cursor: pointer; }

.lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; justify-content: center; align-items: center; }
.lightbox img { max-width: 90%; max-height: 90%; }

@media (max-width: 768px) {
  .top-section { flex-direction: column; }
  .img-box { width: 100%; height: 300px; }
  .bottom-section { grid-template-columns: 1fr; }
}
</style>