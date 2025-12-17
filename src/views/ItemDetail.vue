<template>
  <div class="detail-container">
    <div v-if="loading" class="loading-screen">
      <div class="spinner"></div>
      <p>正在读取档案...</p>
    </div>

    <div v-else-if="item" class="item-content">
      
      <div class="breadcrumbs">
        <span @click="$router.push('/')">首页</span> / 
        <span @click="$router.push('/wiki')">葱葱维基</span> / 
        <span>{{ item.name }}</span>
      </div>

      <div class="main-split">
        
        <div class="left-column">
          <div class="image-wrapper">
            <img 
              :src="item.image_url" 
              class="official-image zoom-cursor" 
              @click="openLightbox(item.image_url)"
              title="点击查看高清大图"
            />
            <div class="source-badge">✨ {{ item.is_fan_work ? '用户投稿' : '官方/Piapro' }} 数据源</div>
          </div>
          
          <div v-if="officialImages.length > 0" class="more-images-box">
            <h3 class="mini-title">👀 更多预览</h3>
            <div class="mini-grid">
              <img 
                v-for="img in officialImages" 
                :key="img.id" 
                :src="img.image_url" 
                class="mini-img"
                @click="openLightbox(img.image_url)" 
              />
            </div>
          </div>

          <div v-if="item.video_url" class="video-section">
            <a :href="item.video_url" target="_blank" class="video-btn">
              ▶️ 点击观看视频 / PV
            </a>
          </div>

          <a :href="item.external_link || item.link" target="_blank" class="buy-btn">
            🔗 前往详情/购买页面
          </a>
        </div>

        <div class="right-info">
          <div class="header">
            <span class="id-tag">#{{ item.id }}</span>
            <h1 class="item-title">
              {{ item.name }}
              <span v-if="item.is_fan_work" class="fan-badge">🎨 同人作品</span>
            </h1>
          </div>
          
          <div class="tags-row">
            <span class="tag char-tag">{{ item.character || '未知角色' }}</span>
            <span class="tag cat-tag">{{ item.category || '周边' }}</span>
          </div>

          <div v-if="item.description" class="desc-box">
            <p>{{ item.description }}</p>
          </div>

          <div class="info-card">
            <div class="info-row">
              <span class="label">{{ item.is_fan_work ? '💰 作者定价' : '💰 官方定价' }}</span>
              <div class="price-group">
                <span class="value original-price">{{ item.price ? item.price : '暂无' }} JPY</span>
                <span class="cny-hint" v-if="item.price">
                  (≈ {{ toCNY(item.price) }} CNY)
                </span>
              </div>
            </div>

            <div class="info-row highlight-row">
              <div class="market-header">
                <span class="label">📈 二手/市价估算</span>
                <span v-if="item.market_price" class="provider-info">
                  (来源: {{ item.market_price_source || '未知' }} | 
                  由 {{ item.market_price_uploader || '匿名' }} 更新)
                </span>
              </div>

              <div class="market-content">
                <div 
                  v-if="item.market_price" 
                  class="price-display-box"
                  :class="{ 'blurred': !isPriceRevealed }"
                  @click="revealPrice"
                  title="点击查看参考市价"
                >
                  <div class="main-price">
                    <span class="currency">¥</span>
                    <span class="amount">{{ item.market_price }}</span>
                  </div>
                  <div class="sub-price">
                    ≈ {{ toCNY(item.market_price) }} RMB 
                    <span class="rate-badge">汇率:{{ (exchangeRate * 100).toFixed(2) }}</span>
                  </div>
                  
                  <div v-if="!isPriceRevealed" class="blur-overlay">
                    <span>👀 点我查看市价</span>
                  </div>
                </div>
                
                <span v-else class="value empty-price">暂无数据</span>
                
                <div class="action-area-col">
                  <div v-if="item.market_price" class="proof-links">
                    <a v-if="item.market_price_link" :href="item.market_price_link" target="_blank" class="proof-btn link">🔗 链接</a>
                    <button v-if="item.market_price_proof_image" @click="openLightbox(item.market_price_proof_image)" class="proof-btn image">🖼️ 截图</button>
                  </div>

                  <span v-if="isLocked" class="lock-timer">
                    🔒 {{ daysRemaining }}天后可更新
                  </span>
                  <button 
                    v-else 
                    @click="showPriceInput = !showPriceInput" 
                    class="edit-price-btn"
                  >
                    {{ showPriceInput ? '取消' : '更新市价' }}
                  </button>
                </div>
              </div>

              <div v-if="item.market_price_updated_at" class="update-time">
                更新时间: {{ formatDate(item.market_price_updated_at) }}
              </div>
            </div>
            
            <div v-if="showPriceInput" class="price-input-box">
              <p class="input-hint">⚠️ 请提供真实成交价与凭证 (二选一)</p>
              <div class="input-grid">
                <div class="input-field">
                  <label>价格 (JPY)</label>
                  <input type="number" min="0" v-model="newMarketPrice" placeholder="5000" class="mini-input">
                </div>
                <div class="input-field">
                  <label>来源平台</label>
                  <select v-model="newPriceSource" class="mini-input">
                    <option value="" disabled selected>选择来源...</option>
                    <option value="闲鱼">闲鱼</option>
                    <option value="煤炉(Mercari)">煤炉(Mercari)</option>
                    <option value="骏河屋">骏河屋</option>
                    <option value="雅虎拍卖">雅虎拍卖</option>
                    <option value="线下店">线下店/展会</option>
                  </select>
                </div>
                <div class="input-field full-width">
                  <input type="text" v-model="priceUploaderName" placeholder="你的昵称 (用于展示)" class="mini-input">
                </div>
              </div>
              <div class="proof-input-section">
                <label>凭证 (直达链接 或 截图)</label>
                <input type="text" v-model="newPriceLink" placeholder="https://... (详情页链接)" class="mini-input full-width">
                <div class="file-upload-row">
                  <input type="file" ref="proofFileInput" @change="handleProofFile" accept="image/*" style="display:none" />
                  <button @click="$refs.proofFileInput.click()" class="mini-file-btn">
                    {{ proofFile ? '✅ 已选截图: ' + proofFile.name : '📤 上传凭证截图 (可选)' }}
                  </button>
                </div>
              </div>
              <button @click="submitMarketPrice" class="mini-submit-btn">
                {{ isUploadingProof ? '正在上传凭证...' : '提交数据 (锁定7天)' }}
              </button>
            </div>

            <div class="info-row">
              <span class="label">📅 发售/发布</span>
              <span class="value">{{ item.release_date || '暂无数据' }}</span>
            </div>
            
            <div class="info-row" v-if="item.author">
              <span class="label">🎨 创作者/画师</span>
              <span class="value author-name">{{ item.author }}</span>
            </div>

            <div v-if="isOwner" class="owner-actions">
              <p>🎓 你是该作品的上传者</p>
              <button @click="$router.push('/admin')" class="manage-btn">去后台编辑/管理</button>
            </div>

          </div>

          <div class="report-box">
            <p class="report-hint">发现信息有误？(引用 ID: {{ item.id }})</p>
            <button @click="showReportForm = !showReportForm" class="report-btn">⚠️ 提交纠错</button>
            <div v-if="showReportForm" class="report-form">
              <textarea v-model="reportText" placeholder="请描述错误内容..."></textarea>
              <button @click="submitReport" :disabled="isSubmitting">{{ isSubmitting ? '提交中...' : '发送反馈' }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="divider"><span class="divider-text">以下内容由用户共同维护</span></div>

      <div class="user-gallery-section">
        <div class="gallery-header">
          <h2>📸 葱粉实物返图 ({{ userImages.length }})</h2>
          <button @click="showUpload = !showUpload" class="upload-toggle-btn">+ 我也要晒图</button>
        </div>
        
        <div v-if="showUpload" class="upload-panel">
          <input type="text" v-model="uploaderName" placeholder="你的昵称 (可选)" class="name-input">
          <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display:none" />
          <button @click="$refs.fileInput.click()" class="select-file-btn">选择图片上传</button>
          <p v-if="uploadStatus" class="status-text">{{ uploadStatus }}</p>
        </div>
        
        <div class="gallery-grid">
          <div v-for="img in userImages" :key="img.id" class="gallery-card">
            <div class="gallery-img-box">
              <img :src="img.image_url" loading="lazy" class="zoom-cursor" @click="openLightbox(img.image_url)" />
            </div>
            <div class="gallery-meta"><span class="user-badge">👤 {{ img.uploader_name || '热心葱粉' }}</span></div>
          </div>
        </div>
        <div v-if="userImages.length === 0" class="empty-state">🍃 还没有人上传实物图，快来抢沙发！</div>
      </div>

      <transition name="fade">
        <div v-if="showLightbox" class="lightbox-overlay" @click="closeLightbox">
          <button class="lightbox-close-btn">✕</button>
          <div class="lightbox-img-container" @click.stop>
            <img :src="lightboxImage" class="lightbox-img" />
          </div>
        </div>
      </transition>

    </div>

    <div v-else class="not-found">未找到商品信息</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createClient } from '@supabase/supabase-js'

