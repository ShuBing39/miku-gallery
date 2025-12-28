<template>
  <div class="submit-project-container">
    <div class="header">
      <button class="back-btn" @click="$router.go(-1)">⬅ 返回</button>
      <h2>📢 发布新同人企划</h2>
    </div>

    <div class="form-card">
      <div v-if="uploading" class="loading-overlay">
        <div class="spinner"></div>
        <p>正在创建企划...</p>
      </div>

      <div class="form-group">
        <label>企划名称 <span class="req">*</span></label>
        <input v-model="form.name" type="text" placeholder="例如：初音未来2024生贺曲《Future》" class="std-input">
      </div>

      <div class="form-group">
        <label>企划类型</label>
        <div class="type-options">
          <span v-for="t in types" :key="t" 
            class="type-chip" 
            :class="{ active: form.project_type === t }"
            @click="form.project_type = t">
            {{ t }}
          </span>
        </div>
      </div>

      <div class="form-group">
        <label>封面/宣传图 (建议16:9)</label>
        <div class="upload-box" @click="$refs.fileInput.click()">
          <img v-if="preview" :src="preview" class="preview-img">
          <div v-else class="placeholder">
            <span>📷 点击上传封面</span>
          </div>
          <input ref="fileInput" type="file" @change="handleFile" style="display:none" accept="image/*">
        </div>
      </div>

      <div class="form-group">
        <label>简介与招募要求 <span class="req">*</span></label>
        <textarea v-model="form.description" rows="6" placeholder="介绍一下你的企划，以及需要招募的伙伴..." class="std-input area"></textarea>
      </div>

      <div class="form-group">
        <label>招募设置</label>
        <div class="switch-row">
          <span>是否公开招募成员?</span>
          <label class="switch">
            <input type="checkbox" v-model="form.allow_external">
            <span class="slider round"></span>
          </label>
          <span class="status-text">{{ form.allow_external ? '✅ 公开招募' : '🔒 仅限邀请' }}</span>
        </div>
      </div>

      <div class="actions">
        <button class="submit-btn" @click="handleSubmit">🚀 立即发布</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import { uploadImage } from '../../services/storage'
import { submitProject } from '../../services/submitData'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const uploading = ref(false)

const types = ['原创曲', '合唱', '手书/PV', '图文/插画', '游戏', '线下活动', '其他']
const fileInput = ref(null)
const preview = ref(null)
const coverFile = ref(null)

const form = reactive({
  name: '',
  project_type: '原创曲',
  description: '',
  allow_external: true
})

onMounted(async () => {
  if (!userStore.user) await userStore.initialize()
})

const handleFile = (e) => {
  const file = e.target.files[0]
  if (file) {
    coverFile.value = file
    preview.value = URL.createObjectURL(file)
  }
}

const handleSubmit = async () => {
  if (!userStore.user) return alert('请先登录')
  if (!form.name || !form.description) return alert('请完善企划信息')

  uploading.value = true
  try {
    let coverUrl = null
    if (coverFile.value) {
      coverUrl = await uploadImage('user_uploads', 'projects', coverFile.value)
    }

    const payload = {
      ...form,
      image_url: coverUrl,
      // ✅ [统一修改] 统一字段名为 user_id
      user_id: userStore.user.id,
      circle_id: route.query.circle_id || null
    }

    await submitProject(payload)
    
    alert('企划发布成功！')
    router.push('/projects')
  } catch (e) {
    console.error(e)
    alert('发布失败: ' + e.message)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.submit-project-container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.header { display: flex; align-items: center; margin-bottom: 20px; gap: 15px; }
.back-btn { border: none; background: #f0f0f0; padding: 5px 12px; border-radius: 4px; cursor: pointer; color: #666; }
.header h2 { margin: 0; color: #333; }

.form-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); position: relative; }
.loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); z-index: 10; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.spinner { width: 30px; height: 30px; border: 3px solid #eee; border-top-color: #39C5BB; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; color: #555; }
.req { color: #ff6b6b; }
.std-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 14px; transition: 0.2s; }
.std-input:focus { border-color: #39C5BB; outline: none; }
.area { resize: vertical; }

.type-options { display: flex; flex-wrap: wrap; gap: 8px; }
.type-chip { padding: 6px 12px; background: #f5f5f5; border-radius: 20px; font-size: 13px; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
.type-chip.active { background: #e0f2f1; color: #00695c; border-color: #39C5BB; font-weight: bold; }

.upload-box { width: 100%; height: 180px; border: 2px dashed #ddd; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fafafa; }
.upload-box:hover { border-color: #39C5BB; background: #f0fcfb; }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.placeholder { color: #999; display: flex; align-items: center; gap: 5px; }

.switch-row { display: flex; align-items: center; gap: 10px; }
.switch { position: relative; display: inline-block; width: 40px; height: 22px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 22px; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: #39C5BB; }
input:checked + .slider:before { transform: translateX(18px); }
.status-text { font-size: 13px; color: #666; font-weight: bold; }

.actions { margin-top: 30px; }
.submit-btn { width: 100%; padding: 12px; background: #39C5BB; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); transition: 0.2s; }
.submit-btn:hover { background: #2da8a0; transform: translateY(-2px); }
</style>