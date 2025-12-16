<template>
  <div class="page-wrapper">
    <button class="back-home-btn" @click="$router.push('/')">
      ⬅ 返回首页
    </button>

    <div class="submit-container">
      <div class="form-box">
        
        <div class="mode-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: mode === 'single' }" 
            @click="mode = 'single'"
          >
            ✨ 单品发布
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: mode === 'batch' }" 
            @click="mode = 'batch'"
          >
            📦 批量上传 (系列周边)
          </button>
        </div>

        <div class="header-area">
          <h2 class="title">{{ mode === 'single' ? '发布单个作品' : '批量发布系列作品' }}</h2>
          <p class="subtitle">
            {{ mode === 'single' ? '分享你的收藏或创作' : '一次性上传多张图片，自动生成多个条目' }}
          </p>
        </div>

        <div v-if="mode === 'batch'" class="common-settings">
          <h3>🛠️ 公共设置 (应用于所有)</h3>
          <p class="hint-text">填写一次，应用到下面所有商品。</p>
          
          <div class="form-group">
            <label>投稿类型</label>
            <div class="type-selector small">
              <div class="type-card" :class="{ active: !form.is_fan_work }" @click="form.is_fan_work = false">🏢 官方</div>
              <div class="type-card" :class="{ active: form.is_fan_work }" @click="form.is_fan_work = true">🎨 同人</div>
            </div>
          </div>

          <div v-if="form.is_fan_work" class="form-group ai-group">
              <label class="checkbox-label">
                  <input type="checkbox" v-model="form.is_ai">
                  <span class="ai-text">🤖 本作品包含AI辅助创作</span>
              </label>
              <p class="mini-hint">如使用了AI生成或辅助，请务必勾选此项</p>
          </div>

          <div class="row">
            <div class="form-group half">
              <label>分类</label>
              <select v-model="form.category">
                <option value="手办模型">手办模型</option>
                <option value="徽章/吧唧">徽章/吧唧</option>
                <option value="插画/壁纸">插画/壁纸</option>
                <option value="服饰穿搭">服饰穿搭</option>
                <option value="小谷子/立牌">小谷子/立牌</option>
                <option value="痛车/痛衣">痛车/痛衣</option>
              </select>
            </div>
            <div class="form-group half">
              <label>作者署名</label>
              <input v-model="form.author" type="text" />
            </div>
          </div>
        </div>

        <div v-if="mode === 'single'">
          <div class="form-group">
            <label>名称 *</label>
            <input v-model="form.name" type="text" placeholder="例如: 2025雪未来手办" />
          </div>
          
          <div class="form-group">
            <label>类型</label>
            <div class="type-selector">
              <div class="type-card" :class="{ active: !form.is_fan_work }" @click="form.is_fan_work = false">🏢 官方周边</div>
              <div class="type-card" :class="{ active: form.is_fan_work }" @click="form.is_fan_work = true">🎨 同人/自制</div>
            </div>
          </div>

          <div v-if="form.is_fan_work" class="form-group ai-group" :class="{ checked: form.is_ai }">
              <label class="checkbox-label">
                  <input type="checkbox" v-model="form.is_ai">
                  <span class="ai-text">🤖 本作品使用了AI辅助创作</span>
              </label>
              <p class="mini-hint">为了社区环境，如使用了AI生成或辅助，请务必勾选此项</p>
          </div>

          <div class="form-group">
            <label>分类</label>
            <select v-model="form.category">
              <option value="手办模型">手办模型</option>
              <option value="徽章/吧唧">徽章/吧唧</option>
              <option value="插画/壁纸">插画/壁纸</option>
              <option value="服饰穿搭">服饰穿搭</option>
              <option value="小谷子/立牌">小谷子/立牌</option>
            </select>
          </div>

          <div class="form-group">
            <label>图片 *</label>
            <div class="upload-area" @click="$refs.singleFile.click()">
              <img v-if="previewImage" :src="previewImage" class="preview-img" />
              <div v-else class="upload-placeholder"><span>📷 点击上传</span></div>
            </div>
            <input type="file" ref="singleFile" @change="handleSingleFile" accept="image/*" style="display:none" />
          </div>
          
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="form.description" rows="3"></textarea>
          </div>
          
          <button @click="submitSingle" class="submit-btn" :disabled="uploading">
            {{ uploading ? '上传中...' : '🚀 发布' }}
          </button>
        </div>

        <div v-else>
          <div class="batch-upload-box" @click="$refs.batchFile.click()">
            <span class="icon">📂</span>
            <span class="text">点击选择多张图片 (支持按住 Ctrl/Shift 多选)</span>
            <span class="sub-text">将自动为您生成列表</span>
          </div>
          <input type="file" ref="batchFile" @change="handleBatchFiles" accept="image/*" multiple style="display:none" />

          <div v-if="batchList.length > 0" class="batch-list">
            <div v-for="(item, index) in batchList" :key="index" class="batch-item">
              <div class="item-left">
                <img :src="item.preview" class="thumb" />
                <button @click="removeBatchItem(index)" class="remove-btn">✕</button>
              </div>
              <div class="item-right">
                <div class="form-group compact">
                  <input v-model="item.name" type="text" placeholder="名称" class="batch-input bold" />
                </div>
                <div class="row">
                  <input v-model="item.price" type="number" placeholder="价格(选填)" class="batch-input" />
                  <input v-model="item.character" type="text" placeholder="角色" class="batch-input" />
                </div>
              </div>
            </div>
          </div>

          <div v-if="batchList.length > 0" class="batch-actions">
            <div class="progress-bar" v-if="uploading">
              <div class="progress-fill" :style="{ width: progress + '%' }"></div>
              <span class="progress-text">{{ progress }}% ({{ successCount }}/{{ batchList.length }})</span>
            </div>
            
            <button @click="submitBatch" class="submit-btn" :disabled="uploading">
              {{ uploading ? '正在批量上传...' : `🚀 全部发布 (${batchList.length}个)` }}
            </button>
          </div>
        </div>
      </div>

      <div class="history-box" v-if="currentUser">
        <div class="history-header">
          <h3>📂 我的投稿记录</h3>
          <button @click="fetchMyHistory" class="refresh-sm-btn">🔄 刷新</button>
        </div>

        <div v-if="loadingHistory" class="loading-text">加载中...</div>
        <div v-else-if="myHistory.length === 0" class="empty-text">你还没有投稿过内容哦 ~</div>
        <div v-else class="history-list">
          <div v-for="item in myHistory" :key="item.id" class="history-item">
            <img :src="item.image_url" class="h-thumb" />
            <div class="h-info">
              <div class="h-top">
                <span class="h-name">{{ item.name }}</span>
                <span class="h-date">{{ new Date(item.created_at).toLocaleDateString() }}</span>
              </div>
              <div class="h-bottom">
                 <span v-if="item.status === 'pending'" class="status-pill pending">⏳ 审核中</span>
                 <span v-else-if="item.status === 'approved'" class="status-pill success">✅ 已发布</span>
                 <span v-else class="status-pill rejected">❌ 未通过</span>
                 <span class="h-cat">{{ item.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()

const mode = ref('single')
const uploading = ref(false)
const currentUser = ref(null)

const myHistory = ref([])
const loadingHistory = ref(false)

const previewImage = ref(null)
const fileToUpload = ref(null)
const batchList = ref([]) 
const progress = ref(0)
const successCount = ref(0)

const form = reactive({
  name: '',
  is_fan_work: false,
  is_ai: false,
  category: '手办模型',
  character: '初音未来',
  description: '',
  author: ''
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/login') }
  else {
    currentUser.value = user
    form.author = user.user_metadata?.username || '匿名'
    fetchMyHistory()
  }
})

const fetchMyHistory = async () => {
  if (!currentUser.value) return
  loadingHistory.value = true
  const { data } = await supabase.from('items').select('id, name, image_url, status, category, created_at').eq('uploader_id', currentUser.value.id).order('created_at', { ascending: false })
  if (data) myHistory.value = data
  loadingHistory.value = false
}

const handleSingleFile = (e) => {
  const file = e.target.files[0]
  if (file) {
    fileToUpload.value = file
    previewImage.value = URL.createObjectURL(file)
  }
}

const submitSingle = async () => {
  if (!form.name || !fileToUpload.value) return alert('请填写完整')
  uploading.value = true
  try {
    const url = await uploadFile(fileToUpload.value)
    await insertItem({ ...form, image_url: url })
    alert('发布成功！请等待审核')
    form.name = ''
    form.description = ''
    fileToUpload.value = null
    previewImage.value = null
    fetchMyHistory()
  } catch (e) { alert(e.message) }
  uploading.value = false
}

const handleBatchFiles = (e) => {
  const files = Array.from(e.target.files)
  files.forEach(file => {
    const defaultName = file.name.replace(/\.[^/.]+$/, "")
    batchList.value.push({
      file: file, preview: URL.createObjectURL(file), name: defaultName, price: null, character: form.character 
    })
  })
}

const removeBatchItem = (index) => { batchList.value.splice(index, 1) }

const submitBatch = async () => {
  if (batchList.value.length === 0) return
  uploading.value = true
  progress.value = 0
  successCount.value = 0
  const total = batchList.value.length
  for (let i = 0; i < total; i++) {
    const item = batchList.value[i]
    try {
      const url = await uploadFile(item.file)
      await insertItem({
        name: item.name, price: item.price, character: item.character, is_fan_work: form.is_fan_work, is_ai: form.is_ai, category: form.category, author: form.author, description: form.description, image_url: url
      })
      successCount.value++
      progress.value = Math.floor((successCount.value / total) * 100)
    } catch (e) { console.error(`Failed`, e) }
  }
  uploading.value = false
  alert(`批量处理完成！成功上传 ${successCount.value} / ${total} 个`)
  batchList.value = [] 
  fetchMyHistory() 
}

const uploadFile = async (file) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `uploads/${currentUser.value.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const { error } = await supabase.storage.from('user_uploads').upload(fileName, file)
  if (error) throw error
  const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
  return data.publicUrl
}

const insertItem = async (itemData) => {
  const { error } = await supabase.from('items').insert([{
    name: itemData.name, price: itemData.price, image_url: itemData.image_url, category: itemData.category, character: itemData.character, author: itemData.author, description: itemData.description, is_ai: itemData.is_ai, uploader_id: currentUser.value.id, status: 'pending', release_date: new Date().toISOString()
  }])
  if (error) throw error
}
</script>

<style scoped>
.page-wrapper { background: #f0f9f9; min-height: 100vh; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; gap: 30px; font-family: sans-serif; position: relative; }

/* 🔙 样式 */
.back-home-btn { position: absolute; top: 20px; left: 20px; background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; color: #555; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: 0.2s; z-index: 100; }
.back-home-btn:hover { background: #39C5BB; color: white; border-color: #39C5BB; }

.submit-container { width: 100%; max-width: 700px; }
.form-box { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }

/* Tabs & Form Styles (Same as before) */
.mode-tabs { display: flex; border-bottom: 2px solid #eee; margin-bottom: 20px; }
.tab-btn { flex: 1; padding: 15px; border: none; background: none; font-size: 16px; font-weight: bold; color: #999; cursor: pointer; border-bottom: 3px solid transparent; transition: 0.3s; }
.tab-btn.active { color: #39C5BB; border-bottom-color: #39C5BB; background: #e0f7fa33; }
.header-area { text-align: center; margin-bottom: 20px; }
.title { color: #333; margin: 0; }
.subtitle { color: #999; font-size: 13px; margin-top: 5px; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; font-weight: bold; font-size: 13px; margin-bottom: 6px; color: #555; }
input, select, textarea { width: 100%; padding: 10px; border: 2px solid #eee; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
input:focus, select:focus { border-color: #39C5BB; outline: none; }
.type-selector { display: flex; gap: 10px; }
.type-card { flex: 1; border: 2px solid #eee; padding: 10px; border-radius: 6px; text-align: center; cursor: pointer; background: #fafafa; }
.type-card.active { border-color: #39C5BB; background: #e0f7fa; color: #00695c; }
.type-selector.small .type-card { padding: 8px; font-size: 13px; }
.ai-group { background: #f8f6ff; padding: 10px; border-radius: 8px; border: 1px dashed #b39ddb; margin-top: 10px; transition: 0.3s; }
.ai-group.checked { background: #efebee; border-style: solid; border-color: #7e57c2; }
.checkbox-label { display: flex !important; align-items: center; cursor: pointer; margin-bottom: 0 !important; }
.checkbox-label input { width: auto; margin-right: 10px; transform: scale(1.2); }
.ai-text { color: #5e35b1; font-weight: bold; }
.mini-hint { font-size: 12px; color: #7e57c2; margin: 4px 0 0 24px; }
.row { display: flex; gap: 10px; }
.half { flex: 1; }
.upload-area { height: 150px; border: 2px dashed #ccc; border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer; background: #fafafa; overflow: hidden; }
.preview-img { width: 100%; height: 100%; object-fit: contain; }
.submit-btn { width: 100%; background: #39C5BB; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 20px; }
.submit-btn:disabled { opacity: 0.6; }
.common-settings { background: #fff8e1; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px dashed #ffd54f; }
.common-settings h3 { margin: 0 0 5px 0; font-size: 14px; color: #f57f17; }
.hint-text { font-size: 12px; color: #888; margin-bottom: 10px; }
.batch-upload-box { border: 2px dashed #39C5BB; background: #e0f7fa; padding: 30px; text-align: center; border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: center; transition: 0.2s; }
.batch-upload-box:hover { background: #b2dfdb; }
.batch-upload-box .icon { font-size: 32px; margin-bottom: 10px; }
.batch-upload-box .text { font-weight: bold; color: #00695c; }
.batch-upload-box .sub-text { font-size: 12px; color: #004d40; margin-top: 5px; }
.batch-list { margin-top: 20px; max-height: 400px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; }
.batch-item { display: flex; gap: 10px; padding: 10px; border-bottom: 1px solid #eee; align-items: center; }
.batch-item:last-child { border-bottom: none; }
.item-left { position: relative; width: 60px; height: 60px; flex-shrink: 0; }
.thumb { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.remove-btn { position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.item-right { flex: 1; }
.batch-input { padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; width: 100%; margin-bottom: 4px; box-sizing: border-box; }
.batch-input.bold { font-weight: bold; color: #333; }
.progress-bar { height: 20px; background: #eee; border-radius: 10px; margin-top: 15px; position: relative; overflow: hidden; }
.progress-fill { height: 100%; background: #39C5BB; transition: width 0.3s; }
.progress-text { position: absolute; width: 100%; text-align: center; top: 0; font-size: 12px; line-height: 20px; color: #333; text-shadow: 0 0 2px white; }

/* History Styles */
.history-box { width: 100%; max-width: 700px; background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.history-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px; }
.history-header h3 { margin: 0; color: #00695c; }
.refresh-sm-btn { padding: 5px 10px; font-size: 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }
.refresh-sm-btn:hover { background: #f5f5f5; }
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item { display: flex; gap: 15px; padding: 10px; border: 1px solid #eee; border-radius: 8px; background: #fafafa; }
.h-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
.h-info { flex: 1; display: flex; flex-direction: column; justify-content: space-around; }
.h-top { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: #333; }
.h-date { font-size: 12px; color: #999; font-weight: normal; }
.h-bottom { display: flex; gap: 10px; align-items: center; }
.h-cat { font-size: 12px; color: #666; background: #eee; padding: 2px 6px; border-radius: 4px; }
.status-pill { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: bold; }
.status-pill.pending { background: #fff3e0; color: #ef6c00; border: 1px solid #ffe0b2; }
.status-pill.success { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.status-pill.rejected { background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
.empty-text { text-align: center; color: #aaa; padding: 20px; }
.loading-text { text-align: center; color: #666; padding: 20px; }
</style>