<template>
  <div class="item-detail-container">
    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>正在加载宝贝信息...</p>
    </div>

    <div v-else-if="item" class="content-wrapper">
      <div class="breadcrumb">
        <router-link to="/">首页</router-link> > 
        <router-link to="/encyclopedia">周边百科</router-link> > 
        <span>{{ item.name }}</span>
      </div>

      <div class="detail-main">
        <div class="image-section">
          <div class="main-image">
            <img :src="currentImage || item.image_url || '/placeholder.png'" alt="商品主图" @click="showLightbox = true"/>
          </div>
          
          <div class="thumbnail-list" v-if="item.images && item.images.length">
            <div 
              v-for="(img, index) in item.images" 
              :key="index"
              class="thumbnail"
              :class="{ active: currentImage === img.image_url }"
              @click="currentImage = img.image_url"
            >
              <img :src="img.image_url" />
            </div>
          </div>

          <div class="user-gallery-section">
            <div class="section-header">
              <h3>📸 大家的返图 ({{ item.user_images?.length || 0 }})</h3>
              <button class="btn-upload" @click="openUploadModal">
                + 我要晒图
              </button>
            </div>
            
            <div v-if="!item.user_images?.length" class="empty-gallery">
              <p>还没有人晒过这件宝贝，快来抢沙发！</p>
            </div>
            
            <div v-else class="user-images-grid">
              <div v-for="uImg in item.user_images" :key="uImg.id" class="user-img-card">
                <img :src="uImg.image_url" @click="currentImage = uImg.image_url" />
                <div class="img-caption" v-if="uImg.caption">{{ uImg.caption }}</div>
                <div v-if="uImg.status === 'pending'" class="status-dot pending" title="审核中"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <div class="title-row">
            <h1>{{ item.name }}</h1>
            <button class="btn-edit" @click="handleEdit">✏️ 纠错</button>
          </div>

          <div class="price-tag" v-if="item.price">
            <span class="currency">¥</span> {{ item.price }}
          </div>

          <div class="meta-info">
            <div class="info-row">
              <span class="label">社团/作者：</span>
              <span class="value">{{ item.author || '官方' }}</span>
            </div>
            <div class="info-row">
              <span class="label">分类：</span>
              <span class="value badge">{{ item.category }}</span>
            </div>
            <div class="info-row">
              <span class="label">发售日期：</span>
              <span class="value">{{ formatDate(item.release_date) }}</span>
            </div>
            <div class="info-row" v-if="item.link">
              <span class="label">购买/详情链接：</span>
              <a :href="item.link" target="_blank" class="link-btn">点击跳转</a>
            </div>
          </div>

          <div class="description-box">
            <h3>简介</h3>
            <p>{{ item.description || '暂无详细介绍，点击右上角“纠错”来补充吧！' }}</p>
          </div>
          
          <div class="action-bar">
            <button class="btn-like" @click="handleLike">❤️ 加入愿望单</button>
            <button class="btn-share" @click="copyLink">🔗 分享链接</button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="not-found">
      <h2>404</h2>
      <p>未找到该物品信息</p>
      <button @click="$router.push('/')">回首页</button>
    </div>

    <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal = false">
      <div class="modal-content">
        <h3>上传返图</h3>
        <p class="modal-tip">晒出你的实物美图，给其他葱粉参考！</p>
        
        <input type="file" ref="fileInput" @change="handleFileSelect" accept="image/*" class="file-input" />
        
        <div v-if="previewUrl" class="preview-box">
          <img :src="previewUrl" />
        </div>
        <div v-else class="upload-placeholder" @click="$refs.fileInput.click()">
          <span>点击选择图片</span>
        </div>
        
        <textarea v-model="uploadCaption" placeholder="说点什么吧... (选填，例如：实物很有质感！)" rows="3"></textarea>
        
        <div class="modal-actions">
          <button class="btn-cancel" @click="showUploadModal = false">取消</button>
          <button class="btn-primary" :disabled="uploading || !selectedFile" @click="submitUpload">
            {{ uploading ? '上传中...' : '确认发布' }}
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="showLightbox" class="lightbox" @click="showLightbox = false">
      <img :src="currentImage || item.image_url" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
// ✅ 恢复原来的引用，不使用那个报错的组件了
import { getItemById, uploadUserImage } from '../services/itemData'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const item = ref(null)
const currentImage = ref(null)
const loading = ref(true)
const showLightbox = ref(false)

