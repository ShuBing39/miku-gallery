<template>
    <div class="page-wrapper">
      <button class="back-home-btn" @click="$router.push('/projects')">⬅ 返回企划大厅</button>
  
      <div class="submit-container">
        <div class="form-box">
          <div class="header-area">
            <h2 class="title">📢 发起同人企划</h2>
            <p class="subtitle">召集伙伴，共同创作，为爱发电</p>
          </div>
  
          <div class="form-content">
            
            <div class="form-group">
              <label>企划标题 *</label>
              <input v-model="form.name" placeholder="例如: 2025初音未来庆生贺图企划" />
            </div>
  
            <div class="row">
              <div class="form-group half">
                <label>开始日期</label>
                <input type="date" v-model="form.start_date" />
              </div>
              <div class="form-group half">
                <label>截止日期 (截稿/结束)</label>
                <input type="date" v-model="form.end_date" />
              </div>
            </div>
  
            <div class="form-group">
              <label>企划海报/头图 *</label>
              <div class="upload-area" @click="$refs.projectFile.click()">
                <img v-if="preview" :src="preview" class="preview-img" />
                <div v-else class="upload-placeholder"><span>📷 点击上传海报</span></div>
              </div>
              <input type="file" ref="projectFile" @change="handleFile" accept="image/*" style="display:none" />
            </div>
  
            <div class="settings-box">
              <div class="setting-row">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.is_private"> 
                  <span class="bold">🔒 设为私密企划</span>
                </label>
                <p class="hint" v-if="form.is_private">
                  开启后，企划不会在大厅公开显示。<br>发布成功后，请去【个人中心】生成邀请链接发给朋友。
                </p>
                <p class="hint" v-else>企划将公开展示在企划大厅，所有人可见。</p>
              </div>
  
              <div class="setting-row">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.is_ai"> 🤖 包含AI辅助创作
                </label>
              </div>
            </div>
  
            <div class="form-group">
              <label>详细规则描述</label>
              <textarea v-model="form.description" rows="6" placeholder="请详细描述企划内容、稿件尺寸要求、截稿时间、参与方式等..."></textarea>
            </div>
  
            <button class="submit-btn" @click="submit" :disabled="uploading">
              {{ uploading ? '正在创建...' : '🚀 确认发布企划' }}
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
    name: '', start_date: '', end_date: '', is_private: false, is_ai: false, description: ''
  })
  
  onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('请先登录')
      router.push('/login')
    } else {
      currentUser.value = user
    }
  })
  
  const handleFile = (e) => {
    const file = e.target.files[0]
    if (file) { fileToUpload.value = file; preview.value = URL.createObjectURL(file) }
  }
  
  const submit = async () => {
    if (!form.name || !fileToUpload.value) return alert('请填写标题并上传海报')
    uploading.value = true
  
    try {
      // 1. 上传图片
      const fileExt = fileToUpload.value.name.split('.').pop()
      const fileName = `projects/${Date.now()}.${fileExt}`
      const { error: upErr } = await supabase.storage.from('user_uploads').upload(fileName, fileToUpload.value)
      if (upErr) throw upErr
      const { data: imgData } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
  
      // 2. 写入数据库
      await supabase.from('items').insert([{
        name: form.name,
        category: '同人企划', // 固定分类
        is_fan_work: true,    // 固定为同人
        image_url: imgData.publicUrl,
        
        // 企划专属字段
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_private: form.is_private,
        description: form.description,
        is_ai: form.is_ai,
  
        // 系统字段
        author: currentUser.value.user_metadata?.username || '发起人',
        uploader_id: currentUser.value.id,
        status: 'pending', // 默认审核中
        release_date: new Date().toISOString()
      }])
  
      alert('企划发起成功！请等待审核。私密企划请去个人中心管理邀请。')
      router.push('/profile') // 跳转到个人中心查看
    } catch (e) {
      alert('发布失败: ' + e.message)
    }
    uploading.value = false
  }
  </script>
  
  <style scoped>
  /* 复用图2 (周边发布) 的优美样式 */
  .page-wrapper { background: #f0f9f9; min-height: 100vh; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; font-family: sans-serif; position: relative; }
  .back-home-btn { position: absolute; top: 20px; left: 20px; background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; color: #555; font-weight: bold; transition: 0.2s; }
  .back-home-btn:hover { background: #39C5BB; color: white; border-color: #39C5BB; }
  
  .submit-container { width: 100%; max-width: 700px; } /* 稍微宽一点适应日期 */
  .form-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
  
  .header-area { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
  .title { margin: 0; color: #333; font-size: 24px; }
  .subtitle { color: #888; font-size: 14px; margin-top: 5px; }
  
  .form-group { margin-bottom: 20px; }
  .form-group label { display: block; font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #555; }
  input, textarea { width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; box-sizing: border-box; font-size: 14px; transition: 0.2s; }
  input:focus, textarea:focus { border-color: #39C5BB; outline: none; }
  
  /* 日期行 */
  .row { display: flex; gap: 20px; }
  .half { flex: 1; }
  
  /* 图片上传区 */
  .upload-area { height: 200px; border: 2px dashed #ccc; border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer; background: #fafafa; overflow: hidden; transition: 0.2s; }
  .upload-area:hover { border-color: #39C5BB; background: #e0f2f1; }
  .preview-img { width: 100%; height: 100%; object-fit: contain; }
  .upload-placeholder { color: #999; font-weight: bold; font-size: 14px; }
  
  /* 设置盒子 (私密/AI) */
  .settings-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #eee; }
  .setting-row { margin-bottom: 10px; }
  .setting-row:last-child { margin-bottom: 0; }
  .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #333; }
  .checkbox-label input { width: auto; transform: scale(1.2); }
  .bold { font-weight: bold; }
  .hint { font-size: 12px; color: #888; margin-top: 5px; margin-left: 24px; line-height: 1.4; }
  
  .submit-btn { width: 100%; background: #39C5BB; color: white; padding: 15px; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 10px; transition: 0.2s; }
  .submit-btn:hover { background: #26a69a; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  </style>