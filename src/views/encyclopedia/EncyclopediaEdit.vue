<template>
  <div class="edit-container">
    <button class="back-btn" @click="$router.go(-1)">⬅ 取消并返回</button>
    
    <div class="editor-box">
      <div class="header-row">
        <h2>{{ isEditMode ? '✏️ 编辑词条' : '📝 创建新词条' }}</h2>
        <button v-if="!isEditMode" class="import-btn" @click="showImportModal = true">
          📦 从周边库导入模板
        </button>
      </div>
      
      <div class="form-group">
        <label>词条标题 (建议写成问题) *</label>
        <input v-model="form.title" placeholder="例如: 应援棒去哪里买？ / 演唱会可以带水吗？" class="std-input title-input">
      </div>

      <div class="form-group">
        <label>核心关键词 (Tag) *</label>
        <p class="sub-label">输入后按 <strong>回车(Enter)</strong> 添加标签。</p>
        
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
              placeholder="输入关键词(如: 魔法未来)..." 
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
          <div v-if="preview || form.image_url" class="img-preview">
            <img :src="preview || form.image_url">
            <button @click="clearImage" class="clear-img">✕ 移除</button>
          </div>
          <div v-else class="upload-placeholder" @click="$refs.fileInput.click()">
            <span>📷 点击上传图片</span>
          </div>
          <input ref="fileInput" type="file" accept="image/*" @change="handleFile" style="display:none">
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
        <button class="save-btn" @click="handleSubmit" :disabled="uploading">
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
          <div v-if="importResults.length === 0 && importSearch" class="empty-mini">未找到相关周边</div>
        </div>
        <button class="close-modal" @click="showImportModal = false">关闭</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// ✅ 修正路径：../../
import { useUserStore } from '../../stores/userStore'
import { uploadImage } from '../../services/storage'
import { supabase } from '../../services/supabase'
import { saveEntry, getEntryDetail } from '../../services/encyclopediaData'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const categories = ['科普', '攻略', '历史', '活动', '周边', '应援文化', '冷知识']
const uploading = ref(false)
const fileToUpload = ref(null)
const preview = ref(null)
const fileInput = ref(null)

// 导入相关
const showImportModal = ref(false)
const importSearch = ref('')
const importResults = ref([])
let debounceTimer = null

const tagInput = ref('')
const form = reactive({
  id: null, 
  title: '',
  category: '科普',
  content: '',
  image_url: '',
  tags: []
})

const isEditMode = computed(() => !!route.query.id)

onMounted(async () => {
  if (!userStore.user) {
    await userStore.initialize()
    if (!userStore.user) {
      alert('请先登录')
      router.push('/login')
      return
    }
  }

  if (route.query.id) {
    await loadExistingEntry(route.query.id)
  } else if (route.query.import_id) {
    await loadItemAsTemplate(route.query.import_id)
  }
})

const loadExistingEntry = async (id) => {
  try {
    const data = await getEntryDetail(id)
    if (data) {
      form.id = data.id
      form.title = data.title
      form.content = data.content
      form.category = data.category
      form.image_url = data.image_url
      form.tags = data.tags || []
    }
  } catch (e) {
    console.error('加载失败', e)
  }
}

const addTag = () => {
  const val = tagInput.value.trim()
  if (val && !form.tags.includes(val)) {
    form.tags.push(val)
  }
  tagInput.value = ''
}
const removeTag = (index) => form.tags.splice(index, 1)
const handleBackspace = () => {
  if (tagInput.value === '' && form.tags.length > 0) form.tags.pop()
}

const handleFile = (e) => {
  const file = e.target.files[0]
  if (file) {
    fileToUpload.value = file
    preview.value = URL.createObjectURL(file)
  }
}
const clearImage = () => {
  form.image_url = ''
  preview.value = null
  fileToUpload.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const handleSubmit = async () => {
  if (!form.title || !form.content) return alert('标题和内容必填')
  if (tagInput.value.trim()) addTag() 
  
  uploading.value = true

  try {
    let finalUrl = form.image_url
    if (fileToUpload.value) {
      finalUrl = await uploadImage('user_uploads', 'wiki', fileToUpload.value)
    }

    const payload = {
      ...form,
      image_url: finalUrl,
      user_id: userStore.user.id
    }

    await saveEntry(payload)

    alert('🎉 发布成功！')
    router.push('/encyclopedia')
  } catch (e) {
    console.error(e)
    alert('发布失败: ' + e.message)
  } finally {
    uploading.value = false
  }
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
  applyTemplate(item)
  showImportModal.value = false
}

const loadItemAsTemplate = async (itemId) => {
  const { data: item } = await supabase.from('items').select('*').eq('id', itemId).single()
  if (item) applyTemplate(item)
}

const applyTemplate = (item) => {
  form.title = item.name
  form.category = '周边'
  form.image_url = item.image_url
  if (!form.tags.includes(item.name)) form.tags.push(item.name)
  if (item.character && !form.tags.includes(item.character)) form.tags.push(item.character)
  
  form.content = `## 📄 基本档案
- **官方分类**: ${item.category}
- **发售日期**: ${item.release_date || '未知'}
- **官方定价**: ¥${item.price || '??'}

## 📖 详细介绍
${item.name} 是官方推出的周边产品...`
}
</script>

<style scoped>
.edit-container { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: 'Segoe UI', sans-serif; background: #f9f9f9; min-height: 100vh; }
.back-btn { background: white; border: 1px solid #ddd; padding: 8px 20px; border-radius: 20px; cursor: pointer; color: #666; margin-bottom: 20px; font-weight: bold; }
.editor-box { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
.header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px; }
h2 { margin: 0; color: #333; font-size: 24px; }
.import-btn { background: #e3f2fd; color: #1565c0; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }

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

.upload-area { margin-top: 5px; }
.upload-placeholder { width: 100%; height: 120px; border: 2px dashed #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #999; background: #fafafa; }
.upload-placeholder:hover { border-color: #39C5BB; color: #39C5BB; background: #f0fcfb; }
.img-preview { position: relative; display: inline-block; }
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
.import-item:hover { background: #f0fcfb; }
.mini-thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; }
.info { flex: 1; overflow: hidden; }
.name { font-size: 13px; font-weight: bold; color: #333; }
.use-btn { background: #39C5BB; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.close-modal { width: 100%; padding: 10px; margin-top: 15px; background: #f5f5f5; border: none; border-radius: 6px; cursor: pointer; color: #666; }
.empty-mini { padding: 20px; text-align: center; color: #999; font-size: 13px; }
</style>