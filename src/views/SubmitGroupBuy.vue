<template>
    <div class="group-buy-container">
      <div class="form-card">
        <header class="header">
          <button class="back-btn" @click="$router.go(-1)">⬅</button>
          <div>
            <h2>📦 发起拼团 / 代购</h2>
            <p>作为团长发起车队，召集同好上车</p>
          </div>
        </header>
  
        <div v-if="fromItem" class="source-tip">
          <img :src="fromItem.img" class="source-thumb">
          <div class="source-info">
            <span class="badge">关联商品</span>
            <p class="source-name">{{ fromItem.name }}</p>
            <div class="price-ref">
              参考价: {{ fromItem.price }} 円 / 约 {{ fromItem.price_cny }} CNY
            </div>
          </div>
        </div>
  
        <div class="form-body">
          <div class="section-title">📝 基础信息</div>
          
          <div class="form-group">
            <label>团购标题 (必填)</label>
            <input v-model="form.name" type="text" placeholder="例如：魔法未来2025 法被 (场贩人肉带回)" class="std-input" />
          </div>
  
          <div class="form-group">
            <label>封面图</label>
            <div 
              class="upload-area" 
              @click="triggerUpload" 
              :style="previewUrl ? { backgroundImage: `url(${previewUrl})` } : {}"
            >
              <div v-if="!previewUrl" class="upload-placeholder">
                <span>📷 点击上传封面</span>
              </div>
              <div v-else-if="fromItem && !selectedFile" class="default-tag">
                默认使用商品原图 (点击更换)
              </div>
            </div>
            <input type="file" ref="fileInput" @change="handleFileChange" accept="image/*" hidden />
          </div>
  
          <div class="section-title">💰 价格与规则</div>
  
          <div class="form-row">
            <div class="form-group half">
              <label>单价/定金 (CNY)</label>
              <input v-model="form.target_amount" type="number" placeholder="0" class="std-input" />
            </div>
            <div class="form-group half">
              <label>截团日期</label>
              <input v-model="form.end_date" type="date" class="std-input" />
            </div>
          </div>
  
          <div class="form-group">
            <label>交易/发货规则详情</label>
            <textarea 
              v-model="form.description" 
              rows="8" 
              placeholder="请务必详细说明：
  1. 商品全款计算方式（汇率、代购费）
  2. 国际/国内运费分摊方式
  3. 预计发货时间
  4. 跑单/退款规则" 
              class="std-input textarea"
            ></textarea>
          </div>
  
          <div class="actions">
            <button class="submit-btn" @click="submit" :disabled="submitting">
              {{ submitting ? '🚀 创建中...' : '✨ 立即开车' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { supabase } from '../supabase'
  import { useUserStore } from '../stores/userStore'
  import { uploadImage } from '../services/storage'
  
  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()
  
  const fileInput = ref(null)
  const previewUrl = ref('')
  const selectedFile = ref(null)
  const submitting = ref(false)
  const fromItem = ref(null)
  
  const form = reactive({
    name: '',
    target_amount: '', // 这里作为单价使用，或者总目标
    end_date: '',
    description: ''
  })
  
  onMounted(async () => {
    if (!userStore.user) {
      alert('请先登录')
      router.push('/login')
      return
    }
  
    // 读取 URL 参数
    if (route.query.from_item_id) {
      fromItem.value = {
        id: route.query.from_item_id,
        name: route.query.name,
        img: route.query.img,
        price: route.query.price,       // 日元
        price_cny: route.query.price_cny // 估价
      }
      // 自动填充
      form.name = `[拼团] ${route.query.name}`
      previewUrl.value = route.query.img
    }
  })
  
  const triggerUpload = () => fileInput.value.click()
  
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      selectedFile.value = file
      previewUrl.value = URL.createObjectURL(file)
    }
  }
  
  const submit = async () => {
    if (!form.name) return alert('请输入标题')
    if (!form.target_amount) return alert('请输入金额')
    
    submitting.value = true
    try {
      let imageUrl = previewUrl.value
      // 上传新图
      if (selectedFile.value) {
        imageUrl = await uploadImage('project_covers', 'covers', selectedFile.value)
      }
  
      // 存入 projects 表 (我们用这个表存所有活动)
      // 区别在于：linked_item_id 不为空，且没有 circle_id
      const payload = {
        name: form.name,
        target_amount: form.target_amount, 
        current_amount: 0,
        end_date: form.end_date || null,
        description: form.description,
        image_url: imageUrl,
        status: 'active',
        organizer_id: userStore.user.id,
        linked_item_id: fromItem.value?.id || null,
        // 可以在 description 里偷偷加个标记，或者以后加个 type 字段
        // 目前靠 linked_item_id 就能知道它是周边团购
      }
  
      const { error } = await supabase.from('projects').insert([payload])
      if (error) throw error
      
      alert('开团成功！')
      router.push('/projects') // 或者去个人中心
    } catch (e) {
      alert('失败: ' + e.message)
    } finally {
      submitting.value = false
    }
  }
  </script>
  
  <style scoped>
  .group-buy-container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f6f8; min-height: 100vh; }
  .form-card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
  
  .header { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
  .back-btn { background: #f5f5f5; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer; }
  .header h2 { margin: 0; font-size: 18px; color: #333; }
  .header p { margin: 2px 0 0 0; font-size: 12px; color: #999; }
  
  /* 关联商品 */
  .source-tip { background: #e6fffa; border: 1px solid #39C5BB; border-radius: 8px; padding: 10px; display: flex; gap: 10px; align-items: center; margin-bottom: 25px; }
  .source-thumb { width: 50px; height: 50px; border-radius: 6px; object-fit: cover; background: #fff; }
  .source-info { flex: 1; overflow: hidden; }
  .badge { font-size: 10px; background: #39C5BB; color: white; padding: 1px 5px; border-radius: 3px; }
  .source-name { margin: 4px 0 2px 0; font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .price-ref { font-size: 11px; color: #666; }
  
  .section-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 15px; margin-top: 10px; border-left: 3px solid #39C5BB; padding-left: 8px; }
  
  .form-group { margin-bottom: 18px; }
  .form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: bold; color: #555; }
  .std-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
  .std-input:focus { border-color: #39C5BB; outline: none; }
  .textarea { resize: vertical; line-height: 1.5; }
  
  .upload-area { height: 160px; border: 2px dashed #ddd; border-radius: 8px; background: #fafafa; display: flex; align-items: center; justify-content: center; cursor: pointer; background-size: cover; background-position: center; position: relative; }
  .default-tag { position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.6); color: white; font-size: 12px; text-align: center; padding: 5px; }
  
  .form-row { display: flex; gap: 15px; }
  .form-row .half { flex: 1; }
  
  .submit-btn { width: 100%; padding: 12px; background: #39C5BB; color: white; border: none; border-radius: 25px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 10px; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
  </style>