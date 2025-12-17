<template>
  <div class="page-wrapper">
    <button class="back-home-btn" @click="$router.push('/')">⬅ 返回首页</button>

    <div class="submit-container">
      <div class="form-box">
        <div class="header-area">
          <h2 class="title">✨ 周边投稿 / 维基收录</h2>
          <p class="subtitle">分享你的收藏、谷子或二创作品到葱葱维基</p>
        </div>

        <div class="form-content">
          <div class="form-group">
            <label>周边名称 *</label>
            <input v-model="form.name" placeholder="例如: 2025雪未来吧唧" />
          </div>

          <div class="form-group">
            <label>分类</label>
            <select v-model="form.category">
              <option>手办模型</option>
              <option>徽章/吧唧</option>
              <option>插画/壁纸</option>
              <option>小谷子/立牌</option>
              <option>痛车/痛衣</option>
              <option>音乐/CD</option>
            </select>
          </div>

          <div class="form-group">
            <label>图片 *</label>
            <div class="upload-area" @click="$refs.singleFile.click()">
              <img v-if="preview" :src="preview" class="preview-img" />
              <div v-else class="upload-placeholder"><span>📷 点击上传图片</span></div>
            </div>
            <input type="file" ref="singleFile" @change="handleFile" accept="image/*" style="display:none" />
          </div>

          <div class="form-group checkbox-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.is_ai"> 🤖 包含AI辅助创作
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.is_fan_work"> 🎨 是同人作品 (非官方)
            </label>
          </div>

          <div class="form-group">
            <label>详细描述</label>
            <textarea v-model="form.description" rows="3" placeholder="描述一下这个周边的细节..."></textarea>
          </div>

          <button class="submit-btn" @click="submit" :disabled="uploading">
            {{ uploading ? '上传中...' : '🚀 提交收录' }}
          </button>
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
const currentUser = ref(null)
const uploading = ref(false)
const preview = ref(null)
const fileToUpload = ref(null)

const form = reactive({
  name: '', category: '手办模型', is_ai: false, is_fan_work: true, description: ''
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) router.push('/login')
  else currentUser.value = user
})

const handleFile = (e) => {
  const file = e.target.files[0]
  if (file) { fileToUpload.value = file; preview.value = URL.createObjectURL(file) }
}

const submit = async () => {
  if (!form.name || !fileToUpload.value) return alert('请填写标题并上传图片')
  uploading.value = true

  try {
    const fileExt = fileToUpload.value.name.split('.').pop()
    const fileName = `goods/${Date.now()}.${fileExt}`
    const { error: upErr } = await supabase.storage.from('user_uploads').upload(fileName, fileToUpload.value)
    if (upErr) throw upErr
    const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
    
    await supabase.from('items').insert([{
      name: form.name,
      image_url: data.publicUrl,
      category: form.category,
      is_fan_work: form.is_fan_work,
      is_ai: form.is_ai,
      description: form.description,
      author: currentUser.value.user_metadata?.username || '用户',
      uploader_id: currentUser.value.id,
      status: 'pending',
      release_date: new Date().toISOString()
    }])

    alert('投稿成功！感谢你的贡献。')
    router.push('/profile')
  } catch (e) {
    alert('失败: ' + e.message)
  }
  uploading.value = false
}
</script>

<style scoped>
.page-wrapper { background: #f0f9f9; min-height: 100vh; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; position: relative; font-family: sans-serif; }
.back-home-btn { position: absolute; top: 20px; left: 20px; background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; color: #555; font-weight: bold; }
.submit-container { width: 100%; max-width: 600px; }
.form-box { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.header-area { text-align: center; margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.title { margin: 0; color: #333; font-size: 22px; }
.subtitle { color: #888; font-size: 13px; margin-top: 5px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #555; }
input, select, textarea { width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; box-sizing: border-box; font-size: 14px; }
input:focus, select:focus, textarea:focus { border-color: #39C5BB; outline: none; }
.upload-area { height: 180px; border: 2px dashed #ccc; border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer; background: #fafafa; overflow: hidden; transition: 0.2s; }
.upload-area:hover { border-color: #39C5BB; background: #e0f2f1; }
.preview-img { width: 100%; height: 100%; object-fit: contain; }
.checkbox-row { display: flex; gap: 20px; }
.checkbox-label { display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: normal !important; }
.submit-btn { width: 100%; background: #39C5BB; color: white; padding: 14px; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.submit-btn:hover { background: #26a69a; }
.submit-btn:disabled { opacity: 0.6; }
</style>