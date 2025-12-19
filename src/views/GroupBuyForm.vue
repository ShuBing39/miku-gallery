<template>
    <div class="gb-form-container">
      <div class="card">
        <h2>📦 发起拼团</h2>
        
        <div v-if="step === 1" class="step-box">
          <h3>第一步: 导入商品信息</h3>
          <div class="tabs">
            <button @click="importMode='url'" :class="{active: importMode==='url'}">🌏 官网抓取</button>
            <button @click="importMode='manual'" :class="{active: importMode==='manual'}">✍️ 手动录入</button>
          </div>
  
          <div v-if="importMode === 'url'" class="url-input-box">
            <input v-model="targetUrl" placeholder="输入官网商品页链接 (如 magicalmirai.com/goods)" class="std-input">
            <button @click="runScraper" :disabled="loading" class="btn-main">
              {{ loading ? '抓取中...' : '开始抓取' }}
            </button>
            <p class="hint">系统将自动识别商品名、价格和图片并翻译。</p>
          </div>
  
          <div v-if="scrapedItems.length > 0" class="preview-list">
            <div v-for="(item, idx) in scrapedItems" :key="idx" class="preview-item">
              <img :src="item.image_url" class="thumb">
              <div class="info">
                <input v-model="item.name" class="mini-input">
                <input v-model="item.price" type="number" class="mini-input-price"> JPY
              </div>
              <button @click="scrapedItems.splice(idx, 1)" class="btn-del">×</button>
            </div>
            <button @click="step = 2" class="btn-next">确认商品并下一步</button>
          </div>
        </div>
  
        <div v-if="step === 2" class="step-box">
          <h3>第二步: 设置规则</h3>
          
          <div class="form-group">
            <label>团购标题</label>
            <input v-model="form.title" class="std-input" placeholder="例如: 2025魔法未来 场贩拼团 (包含场购特典)">
          </div>
  
          <div class="row">
            <div class="col">
              <label>截单日期 (强制)</label>
              <input type="date" v-model="form.end_date" class="std-input">
            </div>
            <div class="col">
              <label>参考汇率</label>
              <input type="number" step="0.001" v-model="form.exchange_rate" class="std-input">
            </div>
          </div>
  
          <div class="form-group">
            <label class="danger-label">📜 拼团与捆物规则 (买家必读)</label>
            <textarea v-model="form.rules" rows="5" class="std-input" placeholder="请详细说明：是否会有捆物？流团条件？发货方式？(买家下单前必须勾选同意)"></textarea>
          </div>
          
          <div class="form-group">
            <label>收款码 (上传图片)</label>
             <input type="file" @change="uploadQR" class="std-input">
          </div>
  
          <div class="actions">
            <button @click="step = 1" class="btn-cancel">上一步</button>
            <button @click="submit" class="btn-main">🚀 正式发布</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive } from 'vue'
  import { useRouter } from 'vue-router'
  import { scrapeOfficialSite } from '../services/scraperService'
  import { createGroupBuy } from '../services/groupBuyService'
  import { useUserStore } from '../stores/userStore'
  import { uploadImage } from '../services/storage'
  
  const router = useRouter()
  const userStore = useUserStore()
  const step = ref(1)
  const importMode = ref('url')
  const targetUrl = ref('')
  const loading = ref(false)
  const scrapedItems = ref([])
  const qrFile = ref(null)
  
  const form = reactive({
    title: '',
    end_date: '',
    exchange_rate: 0.055,
    rules: '1. 不跑单 \n2. 捆物由团长按配比分配 \n3. 需提前确认收货',
    qr_code_url: ''
  })
  
  const runScraper = async () => {
    if (!targetUrl.value) return
    loading.value = true
    try {
      const items = await scrapeOfficialSite(targetUrl.value)
      if (items.length === 0) alert('未检测到商品，请尝试手动录入')
      scrapedItems.value = items
    } catch (e) {
      alert(e.message)
    } finally {
      loading.value = false
    }
  }
  
  const uploadQR = (e) => {
    qrFile.value = e.target.files[0]
  }
  
  const submit = async () => {
    if (!userStore.user) return alert('请先登录')
    if (!form.title || !form.end_date) return alert('请补全必填信息')
  
    try {
      let qrUrl = ''
      if (qrFile.value) {
        qrUrl = await uploadImage('user_uploads', 'qrcodes', qrFile.value)
      }
  
      const payload = {
        ...form,
        uploader_id: userStore.user.id,
        qr_code_url: qrUrl
      }
  
      await createGroupBuy(payload, scrapedItems.value)
      alert('开团成功！')
      router.push('/projects') // 或跳转到团购列表
    } catch (e) {
      console.error(e)
      alert('发布失败: ' + e.message)
    }
  }
  </script>
  
  <style scoped>
  .gb-form-container { padding: 30px; background: #f4f4f4; min-height: 100vh; display: flex; justify-content: center; }
  .card { background: white; width: 100%; max-width: 800px; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  .tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
  .tabs button { background: none; border: none; font-size: 16px; padding: 8px 16px; cursor: pointer; color: #666; }
  .tabs button.active { color: #39C5BB; font-weight: bold; border-bottom: 2px solid #39C5BB; }
  .url-input-box { display: flex; gap: 10px; margin-bottom: 20px; }
  .preview-list { display: grid; gap: 10px; }
  .preview-item { display: flex; gap: 10px; align-items: center; background: #fafafa; padding: 10px; border-radius: 6px; }
  .thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; }
  .info { flex: 1; display: flex; gap: 10px; }
  .btn-del { color: red; border: none; background: none; cursor: pointer; font-size: 20px; }
  .btn-main { background: #39C5BB; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
  .btn-next { width: 100%; background: #333; color: white; padding: 12px; margin-top: 20px; border: none; border-radius: 6px; cursor: pointer; }
  .std-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px; }
  .row { display: flex; gap: 20px; }
  .col { flex: 1; }
  .danger-label { color: #d32f2f; }
  </style>