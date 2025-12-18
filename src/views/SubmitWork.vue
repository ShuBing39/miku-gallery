<template>
  <div class="submit-container">
    <div class="form-card">
      <div class="header">
        <h2>📤 投稿新周边/作品</h2>
        <p>让更多人看到你的收藏或创作！</p>
      </div>

      <div class="form-body">
        <div class="form-group">
          <label>作品名称 *</label>
          <input v-model="form.name" placeholder="如: 魔法未来2024荧光棒" class="std-input" />
        </div>

        <div class="row">
          <div class="col">
            <label>分类 *</label>
            <select v-model="form.category" class="std-input">
              <option disabled value="">请选择</option>
              <option>手办模型</option>
              <option>毛绒玩偶</option>
              <option>服饰穿搭</option>
              <option>徽章/吧唧</option>
              <option>生活用品</option>
              <option>同人志</option>
              <option>插画/挂画</option>
            </select>
          </div>
          <div class="col">
            <label>对应角色</label>
            <input v-model="form.character" placeholder="如: 初音未来" class="std-input" />
          </div>
        </div>

        <div class="form-group">
          <label>展示图片 *</label>
          <div class="upload-area" @click="$refs.fileInput.click()">
            <img v-if="previewUrl" :src="previewUrl" class="preview-img" />
            <div v-else class="upload-placeholder">
              <span>📷 点击上传图片</span>
            </div>
          </div>
          <input ref="fileInput" type="file" accept="image/*" @change="handleFileChange" style="display:none" />
        </div>

        <div class="row">
          <div class="col">
            <label>发售/发布日期</label>
            <input type="date" v-model="form.release_date" class="std-input" />
          </div>
          <div class="col">
            <label>价格 (CNY)</label>
            <input type="number" v-model="form.price" placeholder="0" class="std-input" />
          </div>
        </div>

        <div class="form-group">
          <label>制作方/作者</label>
          <input v-model="form.author" placeholder="官方品牌或社团名" class="std-input" />
        </div>

        <div class="form-group checkbox-row">
          <label>
            <input type="checkbox" v-model="form.is_fan_work" />
            这是同人作品
          </label>
        </div>

        <div class="form-group">
          <label>详细介绍</label>
          <textarea v-model="form.description" rows="5" class="std-input" placeholder="写点什么介绍一下..."></textarea>
        </div>

        <div class="actions">
          <button @click="$router.go(-1)" class="btn-cancel">取消</button>
          <button @click="handleSubmit" class="btn-submit" :disabled="loading">
            {{ loading ? '上传中...' : '提交审核' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { uploadImage } from '../services/storage'
import { submitWork } from '../services/submitData'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const file = ref(null)
const previewUrl = ref('')
const fileInput = ref(null)

const form = reactive({
  name: '',
  category: '',
  character: '初音未来',
  release_date: '',
  price: '',
  author: '',
  is_fan_work: false,
  description: ''
})

const handleFileChange = (e) => {
  const f = e.target.files[0]
  if (f) {
    file.value = f
    previewUrl.value = URL.createObjectURL(f)
  }
}

const handleSubmit = async () => {
  if (!userStore.user) return alert('请先登录')
  if (!form.name || !form.category || !file.value) return alert('请填写必填项并上传图片')

  loading.value = true
  try {
    // 1. 上传图片
    const imageUrl = await uploadImage('user_uploads', 'items', file.value)

    // 2. 提交数据
    await submitWork({
      ...form,
      image_url: imageUrl,
      user_id: userStore.user.id
    })

    alert('投稿成功！请等待管理员审核。')
    router.push('/dashboard')
  } catch (e) {
    console.error(e)
    alert('提交失败: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.submit-container { padding: 40px 20px; background: #f0f9f9; min-height: 100vh; display: flex; justify-content: center; }
.form-card { background: white; width: 100%; max-width: 600px; border-radius: 12px; box-shadow: 0 4px 20px rgba(57, 197, 187, 0.1); overflow: hidden; }
.header { background: #39C5BB; padding: 25px; color: white; text-align: center; }
.header h2 { margin: 0; }
.header p { margin: 5px 0 0; opacity: 0.9; font-size: 14px; }

.form-body { padding: 30px; }
.form-group { margin-bottom: 20px; }
.row { display: flex; gap: 20px; margin-bottom: 20px; }
.col { flex: 1; }

label { display: block; font-weight: bold; font-size: 13px; color: #555; margin-bottom: 8px; }
.std-input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 14px; }
.std-input:focus { outline: none; border-color: #39C5BB; }

.upload-area { width: 100%; height: 200px; border: 2px dashed #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fafafa; overflow: hidden; transition: 0.2s; }
.upload-area:hover { border-color: #39C5BB; background: #f0fcfb; }
.preview-img { width: 100%; height: 100%; object-fit: contain; }
.upload-placeholder { color: #999; font-size: 14px; }

.checkbox-row label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal; }

.actions { display: flex; gap: 15px; margin-top: 30px; }
button { flex: 1; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 16px; }
.btn-submit { background: #39C5BB; color: white; }
.btn-submit:disabled { background: #ccc; cursor: not-allowed; }
.btn-cancel { background: #eee; color: #666; }
</style>