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
            <img :src="item.image_url" class="official-image" />
            <div class="source-badge">✨ 官方/Piapro 数据源</div>
          </div>
          <a :href="item.link" target="_blank" class="buy-btn">
            🔗 前往官网查看/购买
          </a>
        </div>
  
        <div class="right-column">
          <h1 class="item-title">{{ item.name }}</h1>
          
          <div class="tags-row">
            <span class="tag char-tag">{{ item.character || '未知角色' }}</span>
            <span class="tag cat-tag">{{ item.category || '周边' }}</span>
          </div>
  
          <div class="info-card">
            <div class="info-row">
              <span class="label">💰 参考价格</span>
              <span class="value price">¥{{ item.price }}</span>
            </div>
            <div class="info-row">
              <span class="label">📅 发售日期</span>
              <span class="value">{{ item.release_date || '暂无数据' }}</span>
            </div>
            <div class="info-row">
              <span class="label">📍 数据来源</span>
              <span class="value">Piapro Blog (官方博客)</span>
            </div>
          </div>
  
          <div class="report-box">
            <p class="report-hint">发现信息有误？</p>
            <button @click="showReportForm = !showReportForm" class="report-btn">
              ⚠️ 提交纠错 / 补充信息
            </button>
            
            <div v-if="showReportForm" class="report-form">
              <textarea 
                v-model="reportText" 
                placeholder="请描述错误内容（例如：价格应该是3900日元，发售日是2024年...）"
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
              <img :src="img.image_url" loading="lazy" />
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
  
    </div>
    
    <div v-else class="loading-screen">
      <div class="spinner"></div>
      <p>正在读取档案...</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { createClient } from '@supabase/supabase-js'
  
  const route = useRoute()
  const itemId = route.params.id
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // 数据状态
  const item = ref(null)
  const userImages = ref([])
  
  // 交互状态
  const showReportForm = ref(false)
  const showUpload = ref(false)
  const reportText = ref('')
  const isSubmitting = ref(false)
  const uploadStatus = ref('')
  const uploaderName = ref('')
  
  // 1. 获取详情
  const fetchItem = async () => {
    const { data } = await supabase.from('items').select('*').eq('id', itemId).single()
    if (data) item.value = data
  }
  
  // 2. 获取用户图
  const fetchUserImages = async () => {
    const { data } = await supabase
      .from('user_images')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
    if (data) userImages.value = data
  }
  
  // 3. 上传图片 (带昵称)
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
  
    uploadStatus.value = '正在上传...'
    const fileExt = file.name.split('.').pop()
    const fileName = `${itemId}-${Date.now()}.${fileExt}`
    
    // 上传文件
    const { error: uploadError } = await supabase.storage
      .from('user_uploads')
      .upload(fileName, file)
  
    if (uploadError) {
      uploadStatus.value = '失败: ' + uploadError.message
      return
    }
  
    // 获取链接
    const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
    
    // 写入数据库 (存入昵称)
    const { error: dbError } = await supabase
      .from('user_images')
      .insert([{ 
        item_id: itemId, 
        image_url: data.publicUrl,
        uploader_name: uploaderName.value || '热心葱粉' // 👈 这里存入名字
      }])
  
    if (!dbError) {
      uploadStatus.value = '上传成功！感谢分享！🎉'
      showUpload.value = false
      fetchUserImages() // 刷新
    }
  }
  
  // 4. 提交报错
  const submitReport = async () => {
    if (!reportText.value) return
    isSubmitting.value = true
    
    const { error } = await supabase
      .from('error_reports')
      .insert([{ item_id: itemId, description: reportText.value }])
  
    if (!error) {
      alert('✅ 反馈已提交！感谢您帮助维护图鉴。')
      reportText.value = ''
      showReportForm.value = false
    } else {
      alert('提交失败，请检查网络。')
    }
    isSubmitting.value = false
  }
  
  onMounted(() => {
    fetchItem()
    fetchUserImages()
  })
  </script>
  
  <style scoped>
  /* 全局容器 */
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    padding-bottom: 80px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #333;
  }
  
  /* 导航 */
  .nav-bar { margin-bottom: 30px; }
  .back-link {
    text-decoration: none;
    color: #666;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background: #f5f5f5;
    border-radius: 20px;
    transition: all 0.2s;
  }
  .back-link:hover { background: #e0f7fa; color: #006064; }
  
  /* 主内容区布局 */
  .main-content {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
  }
  @media (min-width: 768px) {
    .main-content { grid-template-columns: 400px 1fr; }
  }
  
  /* 左侧图片 */
  .image-wrapper {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    background: white;
  }
  .official-image { width: 100%; display: block; }
  .source-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0,0,0,0.6);
    color: white;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    backdrop-filter: blur(4px);
  }
  .buy-btn {
    display: block;
    margin-top: 15px;
    background: #39C5BB;
    color: white;
    text-align: center;
    padding: 14px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: bold;
    box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3);
    transition: transform 0.2s;
  }
  .buy-btn:hover { transform: translateY(-2px); background: #2da8a0; }
  
  /* 右侧信息 */
  .item-title { font-size: 24px; margin: 0 0 15px 0; line-height: 1.4; }
  .tags-row { display: flex; gap: 10px; margin-bottom: 25px; }
  .tag { font-size: 13px; padding: 4px 10px; border-radius: 6px; }
  .char-tag { background: #e0f7fa; color: #006064; }
  .cat-tag { background: #f3e5f5; color: #4a148c; }
  
  .info-card {
    background: #fafafa;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #eee;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px dashed #e0e0e0;
  }
  .info-row:last-child { border-bottom: none; }
  .label { color: #888; font-weight: 500; }
  .value { font-weight: 600; color: #333; }
  .price { color: #ff5588; font-size: 18px; }
  
  /* 纠错模块 */
  .report-box { margin-top: 30px; text-align: right; }
  .report-hint { display: inline-block; font-size: 12px; color: #999; margin-right: 10px; }
  .report-btn {
    background: none;
    border: 1px solid #ddd;
    color: #666;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
  }
  .report-form { margin-top: 10px; text-align: right; }
  .report-form textarea {
    width: 100%;
    height: 80px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 10px;
    font-family: inherit;
  }
  
  /* 分割线 */
  .divider {
    margin: 60px 0 40px 0;
    text-align: center;
    position: relative;
  }
  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 1px;
    background: #eee;
    z-index: 0;
  }
  .divider-text {
    background: #fcfcfc; /* 这里的背景色要和body背景色一致 */
    padding: 0 20px;
    color: #999;
    font-size: 14px;
    position: relative;
    z-index: 1;
  }
  
  /* 用户相册 */
  .gallery-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .upload-toggle-btn {
    background: #333;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 13px;
  }
  .upload-panel {
    background: #f0f0f0;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
  .name-input {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    outline: none;
  }
  .select-file-btn {
    background: #39C5BB;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
  }
  
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 15px;
  }
  .gallery-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    border: 1px solid #eee;
  }
  .gallery-img-box {
    width: 100%;
    aspect-ratio: 1/1;
    overflow: hidden;
  }
  .gallery-img-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }
  .gallery-img-box img:hover { transform: scale(1.05); }
  .gallery-meta {
    padding: 8px;
    font-size: 12px;
    color: #666;
    background: #fbfbfb;
    border-top: 1px solid #f0f0f0;
  }
  
  .empty-state {
    text-align: center;
    padding: 40px;
    color: #999;
    background: #f9f9f9;
    border-radius: 12px;
  }
  
  .detail-footer {
    margin-top: 60px;
    text-align: center;
    font-size: 12px;
    color: #ccc;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;
  }
  
  .loading-screen { text-align: center; padding-top: 100px; color: #999; }
  </style>