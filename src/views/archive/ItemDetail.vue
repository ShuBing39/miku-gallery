<template>
  <div class="item-detail-container">
    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>正在加载宝贝信息...</p>
    </div>

    <div v-else-if="item" class="content-wrapper">
      <div class="breadcrumb">
        <router-link to="/">首页</router-link> <span class="arrow">></span> 
        <router-link to="/wiki">葱葱维基</router-link> <span class="arrow">></span> 
        <span class="current">{{ item.name }}</span>
      </div>

      <div class="detail-main">
        <div class="image-section">
          <div class="main-image">
            <img :src="currentImage || '/placeholder.png'" alt="商品主图" @click="showLightbox = true"/>
          </div>
          
          <div class="thumbnail-list" v-if="item.images && item.images.length > 0">
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
                <img :src="fixUrl(uImg.image_url)" @click="currentImage = fixUrl(uImg.image_url)" />
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

          <div class="price-block">
            <div class="official-price" v-if="item.price_jpy">
              <span class="currency">JP¥</span> 
              <span class="amount">{{ item.price_jpy.toLocaleString() }}</span>
              <span class="rmb-est" v-if="estimatedRMB">
                (≈ CN¥ {{ estimatedRMB }} | 汇率: {{ currentRate }})
              </span>
            </div>
            <div class="official-price" v-else-if="item.price">
               {{ item.price }}
            </div>
            <div class="official-price unknown" v-else>
               暂无官方定价
            </div>

            <div class="second-hand-price">
              <span class="sh-label">🐟 二手/煤炉参考价：</span>
              <span class="sh-value">暂无数据 (等待接入)</span>
            </div>
          </div>

          <div class="meta-info">
            <div class="info-row">
              <span class="label">厂商/社团：</span>
              <span class="value">{{ item.manufacturer || item.author || '官方' }}</span>
            </div>
            <div class="info-row">
              <span class="label">分类：</span>
              <span class="value badge">{{ displayCategory }}</span>
            </div>
            <div class="info-row">
              <span class="label">属性：</span>
              <div class="tags-row">
                <span v-if="item.is_collection" class="value badge orange">📦 合集/父商品</span>
                <span v-if="item.is_blind_box" class="value badge purple">🎲 盲抽/抱盒</span>
                <span v-if="!item.is_collection && !item.is_blind_box" class="value badge gray">单品</span>
              </div>
            </div>
            <div class="info-row">
              <span class="label">收录日期：</span>
              <span class="value">{{ formatDate(item.release_date) }}</span>
            </div>
            
            <div class="info-row sale-info-row" v-if="item.sale_info">
              <span class="label">发售详情：</span>
              <div class="value sale-info-text">{{ item.sale_info }}</div>
            </div>

            <div class="info-row" v-if="item.purchase_link || item.link">
              <span class="label">相关链接：</span>
              <a :href="item.purchase_link || item.link" target="_blank" class="link-btn">点击跳转原文/购买</a>
            </div>
          </div>

          <div class="description-box">
            <h3>简介</h3>
            <p>{{ item.description || '暂无详细介绍，点击右上角“纠错”来补充吧！' }}</p>
          </div>

          <div class="related-groups-section">
            <div class="section-head">
              <h3>🛍️ 关联车队 / 拼团 ({{ relatedProjects.length }})</h3>
              <button class="btn-create-link" @click="goToCreateGroup">✨ 我要开这团</button>
            </div>
            
            <div v-if="relatedProjects.length > 0" class="groups-list">
              <div v-for="proj in relatedProjects" :key="proj.id" class="group-card" @click="goToProject(proj.id)">
                <img :src="proj.image_url || item.image_url" class="g-cover">
                <div class="g-info">
                  <div class="g-title">{{ proj.name }}</div>
                  <div class="g-meta">
                    <span class="status-badge">进行中</span>
                    <span class="author">团长: {{ proj.profiles?.username || '未知' }}</span>
                  </div>
                </div>
                <button class="btn-go">去上车 ➔</button>
              </div>
            </div>
            <div v-else class="empty-groups">
              <p>暂无关联的拼团，您可以点击右上角发起第一个！</p>
            </div>
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
      <img :src="currentImage" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import { getItemById, uploadUserImage } from '../../services/itemData'
import { fixUrl } from '../../utils/formatters' 
import { getExchangeRate } from '../../services/huilv' 
import { supabase } from '../../services/supabase' // ✅ 引入 Supabase

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const item = ref(null)
const currentImage = ref(null)
const loading = ref(true)
const showLightbox = ref(false)
const relatedProjects = ref([]) // ✅ 关联团购列表

// 上传相关状态
const showUploadModal = ref(false)
const selectedFile = ref(null)
const previewUrl = ref(null)
const uploadCaption = ref('')
const uploading = ref(false)
const fileInput = ref(null)

const currentRate = ref(0.047)

