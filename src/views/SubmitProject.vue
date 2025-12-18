<template>
  <div class="submit-container">
    <div class="form-card">
      <div class="header">
        <h2>📢 发起新企划</h2>
        <p>召集伙伴，共同创作！</p>
      </div>

      <div class="form-body">
        <div class="form-group identity-section" v-if="myCircles.length > 0">
          <label>🚩 发布名义</label>
          <div class="identity-selector">
            <select v-model="form.identity" class="std-input highlight-select">
              <option value="individual">
                👤 个人名义 ({{ displayName }} - UID:{{ displayUID }})
              </option>
              <option v-for="c in myCircles" :key="c.id" :value="c.id">
                🏯 社团: {{ c.name }}
              </option>
            </select>
            <p class="hint" v-if="form.identity !== 'individual'">
              * 该企划将显示在 [{{ getCircleName(form.identity) }}] 的社团主页，且管理员可共同管理。
            </p>
          </div>
        </div>
        <div class="form-group identity-section" v-else>
           <label>🚩 发布身份</label>
           <div class="current-id-text">
             👤 个人发布 ({{ displayName }} <span class="uid-pill">UID:{{ displayUID }}</span>)
           </div>
        </div>

        <div class="form-group">
          <label>企划名称 *</label>
          <input v-model="form.name" placeholder="如: 2025初音未来生日贺图企划" class="std-input" />
        </div>

        <div class="row">
          <div class="col">
            <label>企划类型 *</label>
            <select v-model="form.project_type" class="std-input">
              <option disabled value="">请选择</option>
              <option>综合企划</option>
              <option>合唱/合奏</option>
              <option>画集/插画</option>
              <option>视频PV</option>
              <option>游戏制作</option>
              <option>线下活动</option>
            </select>
          </div>
          <div class="col">
            <label>招募状态</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="checkbox" v-model="form.allow_external"> 
                📢 公开招募 (允许在此平台申请加入)
              </label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>企划封面/海报 *</label>
          <div class="upload-area" @click="$refs.fileInput.click()">
            <img v-if="previewUrl" :src="previewUrl" class="preview-img" />
            <div v-else class="upload-placeholder">
              <span>🖼️ 点击上传封面</span>
              <span class="sub-text">建议尺寸 16:9</span>
            </div>
          </div>
          <input ref="fileInput" type="file" accept="image/*" @change="handleFileChange" style="display:none" />
        </div>

        <div class="row">
          <div class="col">
            <label>开始日期</label>
            <input type="date" v-model="form.start_date" class="std-input" />
          </div>
          <div class="col">
            <label>预计结束/截稿</label>
            <input type="date" v-model="form.end_date" class="std-input" />
          </div>
        </div>

        <div class="form-group">
          <label>企划详情介绍</label>
          <textarea v-model="form.description" rows="6" class="std-input" placeholder="请详细描述企划内容、招募要求、排期安排等..."></textarea>
        </div>

        <div class="actions">
          <button @click="$router.go(-1)" class="btn-cancel">取消</button>
          <button @click="handleSubmit" class="btn-submit" :disabled="loading">
            {{ loading ? '创建中...' : '🚀 立即发布' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { supabase } from '../services/supabase'
import { uploadImage } from '../services/storage'
import { submitProject } from '../services/submitData'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const file = ref(null)
const previewUrl = ref('')
const myCircles = ref([])

const form = reactive({
  identity: 'individual',
  name: '',
  project_type: '',
  start_date: '',
  end_date: '',
  description: '',
  allow_external: true
})

// 计算属性：优先显示 Profile 里的数据
const displayName = computed(() => userStore.profile?.username || userStore.user?.user_metadata?.username || '我')
const displayUID = computed(() => userStore.profile?.uid || 'Loading...')

onMounted(async () => {
  if (!userStore.user) {
    await userStore.initialize() // 确保 store 初始化
    if (!userStore.user) return router.push('/login')
  }
  
  await fetchMyCircles()
  
  if (route.query.circle_id) {
    const target = myCircles.value.find(c => c.id === route.query.circle_id)
    if (target) form.identity = target.id
  }
})

const fetchMyCircles = async () => {
  try {
    const userId = userStore.user?.id
    if (!userId) return

    const { data, error } = await supabase
      .from('circle_members')
      .select('circles(id, name)')
      .eq('user_id', userId)
    
    if (error) throw error
    if (data) {
      myCircles.value = data.map(item => item.circles).filter(Boolean)
    }
  } catch (e) {
    console.error('获取社团列表失败:', e)
  }
}

const getCircleName = (id) => {
  const c = myCircles.value.find(i => i.id === id)
  return c ? c.name : ''
}

const handleFileChange = (e) => {
  const f = e.target.files[0]
  if (f) {
    file.value = f
    previewUrl.value = URL.createObjectURL(f)
  }
}

const handleSubmit = async () => {
  if (!form.name || !form.project_type || !file.value) return alert('请填写必填项并上传封面')

  loading.value = true
  try {
    const imageUrl = await uploadImage('user_uploads', 'projects', file.value)
    const userId = userStore.user.id
    const payload = {
      name: form.name,
      project_type: form.project_type,
      start_date: form.start_date,
      end_date: form.end_date,
      description: form.description,
      allow_external: form.allow_external,
      image_url: imageUrl,
      uploader_id: userId,
      circle_id: form.identity === 'individual' ? null : form.identity
    }

    await submitProject(payload)
    alert('企划发布成功！')
    
    if (payload.circle_id) router.push('/circle')
    else router.push('/projects')
    
  } catch (e) {
    console.error(e)
    alert('发布失败: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.submit-container { padding: 40px 20px; background: #f0f9f9; min-height: 100vh; display: flex; justify-content: center; }
.form-card { background: white; width: 100%; max-width: 700px; border-radius: 12px; box-shadow: 0 4px 20px rgba(57, 197, 187, 0.1); overflow: hidden; }
.header { background: linear-gradient(135deg, #39C5BB, #2da8a0); padding: 30px; color: white; text-align: center; }
.header h2 { margin: 0 0 5px 0; }
.header p { margin: 0; opacity: 0.9; font-size: 14px; }

.form-body { padding: 30px; }
.form-group { margin-bottom: 25px; }
.row { display: flex; gap: 20px; margin-bottom: 25px; }
.col { flex: 1; }

label { display: block; font-weight: bold; font-size: 13px; color: #555; margin-bottom: 8px; }
.std-input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 14px; transition: 0.2s; }
.std-input:focus { outline: none; border-color: #39C5BB; box-shadow: 0 0 0 3px rgba(57, 197, 187, 0.1); }

/* 身份部分样式 */
.identity-section { background: #e0f7fa; padding: 15px; border-radius: 8px; border: 1px solid #b2ebf2; }
.highlight-select { background-color: white; border-color: #39C5BB; color: #00695c; font-weight: bold; }
.hint { font-size: 12px; color: #00796b; margin-top: 5px; }
.current-id-text { font-size: 14px; color: #333; font-weight: bold; display: flex; align-items: center; gap: 8px; }
.uid-pill { background: #39C5BB; color: white; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-family: monospace; }

.upload-area { width: 100%; height: 240px; border: 2px dashed #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fafafa; overflow: hidden; transition: 0.2s; }
.upload-area:hover { border-color: #39C5BB; background: #f0fcfb; }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; color: #999; }
.sub-text { font-size: 12px; margin-top: 5px; opacity: 0.7; }

.radio-group { padding-top: 10px; }
.radio-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #333; }

.actions { display: flex; gap: 15px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; }
button { flex: 1; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 16px; transition: 0.2s; }
.btn-submit { background: #39C5BB; color: white; }
.btn-submit:hover:not(:disabled) { background: #2da8a0; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
.btn-submit:disabled { background: #ccc; cursor: not-allowed; }
.btn-cancel { background: #f5f5f5; color: #666; }
.btn-cancel:hover { background: #eeeeee; }
</style>