const route = useRoute()
const router = useRouter()
const itemId = route.params.id

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

// 数据状态
const item = ref(null)
const officialImages = ref([]) 
const userImages = ref([])
const currentUser = ref(null)
const loading = ref(true)

// 交互状态
const showReportForm = ref(false)
const showUpload = ref(false)
const showLightbox = ref(false)
const lightboxImage = ref('')
const reportText = ref('')
const isSubmitting = ref(false)
const uploadStatus = ref('')
const uploaderName = ref('')

// 市价状态
const showPriceInput = ref(false)
const newMarketPrice = ref('')
const newPriceSource = ref('')
const newPriceLink = ref('')
const priceUploaderName = ref('') 
const isPriceRevealed = ref(false) 
const proofFile = ref(null)
const isUploadingProof = ref(false)
const exchangeRate = ref(0.048) // 默认兜底汇率

// 判断是否为上传者
const isOwner = computed(() => {
  if (!currentUser.value || !item.value) return false
  return item.value.uploader_id === currentUser.value.id
})

// 价格锁定逻辑 (7天冷却)
const isLocked = computed(() => {
  if (!item.value || !item.value.market_price_updated_at) return false
  const lastUpdate = new Date(item.value.market_price_updated_at).getTime()
  return (Date.now() - lastUpdate) < (7 * 24 * 60 * 60 * 1000)
})