// 上传相关状态
const showUploadModal = ref(false)
const selectedFile = ref(null)
const previewUrl = ref(null)
const uploadCaption = ref('')
const uploading = ref(false)
const fileInput = ref(null)

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    const id = route.params.id
    if (id) {
      // 获取周边详情 (这里会自动带出 user_images)
      const data = await getItemById(id)
      if (data) {
        item.value = data
        currentImage.value = data.image_url
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const formatDate = (str) => {
  if (!str) return '未知'
  return new Date(str).toLocaleDateString()
}

// 🔥 [新增] 处理纠错点击
const handleEdit = () => {
  if (!userStore.user) {
    alert('请先登录！')
    router.push('/login')
    return
  }
  // 跳转到 WikiEdit 页面，带上当前周边 ID
  router.push(`/encyclopedia/edit?import_id=${item.value.id}`)
}

// 打开上传弹窗
const openUploadModal = () => {
  if (!userStore.user) {
    alert('请先登录后再晒图哦！')
    router.push('/login')
    return
  }
  showUploadModal.value = true
}

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

// 提交上传
const submitUpload = async () => {
  if (!userStore.user) return
  
  try {
    uploading.value = true
    // 调用之前的上传服务
    await uploadUserImage(item.value.id, selectedFile.value, userStore.user.id, uploadCaption.value)
    
    alert('✅ 上传成功！审核通过后就会显示在这里。')
    showUploadModal.value = false
    
    // 重置表单
    selectedFile.value = null
    previewUrl.value = null
    uploadCaption.value = ''
    
    // 重新加载数据，看是否能显示 (如果是pending状态，根据逻辑可能暂时不显示，但在个人中心能看到)
    await loadData()

  } catch (e) {
    alert('❌ 上传失败: ' + e.message)
  } finally {
    uploading.value = false
  }
}

const handleLike = () => alert('已加入愿望单！(功能完善中)')
const copyLink = () => {
  navigator.clipboard.writeText(window.location.href)
  alert('链接已复制！')
}
</script>

<style scoped>
.item-detail-container { max-width: 1000px; margin: 0 auto; padding: 20px; min-height: 80vh; font-family: 'Segoe UI', sans-serif; }

.loading-box { text-align: center; padding: 50px; color: #666; }
.spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #39C5BB; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 10px; }
@keyframes spin { 100% {transform: rotate(360deg);} }

.breadcrumb { margin-bottom: 20px; color: #666; font-size: 0.9rem; }
.breadcrumb a { color: #39C5BB; text-decoration: none; }

.detail-main { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
@media (max-width: 768px) { .detail-main { grid-template-columns: 1fr; } }

/* 图片区 */
.main-image { border-radius: 12px; overflow: hidden; border: 1px solid #eee; aspect-ratio: 1; background: #f9f9f9; display: flex; align-items: center; justify-content: center; cursor: zoom-in; }
.main-image img { max-width: 100%; max-height: 100%; object-fit: contain; }

.thumbnail-list { display: flex; gap: 10px; margin-top: 15px; overflow-x: auto; }
.thumbnail { width: 60px; height: 60px; border: 2px solid transparent; border-radius: 6px; cursor: pointer; overflow: hidden; opacity: 0.7; flex-shrink: 0; background: #fff; }
.thumbnail.active { border-color: #39C5BB; opacity: 1; }
.thumbnail img { width: 100%; height: 100%; object-fit: cover; }

/* 返图区样式 (保留) */
.user-gallery-section { margin-top: 30px; border-top: 1px dashed #ddd; padding-top: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.section-header h3 { margin: 0; font-size: 1.1rem; color: #444; }
.btn-upload { background: #39C5BB; color: white; border: none; padding: 6px 15px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
.btn-upload:hover { background: #26a69a; transform: translateY(-1px); }

.user-images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; }
.user-img-card { position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; cursor: pointer; }
.user-img-card img { width: 100%; height: 100%; object-fit: cover; transition: 0.2s; }
.user-img-card:hover img { transform: scale(1.1); }
.status-dot { position: absolute; top: 5px; right: 5px; width: 8px; height: 8px; border-radius: 50%; }
.status-dot.pending { background: #ff9800; border: 1px solid white; }

.empty-gallery { background: #f5f5f5; padding: 15px; text-align: center; border-radius: 8px; color: #888; font-size: 0.9rem; }

/* 信息区 */
.title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.title-row h1 { margin: 0; font-size: 1.8rem; color: #333; line-height: 1.3; }
.btn-edit { white-space: nowrap; background: #fff3e0; border: 1px solid #ffe0b2; color: #e65100; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; height: fit-content; font-weight: bold; transition: 0.2s; }
.btn-edit:hover { background: #ffe0b2; transform: translateY(-1px); }

.price-tag { font-size: 1.6rem; color: #e53935; font-weight: bold; margin: 15px 0; }
.currency { font-size: 1rem; }

.meta-info { background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 25px; }
.info-row { display: flex; margin-bottom: 12px; font-size: 0.95rem; }
.info-row:last-child { margin-bottom: 0; }
.label { color: #888; width: 90px; flex-shrink: 0; }
.value { color: #333; font-weight: 500; }
.badge { background: #e0f2f1; color: #00695c; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; }
.link-btn { color: #39C5BB; text-decoration: underline; }

.description-box h3 { border-left: 4px solid #39C5BB; padding-left: 10px; margin: 0 0 10px 0; font-size: 1.1rem; }
.description-box p { color: #555; line-height: 1.6; white-space: pre-wrap; font-size: 14px; }

.action-bar { display: flex; gap: 15px; margin-top: 30px; }
.action-bar button { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-like { background: #ffebee; color: #e53935; }
.btn-like:hover { background: #ffcdd2; }
.btn-share { background: #f5f5f5; color: #333; }
.btn-share:hover { background: #eeeeee; }

/* 弹窗样式 (完整保留) */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 30px; border-radius: 16px; width: 90%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.modal-content h3 { margin-top: 0; color: #333; }
.modal-tip { color: #666; font-size: 0.9rem; margin-bottom: 20px; }

.file-input { display: none; }
.upload-placeholder { width: 100%; height: 150px; border: 2px dashed #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fafafa; color: #999; transition: 0.2s; }
.upload-placeholder:hover { border-color: #39C5BB; color: #39C5BB; background: #f0fcfb; }
.preview-box { width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; background: #000; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
.preview-box img { max-width: 100%; max-height: 100%; }

textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-top: 15px; resize: vertical; font-family: inherit; }
textarea:focus { border-color: #39C5BB; outline: none; }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-cancel { background: #f5f5f5; color: #666; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.btn-primary { background: #39C5BB; color: white; border: none; padding: 10px 25px; border-radius: 8px; cursor: pointer; font-weight: bold; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }

.lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; cursor: zoom-out; }
.lightbox img { max-width: 90%; max-height: 90%; border-radius: 4px; }
</style>