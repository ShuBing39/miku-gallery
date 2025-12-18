<template>
    <div class="edit-container">
      <button class="back-btn" @click="$router.go(-1)">⬅ 取消并返回</button>
      
      <div class="editor-box">
        <div class="header-row">
          <h2>{{ isEditMode ? '✏️ 编辑词条' : '📝 创建新词条' }}</h2>
          <button v-if="!isEditMode" class="import-btn" @click="showImportModal = true">
            📦 从周边库导入
          </button>
        </div>
        
        <div class="form-group">
          <label>词条标题 (建议写成问题) *</label>
          <input v-model="form.title" placeholder="例如: 应援棒去哪里买？ / 演唱会可以带水吗？" class="std-input title-input">
        </div>
  
        <div class="form-group">
          <label>核心关键词 (Tag) *</label>
          <p class="sub-label">用户搜索时，只要包含这些词就会联想到本条目。输入后按 <strong>回车(Enter)</strong> 添加。</p>
          
          <div class="tag-input-wrapper">
            <div class="tag-chips">
              <span v-for="(tag, index) in form.tags" :key="index" class="smart-tag">
                #{{ tag }}
                <span class="del-tag" @click="removeTag(index)">×</span>
              </span>
              <input 
                v-model="tagInput" 
                @keydown.enter.prevent="addTag" 
                @keydown.backspace="handleBackspace"
                placeholder="输入关键词(如: 应援棒)..." 
                class="tag-real-input"
              >
            </div>
          </div>
        </div>
  
        <div class="form-group">
          <label>分类</label>
          <div class="cats">
            <span v-for="c in categories" :key="c" 
              class="cat-chip" 
              :class="{ active: form.category === c }"
              @click="form.category = c"
            >{{ c }}</span>
          </div>
        </div>
  
        <div class="form-group">
          <label>配图 (可选)</label>
          <div class="upload-area">
            <input type="file" accept="image/*" @change="handleFile" class="file-input">
            <div v-if="preview || form.image_url" class="img-preview">
              <img :src="preview || form.image_url">
              <button v-if="form.image_url" @click="form.image_url = ''; preview = null" class="clear-img">✕ 移除</button>
            </div>
          </div>
        </div>
  
        <div class="form-group">
          <label>正文内容 (答案/科普) *</label>
          <textarea 
            v-model="form.content" 
            rows="12" 
            placeholder="请详细解答标题提出的问题，或进行相关科普..." 
            class="std-input area"
          ></textarea>
        </div>
  
        <div class="actions">
          <button class="save-btn" @click="submit" :disabled="uploading">
            {{ uploading ? '正在保存...' : '💾 发布词条' }}
          </button>
        </div>
      </div>
  
      <div v-if="showImportModal" class="modal-overlay">
        <div class="modal-content">
          <h3>🔍 搜索周边库</h3>
          <input v-model="importSearch" @input="searchItems" placeholder="输入关键词..." class="std-input">
          <div class="import-list">
            <div v-for="item in importResults" :key="item.id" class="import-item" @click="selectImportItem(item)">
              <img :src="item.image_url" class="mini-thumb">
              <div class="info"><div class="name">{{ item.name }}</div></div>
              <button class="use-btn">选择</button>
            </div>
            <div v-if="importResults.length === 0 && importSearch" class="empty-mini">未找到</div>
          </div>
          <button class="close-modal" @click="showImportModal = false">关闭</button>
        </div>
      </div>
  
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { createClient } from '@supabase/supabase-js'
  import { useRouter, useRoute } from 'vue-router'
  
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  const router = useRouter()
  const route = useRoute()
  
  const categories = ['科普', '攻略', '历史', '活动', '周边', '应援文化', '冷知识']
  const currentUser = ref(null)
  const uploading = ref(false)
  const fileToUpload = ref(null)
  const preview = ref(null)
  
  // 导入相关
  const showImportModal = ref(false)
  const importSearch = ref('')
  const importResults = ref([])
  let debounceTimer = null
  
  const tagInput = ref('')
  const form = ref({
    title: '',
    category: '科普',
    content: '',
    image_url: '',
    tags: [] // 🔥 新增：标签数组
  })
  
  const isEditMode = computed(() => !!route.query.id)
  
  onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('请先登录'); router.push('/login'); return }
    currentUser.value = user
  
    if (route.query.id) {
      loadArticle(route.query.id)
    } else if (route.query.title) {
      form.value.title = route.query.title
      // 尝试把标题作为第一个tag
      form.value.tags.push(route.query.title)
    } else if (route.query.import_id) {
      loadItemAsTemplate(route.query.import_id)
    }
  })
  
  // --- Tag 逻辑 ---
  const addTag = () => {
    const val = tagInput.value.trim()
    if (val && !form.value.tags.includes(val)) {
      form.value.tags.push(val)
    }
    tagInput.value = ''
  }
  const removeTag = (index) => {
    form.value.tags.splice(index, 1)
  }
  const handleBackspace = () => {
    if (tagInput.value === '' && form.value.tags.length > 0) {
      form.value.tags.pop()
    }
  }
  
  // --- 数据加载 ---
  const loadArticle = async (id) => {
    const { data } = await supabase.from('wiki_articles').select('*').eq('id', id).single()
    if (data) {
      form.value = data
      if (!form.value.tags) form.value.tags = [] // 确保数组存在
    }
  }
  
  const loadItemAsTemplate = async (itemId) => {
    const { data: item } = await supabase.from('items').select('*').eq('id', itemId).single()
    if (item) applyItemTemplate(item)
  }
  
  const searchItems = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      if (!importSearch.value.trim()) return
      const { data } = await supabase.from('items').select('*').ilike('name', `%${importSearch.value}%`).limit(5)
      importResults.value = data || []
    }, 300)
  }
  
  const selectImportItem = (item) => {
    applyItemTemplate(item)
    showImportModal.value = false
  }
  
  const applyItemTemplate = (item) => {
    form.value.title = item.name
    form.value.category = '周边'
    form.value.image_url = item.image_url
    // 自动把周边名加为 Tag
    if (!form.value.tags.includes(item.name)) form.value.tags.push(item.name)
    form.value.content = `## 📄 基本档案\n- **官方分类**: ${item.category}\n- **发售日期**: ${item.release_date || '未知'}\n- **官方定价**: ¥${item.price || '??'}\n\n## 📖 详细介绍\n${item.name} 是官方推出的周边产品...`
  }
  
  const handleFile = (e) => {
    const file = e.target.files[0]
    if (file) { fileToUpload.value = file; preview.value = URL.createObjectURL(file) }
  }
  
  const submit = async () => {
    if (!form.value.title || !form.value.content) return alert('标题和内容必填')
    // 确保当前输入框里的内容也被添加
    if (tagInput.value.trim()) addTag()
    
    uploading.value = true
  
    try {
      let finalUrl = form.value.image_url
      if (fileToUpload.value) {
        const fileName = `wiki/${Date.now()}_${fileToUpload.value.name}`
        await supabase.storage.from('user_uploads').upload(fileName, fileToUpload.value)
        const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
        finalUrl = data.publicUrl
      }
  
      const payload = {
        title: form.value.title,
        content: form.value.content,
        category: form.value.category,
        tags: form.value.tags, // 🔥 保存标签
        image_url: finalUrl,
        last_updated_by: currentUser.value.id,
        updated_at: new Date()
      }
  
      if (isEditMode.value) {
        await supabase.from('wiki_articles').update(payload).eq('id', route.query.id)
      } else {
        await supabase.from('wiki_articles').insert(payload)
      }
  
      alert('发布成功！')
      router.push('/encyclopedia')
    } catch (e) { alert('错误: ' + e.message) } finally { uploading.value = false }
  }
  </script>
  
  <style scoped>
  /* 保持原有样式，增加 Tag 样式 */
  .edit-container { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: 'Segoe UI', sans-serif; background: #f9f9f9; min-height: 100vh; }
  .back-btn { background: white; border: 1px solid #ddd; padding: 8px 20px; border-radius: 20px; cursor: pointer; color: #666; margin-bottom: 20px; font-weight: bold; }
  .editor-box { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
  .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px; }
  h2 { margin: 0; color: #333; font-size: 24px; }
  .import-btn { background: #e3f2fd; color: #1565c0; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }
  
  /* Tag Input Styles */
  .tag-input-wrapper { border: 2px solid #e0f2f1; padding: 5px; border-radius: 8px; background: white; min-height: 45px; display: flex; flex-wrap: wrap; align-items: center; }
  .tag-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 5px; width: 100%; }
  .smart-tag { background: #39C5BB; color: white; padding: 4px 10px; border-radius: 15px; font-size: 13px; display: flex; align-items: center; gap: 5px; }
  .del-tag { cursor: pointer; font-weight: bold; opacity: 0.8; }
  .del-tag:hover { opacity: 1; }
  .tag-real-input { border: none; outline: none; flex: 1; font-size: 14px; min-width: 150px; padding: 5px; }
  .sub-label { font-size: 12px; color: #888; margin-top: -5px; margin-bottom: 8px; }
  
  .form-group { margin-bottom: 25px; }
  .form-group label { display: block; font-weight: bold; margin-bottom: 10px; color: #444; font-size: 15px; }
  .std-input { width: 100%; padding: 12px 15px; border: 2px solid #eee; border-radius: 8px; box-sizing: border-box; font-size: 15px; transition: 0.2s; }
  .std-input:focus { border-color: #39C5BB; outline: none; }
  .cats { display: flex; gap: 10px; flex-wrap: wrap; }
  .cat-chip { padding: 8px 18px; background: #f5f5f5; border-radius: 20px; cursor: pointer; font-size: 14px; color: #666; transition: 0.2s; border: 1px solid transparent; font-weight: 500; }
  .cat-chip.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
  .img-preview { margin-top: 15px; position: relative; display: inline-block; }
  .img-preview img { max-height: 200px; border-radius: 8px; border: 1px solid #eee; }
  .clear-img { position: absolute; top: -10px; right: -10px; background: rgba(0,0,0,0.7); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .actions { text-align: right; margin-top: 40px; border-top: 1px solid #f0f0f0; padding-top: 20px; }
  .save-btn { background: #39C5BB; color: white; border: none; padding: 14px 40px; border-radius: 30px; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 15px rgba(57, 197, 187, 0.3); }
  .save-btn:hover { background: #26a69a; transform: translateY(-2px); }
  .save-btn:disabled { opacity: 0.6; cursor: wait; }
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 3000; }
  .modal-content { background: white; padding: 25px; border-radius: 12px; width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
  .import-list { margin-top: 15px; max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; }
  .import-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid #f9f9f9; cursor: pointer; transition: 0.2s; }
  .mini-thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; }
  .info { flex: 1; overflow: hidden; }
  .name { font-size: 13px; font-weight: bold; color: #333; }
  .use-btn { background: #39C5BB; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }
  .close-modal { width: 100%; padding: 10px; margin-top: 15px; background: #f5f5f5; border: none; border-radius: 6px; cursor: pointer; color: #666; }
  .empty-mini { padding: 20px; text-align: center; color: #999; font-size: 13px; }
  </style>