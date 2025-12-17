<template>
  <div class="page-wrapper">
    <button class="back-home-btn" @click="$router.push('/projects')">⬅ 返回企划大厅</button>

    <div class="submit-container">
      <div class="form-box">
        <div class="header-area">
          <h2 class="title">📢 发起同人企划</h2>
          <p class="subtitle">召集伙伴，共同创作，为爱发电（个人/社团均可发布）</p>
        </div>

        <div class="form-content">
          
          <div class="form-group">
            <label>企划标题 *</label>
            <input v-model="form.name" placeholder="例如: 2025初音未来庆生贺图企划" />
          </div>

          <div class="form-group">
            <label>企划类型</label>
            <select v-model="form.project_type" class="select-std">
              <option>综合</option>
              <option>音乐</option>
              <option>绘画/插图</option>
              <option>PV/视频</option>
              <option>手书/漫画</option>
              <option>周边制作</option>
              <option>线下活动</option>
              <option>游戏制作</option>
              <option>众筹</option>
            </select>
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
            <label>企划海报/头图</label>
            <div class="upload-area" @click="$refs.projectFile.click()">
              <img v-if="preview" :src="preview" class="preview-img" />
              <div v-else class="upload-placeholder"><span>📷 点击上传海报</span></div>
            </div>
            <input type="file" ref="projectFile" @change="handleFile" accept="image/*" style="display:none" />
          </div>

          <div class="settings-box">
            <div class="setting-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.allow_external"> 
                <span class="bold">🌏 公开招募</span>
              </label>
              <p class="hint" v-if="form.allow_external">
                企划将公开展示在企划大厅，所有人可见并可申请加入。
              </p>
              <p class="hint" v-else>
                仅限邀请或内部可见（私密企划）。
              </p>
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
const myCircleId = ref(null)

const form = reactive({
  name: '', 
  start_date: '', 
  end_date: '', 
  allow_external: true, // 对应原来的 is_private (逻辑相反)
  is_ai: false, 
  description: '',
  project_type: '综合'
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    alert('请先登录')
    router.push('/login')
  } else {
    currentUser.value = user
    // 尝试获取社团ID，但不是必须的
    checkUserCircle() 
  }
})

const checkUserCircle = async () => {
  const { data } = await supabase.from('circle_members')
    .select('circle_id')
    .eq('user_id', currentUser.value.id)
    .maybeSingle()
  if (data) myCircleId.value = data.circle_id
}

const handleFile = (e) => {
  const file = e.target.files[0]
  if (file) { fileToUpload.value = file; preview.value = URL.createObjectURL(file) }
}

const submit = async () => {
  if (!form.name) return alert('请填写标题')
  uploading.value = true

  try {
    let imageUrl = 'https://placehold.co/600x400?text=Project' // 默认图

    // 1. 上传图片 (如果有)
    if (fileToUpload.value) {
      const fileExt = fileToUpload.value.name.split('.').pop()
      const fileName = `projects/${Date.now()}.${fileExt}`
      const { error: upErr } = await supabase.storage.from('user_uploads').upload(fileName, fileToUpload.value)
      if (upErr) throw upErr
      const { data: imgData } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
      imageUrl = imgData.publicUrl
    }

    // 处理描述 (把AI标签加进去，因为新表没这个字段)
    let finalDesc = form.description
    if (form.is_ai) {
      finalDesc = `[包含AI辅助创作] \n${finalDesc}`
    }

    // 2. 写入新数据库 (projects 表)
    const { data, error } = await supabase.from('projects').insert([{
      name: form.name,
      description: finalDesc,
      image_url: imageUrl,
      category: '同人企划',
      project_type: form.project_type,
      
      // 关键：写入当前用户ID
      uploader_id: currentUser.value.id,
      // 关键：如果有社团就带上，没有就是 NULL (个人企划)
      circle_id: myCircleId.value || null,
      
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      
      recruit_status: 'recruiting', // 默认招募中
      allow_external: form.allow_external // 公开/私密
    }])
    .select()
    .single()

    if (error) throw error

    alert('企划发起成功！')
    // 跳转到新企划的详情页 (注意：这里用 data.id 获取新生成的ID)
    router.push(`/project/${data.id}`)

  } catch (e) {
    alert('发布失败: ' + e.message)
    console.error(e)
  }
  uploading.value = false
}
</script>

<style scoped>
/* 保持原有样式不变，只增加了 select-std 样式 */
.page-wrapper { background: #f0f9f9; min-height: 100vh; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; font-family: sans-serif; position: relative; }
.back-home-btn { position: absolute; top: 20px; left: 20px; background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; color: #555; font-weight: bold; transition: 0.2s; }
.back-home-btn:hover { background: #39C5BB; color: white; border-color: #39C5BB; }

.submit-container { width: 100%; max-width: 700px; }
.form-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }

.header-area { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
.title { margin: 0; color: #333; font-size: 24px; }
.subtitle { color: #888; font-size: 14px; margin-top: 5px; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #555; }
input, textarea, .select-std { width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; box-sizing: border-box; font-size: 14px; transition: 0.2s; }
input:focus, textarea:focus, .select-std:focus { border-color: #39C5BB; outline: none; }

.row { display: flex; gap: 20px; }
.half { flex: 1; }

.upload-area { height: 200px; border: 2px dashed #ccc; border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer; background: #fafafa; overflow: hidden; transition: 0.2s; }
.upload-area:hover { border-color: #39C5BB; background: #e0f2f1; }
.preview-img { width: 100%; height: 100%; object-fit: contain; }
.upload-placeholder { color: #999; font-weight: bold; font-size: 14px; }

.settings-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #eee; }
.setting-row { margin-bottom: 10px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #333; }
.checkbox-label input { width: auto; transform: scale(1.2); }
.bold { font-weight: bold; }
.hint { font-size: 12px; color: #888; margin-top: 5px; margin-left: 24px; line-height: 1.4; }

.submit-btn { width: 100%; background: #39C5BB; color: white; padding: 15px; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.submit-btn:hover { background: #26a69a; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>