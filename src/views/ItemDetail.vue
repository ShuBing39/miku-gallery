<template>
  <div class="container" v-if="item">
    <div class="nav-bar">
      <router-link to="/" class="back-link">
        <span class="icon">👈</span> 返回图鉴首页
      </router-link>
    </div>

    <div class="main-content">
      
      <div class="left-column">
        <div class="image-wrapper">
          <img 
            :src="item.image_url" 
            class="official-image zoom-cursor" 
            @click="openLightbox(item.image_url)"
            title="点击查看高清大图"
          />
          <div class="source-badge">✨ 官方/Piapro 数据源</div>
        </div>
        
        <div v-if="officialImages.length > 0" class="more-images-box">
          <h3 class="mini-title">👀 更多官方预览</h3>
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

        <a :href="item.external_link || item.link" target="_blank" class="buy-btn">
          🔗 前往官网查看/购买
        </a>
      </div>

      <div class="right-column">
        <h1 class="item-title">
          <span class="id-tag">#{{ item.id }}</span>
          {{ item.name }}
        </h1>
        
        <div class="tags-row">
          <span class="tag char-tag">{{ item.character || '未知角色' }}</span>
          <span class="tag cat-tag">{{ item.category || '周边' }}</span>
        </div>

        <div class="info-card">
          <div class="info-row">
            <span class="label">💰 官方定价</span>
            <div class="price-group">
              <span class="value original-price">{{ item.price }} JPY</span>
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
                  <a v-if="item.market_price_link" :href="item.market_price_link" target="_blank" class="proof-btn link" title="查看来源链接">
                    🔗 来源链接
                  </a>
                  <button v-if="item.market_price_proof_image" @click="openLightbox(item.market_price_proof_image)" class="proof-btn image" title="查看凭证截图">
                    🖼️ 凭证截图
                  </button>
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
              
              <div class="input-field">
                <label>你的昵称</label>
                <input type="text" v-model="priceUploaderName" placeholder="用于展示" class="mini-input">
              </div>
            </div>

            <div class="proof-input-section">
              <label>凭证 (直达链接 或 截图)</label>
              
              <input 
                type="text" 
                v-model="newPriceLink" 
                placeholder="https://... (商品详情页链接)" 
                class="mini-input full-width"
              >
              
              <div class="file-upload-row">
                <input type="file" ref="proofFileInput" @change="handleProofFile" accept="image/*" style="display:none" />
                <button @click="$refs.proofFileInput.click()" class="mini-file-btn">
                  {{ proofFile ? '✅ 已选截图: ' + proofFile.name : '📤 上传凭证截图 (可选)' }}
                </button>
              </div>
            </div>

            <div class="preview-price" v-if="newMarketPrice">
              预览: {{ newMarketPrice }} JPY ≈ {{ toCNY(newMarketPrice) }} RMB
            </div>

            <button @click="submitMarketPrice" class="mini-submit-btn">
              {{ isUploadingProof ? '正在上传凭证...' : '提交数据 (锁定7天)' }}
            </button>
          </div>
          <div class="info-row">
            <span class="label">📅 发售日期</span>
            <span class="value">{{ item.release_date || '暂无数据' }}</span>
          </div>
          
          <div class="info-row" v-if="item.author">
            <span class="label">🎨 创作者/画师</span>
            <span class="value author-name">{{ item.author }}</span>
          </div>

          <div class="info-row">
            <span class="label">📍 数据来源</span>
            <span class="value">Piapro Blog</span>
          </div>
        </div>

        <div class="report-box">
          <p class="report-hint">发现信息有误？(引用 ID: {{ item.id }})</p>
          <button @click="showReportForm = !showReportForm" class="report-btn">
            ⚠️ 提交纠错 / 补充信息
          </button>
          
          <div v-if="showReportForm" class="report-form">
            <textarea 
              v-model="reportText" 
              placeholder="请描述错误内容..."
            ></textarea>
            <button @click="submitReport" :disabled="isSubmitting">
              {{ isSubmitting ? '提交中...' : '发送反馈' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="divider">
      <span class="divider-text">以下内容由用户共同维护</span>
    </div>

    <div class="user-gallery-section">
      <div class="gallery-header">
        <h2>📸 葱粉实物返图 ({{ userImages.length }})</h2>
        <button @click="showUpload = !showUpload" class="upload-toggle-btn">
          + 我也要晒图
        </button>
      </div>

      <div v-if="showUpload" class="upload-panel">
        <input type="text" v-model="uploaderName" placeholder="你的昵称 (可选)" class="name-input">
        <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display:none" />
        <button @click="$refs.fileInput.click()" class="select-file-btn">
          选择图片上传
        </button>
        <p v-if="uploadStatus" class="status-text">{{ uploadStatus }}</p>
      </div>

      <div class="gallery-grid">
        <div v-for="img in userImages" :key="img.id" class="gallery-card">
          <div class="gallery-img-box">
            <img 
              :src="img.image_url" 
              loading="lazy" 
              class="zoom-cursor"
              @click="openLightbox(img.image_url)"
            />
          </div>
          <div class="gallery-meta">
            <span class="user-badge">👤 {{ img.uploader_name || '热心葱粉' }}</span>
          </div>
        </div>
      </div>

      <div v-if="userImages.length === 0" class="empty-state">
        🍃 还没有人上传实物图，快来抢沙发！
      </div>
    </div>

    <footer class="detail-footer">
      <p>本页面基础数据来源于官方，实物图片及纠错信息由社区用户共同维护。</p>
    </footer>

    <transition name="fade">
      <div v-if="showLightbox" class="lightbox-overlay" @click="closeLightbox">
        <button class="lightbox-close-btn">✕</button>
        <div class="lightbox-img-container" @click.stop>
          <img :src="lightboxImage" class="lightbox-img" />
        </div>
      </div>
    </transition>

  </div>
  
  <div v-else class="loading-screen">
    <div class="spinner"></div>
    <p>正在读取档案...</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { createClient } from '@supabase/supabase-js'

const route = useRoute()
const itemId = route.params.id

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// 数据
const item = ref(null)
const officialImages = ref([]) 
const userImages = ref([])

// 交互
const showReportForm = ref(false)
const showUpload = ref(false)
const showLightbox = ref(false)
const lightboxImage = ref('')
const reportText = ref('')
const isSubmitting = ref(false)
const uploadStatus = ref('')
const uploaderName = ref('')

// ✨ 市价相关状态
const showPriceInput = ref(false)
const newMarketPrice = ref('')
const newPriceSource = ref('')
const newPriceLink = ref('') // 链接
const priceUploaderName = ref('') 
const isPriceRevealed = ref(false) 
const proofFile = ref(null) // 凭证图片文件
const isUploadingProof = ref(false)

// 💴 汇率状态 (默认保底 0.048)
const exchangeRate = ref(0.048) 

// 🔄 自动获取汇率
const fetchExchangeRate = async () => {
  try {
    // 使用免费的公开 API 获取 JPY -> CNY 汇率
    const res = await fetch('https://open.er-api.com/v6/latest/JPY')
    const data = await res.json()
    if (data && data.rates && data.rates.CNY) {
      exchangeRate.value = data.rates.CNY
      console.log('💱 当前汇率已更新:', exchangeRate.value)
    }
  } catch (e) {
    console.warn('❌ 汇率获取失败，使用默认值 0.048', e)
  }
}

// 💰 汇率换算函数
const toCNY = (jpy) => {
  if (!jpy) return 0
  return Math.floor(jpy * exchangeRate.value)
}

// ⏳ 锁定逻辑
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

const fetchItem = async () => {
  const { data } = await supabase.from('items').select('*').eq('id', itemId).single()
  if (data) item.value = data
}

const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

const revealPrice = () => { isPriceRevealed.value = true }

// 处理凭证文件选择
const handleProofFile = (event) => {
  proofFile.value = event.target.files[0]
}

// ✨ 提交市价 (含凭证上传)
const submitMarketPrice = async () => {
  if (isLocked.value) { alert('⚠️ 价格冷却中！'); return }
  if (!newMarketPrice.value) { alert('请输入价格'); return }
  
  const price = parseInt(newMarketPrice.value)
  if (isNaN(price) || price < 0) { alert('价格错误'); return }
  if (!newPriceSource.value) { alert('请选择来源'); return }
  
  // 校验: 链接和截图至少要有一个
  if (!newPriceLink.value && !proofFile.value) {
    alert('⚠️ 为了防止乱填，请提供【商品链接】或【截图】作为凭证！')
    return
  }

  isUploadingProof.value = true
  let proofImageUrl = null

  // 1. 如果有图片，先上传
  if (proofFile.value) {
    const fileExt = proofFile.value.name.split('.').pop()
    const fileName = `proof-${itemId}-${Date.now()}.${fileExt}`
    const { error: upErr } = await supabase.storage.from('user_uploads').upload(fileName, proofFile.value)
    
    if (upErr) {
      alert('凭证图片上传失败: ' + upErr.message)
      isUploadingProof.value = false
      return
    }
    const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
    proofImageUrl = data.publicUrl
  }

  // 2. 更新数据库
  const { error } = await supabase
    .from('items')
    .update({ 
      market_price: price,
      market_price_updated_at: new Date().toISOString(),
      market_price_uploader: priceUploaderName.value || '匿名葱粉',
      market_price_source: newPriceSource.value,
      market_price_link: newPriceLink.value || null, // 存链接
      market_price_proof_image: proofImageUrl || null // 存截图
    })
    .eq('id', itemId)

  isUploadingProof.value = false

  if (!error) {
    alert('✅ 价格与凭证已提交！')
    showPriceInput.value = false
    newMarketPrice.value = ''
    newPriceSource.value = ''
    newPriceLink.value = ''
    proofFile.value = null
    fetchItem() 
  } else {
    alert('提交失败: ' + error.message)
  }
}

// ...其他函数保持不变...
const fetchOfficialImages = async () => {
  const { data } = await supabase.from('item_images').select('*').eq('item_id', itemId)
  if (data) officialImages.value = data
}
const fetchUserImages = async () => {
  const { data } = await supabase.from('user_images').select('*').eq('item_id', itemId).order('created_at', { ascending: false })
  if (data) userImages.value = data
}
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  uploadStatus.value = '正在上传...'
  const fileExt = file.name.split('.').pop()
  const fileName = `${itemId}-${Date.now()}.${fileExt}`
  const { error: uploadError } = await supabase.storage.from('user_uploads').upload(fileName, file)
  if (uploadError) { uploadStatus.value = '失败: ' + uploadError.message; return }
  const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
  const { error: dbError } = await supabase.from('user_images').insert([{ item_id: itemId, image_url: data.publicUrl, uploader_name: uploaderName.value || '热心葱粉' }])
  if (!dbError) { uploadStatus.value = '上传成功！'; showUpload.value = false; fetchUserImages() }
}
const submitReport = async () => {
  if (!reportText.value) return
  isSubmitting.value = true
  const { error } = await supabase.from('error_reports').insert([{ item_id: itemId, description: reportText.value }])
  if (!error) { alert('✅ 反馈已提交！'); reportText.value = ''; showReportForm.value = false } 
  isSubmitting.value = false
}
const openLightbox = (url) => { lightboxImage.value = url; showLightbox.value = true; document.body.style.overflow = 'hidden' }
const closeLightbox = () => { showLightbox.value = false; lightboxImage.value = ''; document.body.style.overflow = 'auto' }
onUnmounted(() => { document.body.style.overflow = 'auto' })

onMounted(() => {
  fetchExchangeRate() // ✨ 挂载时拉取汇率
  fetchItem()
  fetchOfficialImages()
  fetchUserImages()
})
</script>

<style scoped>
/* 基础样式保持不变... */
.container { max-width: 1000px; margin: 0 auto; padding: 20px; padding-bottom: 80px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; }
.nav-bar { margin-bottom: 30px; }
.back-link { text-decoration: none; color: #666; font-weight: 500; display: inline-flex; align-items: center; padding: 8px 16px; background: #f5f5f5; border-radius: 20px; transition: all 0.2s; }
.back-link:hover { background: #e0f7fa; color: #006064; }
.main-content { display: grid; grid-template-columns: 1fr; gap: 40px; }
@media (min-width: 768px) { .main-content { grid-template-columns: 400px 1fr; } }
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
.item-title { font-size: 24px; margin: 0 0 15px 0; line-height: 1.4; display: flex; align-items: center; gap: 10px; }
.id-tag { font-size: 14px; background: #eee; color: #666; padding: 2px 8px; border-radius: 6px; font-weight: normal; font-family: monospace; }
.tags-row { display: flex; gap: 10px; margin-bottom: 25px; }
.tag { font-size: 13px; padding: 4px 10px; border-radius: 6px; }
.char-tag { background: #e0f7fa; color: #006064; }
.cat-tag { background: #f3e5f5; color: #4a148c; }
.info-card { background: #fafafa; border-radius: 12px; padding: 20px; border: 1px solid #eee; }
.info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #e0e0e0; align-items: center; }
.info-row:last-child { border-bottom: none; }
.label { color: #888; font-weight: 500; }
.value { font-weight: 600; color: #333; }
.author-name { color: #39C5BB; font-weight: bold; }
.price-group { text-align: right; }
.original-price { color: #333; font-weight: bold; }
.cny-hint { font-size: 12px; color: #999; margin-left: 5px; font-weight: normal; }

/* ✨✨✨ 市价模块 (V4.0) ✨✨✨ */
.highlight-row { 
  background: #fff8e1; 
  margin: 0 -20px; 
  padding: 15px 20px; 
  border-top: 1px dashed #e0e0e0; 
  border-bottom: 1px dashed #e0e0e0;
  display: block; 
}
.market-header { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: flex-end; }
.provider-info { font-size: 11px; color: #aaa; text-align: right; max-width: 60%; line-height: 1.2; }
.market-content { display: flex; justify-content: space-between; align-items: flex-start; }

/* 价格马赛克 */
.price-display-box { 
  position: relative;
  background: #333; 
  color: white; 
  padding: 8px 15px; 
  border-radius: 6px; 
  cursor: pointer; 
  user-select: none;
  min-width: 140px;
  text-align: center;
}
.price-display-box.blurred .main-price,
.price-display-box.blurred .sub-price { filter: blur(6px); opacity: 0.5; }
.blur-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: rgba(255,255,255,0.9); font-weight: bold;
}
.price-display-box:not(.blurred) { background: white; border: 2px solid #ff9800; color: #ff5500; }

.main-price { font-size: 20px; font-weight: 800; line-height: 1.1; }
.sub-price { font-size: 11px; color: #999; font-weight: normal; margin-top: 2px; }
.rate-badge { background: #eee; padding: 1px 4px; border-radius: 3px; margin-left: 4px; font-size: 10px; }

.empty-price { color: #ccc; font-weight: normal; font-size: 14px; margin-top: 8px; }
.update-time { font-size: 10px; color: #bbb; margin-top: 12px; text-align: right; }

.action-area-col { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.proof-links { display: flex; gap: 5px; }
.proof-btn { text-decoration: none; font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid #ddd; background: white; color: #666; cursor: pointer; }
.proof-btn:hover { border-color: #39C5BB; color: #39C5BB; }

.lock-timer { font-size: 11px; color: #999; background: #eee; padding: 6px 10px; border-radius: 4px; }
.edit-price-btn { border: 1px solid #ddd; background: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; color: #666; }
.edit-price-btn:hover { color: #39C5BB; border-color: #39C5BB; }

/* 表单区域 */
.price-input-box { background: #fffde7; padding: 15px 20px; margin: 0 -20px; border-bottom: 1px dashed #e0e0e0; }
.input-hint { font-size: 11px; color: #ff9800; margin: 0 0 10px 0; }
.input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.input-field { display: flex; flex-direction: column; gap: 4px; }
.input-field.full-width { grid-column: span 2; }
.input-field label { font-size: 11px; color: #888; }
.mini-input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; outline: none; font-size: 13px; }
.full-width { width: 100%; }
.preview-price { font-size: 12px; color: #39C5BB; text-align: center; margin-bottom: 10px; font-weight: bold; }
.mini-submit-btn { width: 100%; background: #39C5BB; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.mini-submit-btn:hover { background: #2da8a0; }

.proof-input-section { margin-bottom: 15px; border-top: 1px dashed #e0e0e0; padding-top: 10px; }
.proof-input-section label { font-size: 11px; color: #888; display: block; margin-bottom: 5px; }
.file-upload-row { margin-top: 8px; }
.mini-file-btn { background: #eee; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; width: 100%; text-align: left; }
.mini-file-btn:hover { background: #e0e0e0; }

/* 其他样式保持... */
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
.detail-footer { margin-top: 60px; text-align: center; font-size: 12px; color: #ccc; padding-top: 20px; border-top: 1px solid #f0f0f0; }
.loading-screen { text-align: center; padding-top: 100px; color: #999; }
.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.92); z-index: 9999; display: flex; justify-content: center; align-items: center; cursor: zoom-out; padding: 20px; }
.lightbox-img-container { max-width: 95%; max-height: 95%; display: flex; justify-content: center; align-items: center; }
.lightbox-img { max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); cursor: default; }
.lightbox-close-btn { position: absolute; top: 20px; right: 30px; background: none; border: none; color: white; font-size: 40px; line-height: 1; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; z-index: 10000; }
.lightbox-close-btn:hover { opacity: 1; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>