onMounted(async () => {
  const rate = await getExchangeRate()
  if (rate) currentRate.value = rate
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    const id = route.params.id
    if (id) {
      // 1. 获取商品详情
      const data = await getItemById(id)
      if (data) {
        processImages(data)
        item.value = data
        
        // 2. ✅ 获取关联团购
        await fetchRelatedGroups(data)
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ✅ 核心逻辑：获取关联团购
const fetchRelatedGroups = async (itemData) => {
  try {
    // 策略A：优先查 linked_item_id (精准匹配)
    let { data, error } = await supabase
      .from('projects')
      .select('id, name, status, image_url, user_id, profiles(username)')
      .eq('status', 'active') // 只看进行中的
      .eq('linked_item_id', itemData.id)
      .limit(5)

    // 策略B：如果没有 ID 关联，尝试关键词模糊匹配 (兜底)
    if (!data || data.length === 0) {
      // 提取前4-6个字符作为关键词，或者去掉空格
      const keyword = itemData.name.split(' ')[0].substring(0, 6)
      if (keyword.length >= 2) {
        const { data: fuzzyData } = await supabase
          .from('projects')
          .select('id, name, status, image_url, user_id, profiles(username)')
          .eq('status', 'active')
          .ilike('name', `%${keyword}%`) // 标题包含关键词
          .limit(3)
        
        if (fuzzyData) data = fuzzyData
      }
    }

    if (data) {
      relatedProjects.value = data
    }
  } catch (err) {
    console.warn('获取关联团购失败', err)
  }
}

const processImages = (data) => {
  let imgList = []
  if (data.image_url) {
    const str = data.image_url.trim()
    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed = JSON.parse(str)
        imgList = parsed.map(u => ({ image_url: fixUrl(u) }))
      } catch (e) {}
    } else {
      imgList.push({ image_url: fixUrl(str) })
    }
  }
  if (!data.images || data.images.length === 0) {
    data.images = imgList
  } else {
    data.images = data.images.map(img => ({ ...img, image_url: fixUrl(img.image_url) }))
  }
  let mainImg = '/placeholder.png'
  if (data.cover_image_url) mainImg = fixUrl(data.cover_image_url)
  else if (imgList.length > 0) mainImg = imgList[0].image_url
  
  currentImage.value = mainImg
}

const estimatedRMB = computed(() => {
  if (item.value && item.value.price_jpy) {
    return Math.floor(item.value.price_jpy * currentRate.value)
  }
  return null
})

const displayCategory = computed(() => {
  if (!item.value) return ''
  const rawCat = item.value.category || '周边'
  if (['手办', '徽章', '玩偶', '服饰'].includes(rawCat)) return rawCat
  return rawCat
})

const formatDate = (str) => {
  if (!str) return '未知'
  return new Date(str).toLocaleDateString()
}

const handleEdit = () => {
  if (!userStore.user) return router.push('/login')
  router.push(`/encyclopedia/edit?import_id=${item.value.id}`)
}

const openUploadModal = () => {
  if (!userStore.user) return router.push('/login')
  showUploadModal.value = true
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

const submitUpload = async () => {
  try {
    uploading.value = true
    await uploadUserImage(item.value.id, selectedFile.value, userStore.user.id, uploadCaption.value)
    alert('✅ 上传成功！审核通过后显示。')
    showUploadModal.value = false
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

// ✅ 跳转逻辑
const goToProject = (pid) => router.push(`/group-buy/${pid}`)
const goToCreateGroup = () => router.push('/submit-group-buy') // 可以在这里传参带上 itemID
</script>

<style scoped>
.item-detail-container { max-width: 1000px; margin: 0 auto; padding: 20px; min-height: 80vh; font-family: 'Segoe UI', sans-serif; }

.loading-box { text-align: center; padding: 50px; color: #666; }
.spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #39C5BB; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 10px; }
@keyframes spin { 100% {transform: rotate(360deg);} }

.breadcrumb { margin-bottom: 25px; color: #888; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; }
.breadcrumb a { color: #666; text-decoration: none; transition: 0.2s; }
.breadcrumb a:hover { color: #39C5BB; }
.breadcrumb .current { color: #333; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }

.detail-main { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
@media (max-width: 768px) { .detail-main { grid-template-columns: 1fr; } }

.main-image { border-radius: 12px; overflow: hidden; border: 1px solid #eee; aspect-ratio: 1; background: #f9f9f9; display: flex; align-items: center; justify-content: center; cursor: zoom-in; }
.main-image img { max-width: 100%; max-height: 100%; object-fit: contain; }

.thumbnail-list { display: flex; gap: 10px; margin-top: 15px; overflow-x: auto; padding-bottom: 5px; }
.thumbnail { width: 60px; height: 60px; border: 2px solid transparent; border-radius: 6px; cursor: pointer; overflow: hidden; opacity: 0.7; flex-shrink: 0; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.thumbnail.active { border-color: #39C5BB; opacity: 1; transform: translateY(-2px); }
.thumbnail img { width: 100%; height: 100%; object-fit: cover; }

.user-gallery-section { margin-top: 30px; border-top: 1px dashed #ddd; padding-top: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.section-header h3 { margin: 0; font-size: 1.1rem; color: #444; }
.btn-upload { background: #39C5BB; color: white; border: none; padding: 6px 15px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; }

.user-images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; }
.user-img-card { position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; cursor: pointer; }
.user-img-card img { width: 100%; height: 100%; object-fit: cover; transition: 0.2s; }
.user-img-card:hover img { transform: scale(1.1); }
.status-dot { position: absolute; top: 5px; right: 5px; width: 8px; height: 8px; border-radius: 50%; }
.status-dot.pending { background: #ff9800; border: 1px solid white; }
.empty-gallery { background: #f5f5f5; padding: 15px; text-align: center; border-radius: 8px; color: #888; font-size: 0.9rem; }

/* 信息区 */
.title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 20px; }
.title-row h1 { margin: 0; font-size: 1.6rem; color: #333; line-height: 1.4; }
.btn-edit { white-space: nowrap; background: #fff3e0; border: 1px solid #ffe0b2; color: #e65100; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; font-weight: bold; }

.price-block { margin-bottom: 25px; background: #fffbfb; border: 1px solid #ffebee; border-radius: 12px; padding: 15px; }
.official-price { color: #e53935; font-weight: bold; font-size: 1.2rem; margin-bottom: 8px; display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px; }
.official-price.unknown { color: #999; font-size: 1rem; font-weight: normal; }
.currency { font-size: 0.9rem; }
.amount { font-size: 1.8rem; }
.rmb-est { font-size: 0.9rem; color: #777; font-weight: normal; margin-left: 5px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
.second-hand-price { display: flex; align-items: center; font-size: 0.9rem; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ffebee; }
.sh-label { color: #555; }
.sh-value { color: #999; font-style: italic; }

.meta-info { background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 25px; }
.info-row { display: flex; margin-bottom: 12px; font-size: 0.95rem; }
.label { color: #888; width: 90px; flex-shrink: 0; }
.value { color: #333; font-weight: 500; }
.badge { background: #e0f2f1; color: #00695c; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; }
.badge.orange { background: #fff3e0; color: #e65100; }
.badge.purple { background: #f3e5f5; color: #7b1fa2; }
.badge.gray { background: #eee; color: #666; }
.tags-row { display: flex; gap: 5px; flex-wrap: wrap; }
.link-btn { color: #39C5BB; text-decoration: underline; }

.sale-info-row { align-items: flex-start; }
.sale-info-text { white-space: pre-wrap; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #eee; width: 100%; font-size: 0.9rem; line-height: 1.5; color: #555; }

.description-box h3 { border-left: 4px solid #39C5BB; padding-left: 10px; margin: 0 0 10px 0; font-size: 1.1rem; }
.description-box p { color: #555; line-height: 1.6; white-space: pre-wrap; font-size: 14px; }

/* ✅ 关联拼团样式 */
.related-groups-section { margin-top: 25px; background: #e0f7fa; padding: 15px; border-radius: 12px; border: 1px dashed #39C5BB; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.section-head h3 { margin: 0; font-size: 1.1rem; color: #006064; }
.btn-create-link { background: white; color: #006064; border: 1px solid #006064; padding: 4px 12px; border-radius: 20px; cursor: pointer; font-size: 12px; transition: 0.2s; }
.btn-create-link:hover { background: #006064; color: white; }

.groups-list { display: flex; flex-direction: column; gap: 10px; }
.group-card { display: flex; align-items: center; background: white; padding: 10px; border-radius: 8px; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.group-card:hover { transform: translateX(5px); }
.g-cover { width: 50px; height: 50px; border-radius: 6px; object-fit: cover; margin-right: 10px; }
.g-info { flex: 1; }
.g-title { font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #333; }
.g-meta { font-size: 12px; color: #666; display: flex; align-items: center; gap: 8px; }
.status-badge { background: #e8f5e9; color: #2e7d32; padding: 1px 6px; border-radius: 4px; font-size: 10px; }
.btn-go { border: none; background: #e0f2f1; color: #00695c; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer; }
.empty-groups { text-align: center; color: #006064; font-size: 13px; padding: 10px; }

.action-bar { display: flex; gap: 15px; margin-top: 30px; }
.action-bar button { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-like { background: #ffebee; color: #e53935; }
.btn-share { background: #f5f5f5; color: #333; }

/* 弹窗及图片预览保持原样 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 30px; border-radius: 16px; width: 90%; max-width: 450px; }
.file-input { display: none; }
.upload-placeholder { width: 100%; height: 150px; border: 2px dashed #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fafafa; color: #999; }
.preview-box img { max-width: 100%; max-height: 100%; }
textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-top: 15px; resize: vertical; font-family: inherit; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-cancel { background: #f5f5f5; color: #666; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
.btn-primary { background: #39C5BB; color: white; border: none; padding: 10px 25px; border-radius: 8px; cursor: pointer; font-weight: bold; }
.lightbox { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; cursor: zoom-out; }
.lightbox img { max-width: 90%; max-height: 90%; border-radius: 4px; }
</style>