const daysRemaining = computed(() => {
  if (!item.value || !item.value.market_price_updated_at) return 0
  const diff = (7 * 24 * 60 * 60 * 1000) - (Date.now() - new Date(item.value.market_price_updated_at).getTime())
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
})

// 核心：数据获取 + 企划防呆跳转
const fetchItem = async () => {
  loading.value = true
  const { data, error } = await supabase.from('items').select('*').eq('id', itemId).single()
  
  if (data) {
    // 🔍 检查分类：如果是“企划”或“同人企划”，直接跳转到企划详情页
    const category = data.category ? data.category.trim() : ''
    if (category === '同人企划' || category === '企划') {
      console.log('检测到是企划，正在跳转至 /project/ID ...')
      router.replace(`/project/${itemId}`)
      return // 这里的 return 非常重要，阻止后续渲染
    }
    item.value = data
  } else {
    console.error('获取物品详情失败:', error)
  }
  loading.value = false
}

// 获取汇率 API
const fetchExchangeRate = async () => {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/JPY')
    const data = await res.json()
    if (data?.rates?.CNY) exchangeRate.value = data.rates.CNY
  } catch (e) { 
    console.warn('汇率获取失败，使用默认值') 
  }
}

// 工具函数
const toCNY = (jpy) => jpy ? Math.floor(jpy * exchangeRate.value) : 0
const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

const revealPrice = () => { isPriceRevealed.value = true }
const handleProofFile = (e) => { 
  if (e.target.files && e.target.files[0]) {
    proofFile.value = e.target.files[0] 
  }
}

// 提交市价逻辑
const submitMarketPrice = async () => {
  if (isLocked.value) { alert('⚠️ 价格冷却中，请过几天再试！'); return }
  if (!newMarketPrice.value) { alert('请输入价格'); return }
  
  const price = parseInt(newMarketPrice.value)
  if (isNaN(price) || price < 0) { alert('价格格式错误'); return }
  if (!newPriceSource.value) { alert('请选择来源平台'); return }
  if (!newPriceLink.value && !proofFile.value) { alert('请提供链接或截图凭证，否则无法审核'); return }

  isUploadingProof.value = true
  let proofImageUrl = null

  // 上传凭证图片
  if (proofFile.value) {
    const fileExt = proofFile.value.name.split('.').pop()
    const fileName = `proof-${itemId}-${Date.now()}.${fileExt}`
    const { error: upErr } = await supabase.storage.from('user_uploads').upload(fileName, proofFile.value)
    
    if (!upErr) {
      const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
      proofImageUrl = data.publicUrl
    } else {
      console.error('凭证上传失败', upErr)
    }
  }

  // 更新数据库
  const { error } = await supabase.from('items').update({ 
      market_price: price,
      market_price_updated_at: new Date().toISOString(),
      market_price_uploader: priceUploaderName.value || '匿名葱粉',
      market_price_source: newPriceSource.value,
      market_price_link: newPriceLink.value || null,
      market_price_proof_image: proofImageUrl || null
    }).eq('id', itemId)

  isUploadingProof.value = false
  
  if (!error) {
    alert('✅ 市价已成功更新！')
    showPriceInput.value = false
    // 重置表单
    newMarketPrice.value = ''
    newPriceSource.value = ''
    newPriceLink.value = ''
    proofFile.value = null
    fetchItem() // 重新获取数据以刷新界面
  } else {
    alert('更新失败: ' + error.message)
  }
}

// 获取图片列表
const fetchOfficialImages = async () => { 
  const { data } = await supabase.from('item_images').select('*').eq('item_id', itemId); 
  if (data) officialImages.value = data 
}

const fetchUserImages = async () => { 
  const { data } = await supabase.from('user_images').select('*').eq('item_id', itemId).order('created_at', { ascending: false }); 
  if (data) userImages.value = data 
}

// 用户上传晒图
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  uploadStatus.value = '正在上传...'
  const fileExt = file.name.split('.').pop()
  const fileName = `${itemId}-${Date.now()}.${fileExt}`
  
  const { error: uploadError } = await supabase.storage.from('user_uploads').upload(fileName, file)
  if (uploadError) { 
    uploadStatus.value = '失败: ' + uploadError.message
    return 
  }
  
  const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
  
  const { error: dbError } = await supabase.from('user_images').insert([{ 
    item_id: itemId, 
    image_url: data.publicUrl, 
    uploader_name: uploaderName.value || '热心葱粉' 
  }])
  
  if (!dbError) { 
    uploadStatus.value = '上传成功！'
    showUpload.value = false
    fetchUserImages() // 刷新列表
  }
}

// 提交错误报告
const submitReport = async () => {
  if (!reportText.value) return
  isSubmitting.value = true
  const { error } = await supabase.from('error_reports').insert([{ item_id: itemId, description: reportText.value }])
  if (!error) { 
    alert('✅ 反馈已提交，感谢您的帮助！')
    reportText.value = ''
    showReportForm.value = false 
  } 
  isSubmitting.value = false
}

// Lightbox 控制
const openLightbox = (url) => { 
  lightboxImage.value = url
  showLightbox.value = true
  document.body.style.overflow = 'hidden' 
}
const closeLightbox = () => { 
  showLightbox.value = false
  lightboxImage.value = ''
  document.body.style.overflow = 'auto' 
}

onUnmounted(() => { 
  document.body.style.overflow = 'auto' 
})

onMounted(async () => {
  fetchExchangeRate()
  await fetchItem() // 等待主数据加载
  
  // 只有当 item 存在（即没有发生跳转）时，才加载图片和用户数据
  if (item.value) {
    fetchOfficialImages()
    fetchUserImages()
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
})
</script>

<style scoped>
.detail-container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding-bottom: 80px; }
.loading-screen, .not-found { text-align: center; padding: 100px; color: #999; }
.breadcrumbs { margin-bottom: 20px; color: #888; font-size: 14px; }
.breadcrumbs span { cursor: pointer; }
.breadcrumbs span:hover { color: #39C5BB; text-decoration: underline; }

.main-split { display: grid; grid-template-columns: 1fr; gap: 40px; }
@media (min-width: 768px) { .main-split { grid-template-columns: 400px 1fr; } }

/* Left Column */
.image-wrapper { position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background: white; aspect-ratio: 1/1; }
.official-image { width: 100%; height: 100%; object-fit: contain; display: block; transition: transform 0.3s; }
.zoom-cursor { cursor: zoom-in; }
.official-image:hover { transform: scale(1.02); }
.source-badge { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.6); color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px; pointer-events: none; }
.more-images-box { margin-top: 15px; }
.mini-title { font-size: 13px; color: #888; margin: 0 0 8px 0; font-weight: normal; }
.mini-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.mini-img { width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid #eee; transition: all 0.2s; }
.mini-img:hover { border-color: #39C5BB; opacity: 0.9; transform: scale(1.05); }
.buy-btn { display: block; margin-top: 20px; background: #39C5BB; color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: bold; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); transition: transform 0.2s; }
.buy-btn:hover { transform: translateY(-2px); background: #2da8a0; }
.video-section { margin-top: 15px; }
.video-btn { display: block; width: 100%; text-align: center; background: #333; color: white; padding: 10px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; box-sizing: border-box; }
.video-btn:hover { background: #555; }

/* Right Info */
.item-title { font-size: 24px; margin: 0 0 15px 0; line-height: 1.4; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.id-tag { font-size: 14px; background: #eee; color: #666; padding: 2px 8px; border-radius: 6px; font-weight: normal; font-family: monospace; }
.fan-badge { background: #ff9800; color: white; font-size: 12px; padding: 2px 6px; border-radius: 4px; margin-left: 5px; vertical-align: middle; }
.tags-row { display: flex; gap: 10px; margin-bottom: 25px; }
.tag { font-size: 13px; padding: 4px 10px; border-radius: 6px; }
.char-tag { background: #e0f7fa; color: #006064; }
.cat-tag { background: #f3e5f5; color: #4a148c; }
.desc-box { background: #fffde7; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.6; color: #555; white-space: pre-wrap; }

.info-card { background: #fafafa; border-radius: 12px; padding: 20px; border: 1px solid #eee; }
.info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #e0e0e0; align-items: center; }
.info-row:last-child { border-bottom: none; }
.label { color: #888; font-weight: 500; }
.value { font-weight: 600; color: #333; }
.author-name { color: #39C5BB; font-weight: bold; }
.price-group { text-align: right; }
.original-price { color: #333; font-weight: bold; }
.cny-hint { font-size: 12px; color: #999; margin-left: 5px; font-weight: normal; }

/* Market Price Styles */
.highlight-row { background: #fff8e1; margin: 0 -20px; padding: 15px 20px; border-top: 1px dashed #e0e0e0; border-bottom: 1px dashed #e0e0e0; display: block; }
.market-header { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: flex-end; }
.provider-info { font-size: 11px; color: #aaa; text-align: right; max-width: 60%; line-height: 1.2; }
.market-content { display: flex; justify-content: space-between; align-items: flex-start; }
.price-display-box { position: relative; background: #333; color: white; padding: 8px 15px; border-radius: 6px; cursor: pointer; user-select: none; min-width: 140px; text-align: center; }
.price-display-box.blurred .main-price, .price-display-box.blurred .sub-price { filter: blur(6px); opacity: 0.5; }
.blur-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: rgba(255,255,255,0.9); font-weight: bold; }
.price-display-box:not(.blurred) { background: white; border: 2px solid #ff9800; color: #ff5500; }
.main-price { font-size: 20px; font-weight: 800; line-height: 1.1; }
.sub-price { font-size: 11px; color: #999; font-weight: normal; margin-top: 2px; }
.rate-badge { background: #eee; padding: 1px 4px; border-radius: 3px; margin-left: 4px; font-size: 10px; }
.empty-price { color: #ccc; font-weight: normal; font-size: 14px; margin-top: 8px; }
.update-time { font-size: 10px; color: #bbb; margin-top: 12px; text-align: right; }
.action-area-col { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.proof-links { display: flex; gap: 5px; }
.proof-btn { text-decoration: none; font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid #ddd; background: white; color: #666; cursor: pointer; }
.lock-timer { font-size: 11px; color: #999; background: #eee; padding: 6px 10px; border-radius: 4px; }
.edit-price-btn { border: 1px solid #ddd; background: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; color: #666; }
.price-input-box { background: #fffde7; padding: 15px 20px; margin: 0 -20px; border-bottom: 1px dashed #e0e0e0; }
.input-hint { font-size: 11px; color: #ff9800; margin: 0 0 10px 0; }
.input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.input-field { display: flex; flex-direction: column; gap: 4px; }
.input-field.full-width { grid-column: span 2; }
.input-field label { font-size: 11px; color: #888; }
.mini-input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; outline: none; font-size: 13px; }
.mini-submit-btn { width: 100%; background: #39C5BB; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.proof-input-section { margin-bottom: 15px; border-top: 1px dashed #e0e0e0; padding-top: 10px; }
.proof-input-section label { font-size: 11px; color: #888; display: block; margin-bottom: 5px; }
.file-upload-row { margin-top: 8px; }
.mini-file-btn { background: #eee; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; width: 100%; text-align: left; }

.owner-actions { margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; text-align: center; }
.owner-actions p { margin: 0 0 10px 0; font-size: 12px; color: #1565c0; font-weight: bold; }
.manage-btn { background: #1976d2; color: white; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 13px; }
.manage-btn:hover { background: #1565c0; }

.report-box { margin-top: 30px; text-align: right; }
.report-hint { display: inline-block; font-size: 12px; color: #999; margin-right: 10px; }
.report-btn { background: none; border: 1px solid #ddd; color: #666; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.report-form { margin-top: 10px; text-align: right; }
.report-form textarea { width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; font-family: inherit; }

.divider { margin: 60px 0 40px 0; text-align: center; position: relative; }
.divider::before { content: ''; position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: #eee; z-index: 0; }
.divider-text { background: #fcfcfc; padding: 0 20px; color: #999; font-size: 14px; position: relative; z-index: 1; }

.gallery-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.upload-toggle-btn { background: #333; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; }
.upload-panel { background: #f0f0f0; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.name-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; outline: none; }
.select-file-btn { background: #39C5BB; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; }
.gallery-card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #eee; }
.gallery-img-box { width: 100%; aspect-ratio: 1/1; overflow: hidden; }
.gallery-img-box img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.gallery-img-box img:hover { transform: scale(1.05); }
.gallery-meta { padding: 8px; font-size: 12px; color: #666; background: #fbfbfb; border-top: 1px solid #f0f0f0; }
.empty-state { text-align: center; padding: 40px; color: #999; background: #f9f9f9; border-radius: 12px; }

.spinner { width: 30px; height: 30px; border: 3px solid #eee; border-top-color: #39C5BB; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Lightbox */
.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.92); z-index: 9999; display: flex; justify-content: center; align-items: center; cursor: zoom-out; padding: 20px; }
.lightbox-img-container { max-width: 95%; max-height: 95%; display: flex; justify-content: center; align-items: center; }
.lightbox-img { max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); cursor: default; }
.lightbox-close-btn { position: absolute; top: 20px; right: 30px; background: none; border: none; color: white; font-size: 40px; line-height: 1; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; z-index: 10000; }
.lightbox-close-btn:hover { opacity: 1; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>