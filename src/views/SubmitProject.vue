<template>
  <div class="page-wrapper">
    <button class="back-home-btn" @click="goBack">⬅ 返回</button>

    <div class="submit-container">
      <div class="form-box">
        <div class="header-area">
          <h2 class="title">📢 发起同人企划</h2>
          <p class="subtitle">召集伙伴，共同创作，为爱发电</p>
        </div>

        <div class="form-content">
          <div class="identity-section">
            <label class="section-label">请选择发布名义：</label>
            <div class="identity-options">
              <div class="id-card" :class="{ active: publishAs === 'personal' }" @click="publishAs = 'personal'">
                <span class="icon">👤</span>
                <span class="text">个人名义</span>
                <span class="check">✔</span>
              </div>
              <div v-if="myCircleInfo" class="id-card" :class="{ active: publishAs === 'circle' }" @click="publishAs = 'circle'">
                <span class="icon">🏰</span>
                <div class="text-group">
                  <span class="text">社团名义</span>
                  <span class="sub-text">{{ myCircleInfo.name }}</span>
                </div>
                <span class="check">✔</span>
              </div>
            </div>
            <p class="hint-text" v-if="publishAs === 'circle'">* 此企划将归属于社团管理，并显示在社团主页。</p>
            <p class="hint-text" v-else>* 此企划将归属于您个人。</p>
          </div>

          <div class="divider"></div>

          <div class="form-group">
            <label>企划标题 *</label>
            <input v-model="form.name" placeholder="例如: 2025初音未来庆生贺图企划" />
          </div>

          <div class="form-group">
            <label>企划类型</label>
            <select v-model="form.project_type" class="select-std">
              <option>综合</option><option>音乐</option><option>绘画/插图</option>
              <option>PV/视频</option><option>手书/漫画</option><option>周边制作</option>
              <option>线下活动</option><option>游戏制作</option><option>众筹</option>
            </select>
          </div>

          <div class="row">
            <div class="form-group half"><label>开始日期</label><input type="date" v-model="form.start_date" /></div>
            <div class="form-group half"><label>截止日期</label><input type="date" v-model="form.end_date" /></div>
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
                <span class="bold">🌏 公开招募 (发布到企划大厅)</span>
              </label>
            </div>
            <div class="setting-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.is_ai"> 🤖 包含AI辅助创作
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>详细规则描述</label>
            <textarea v-model="form.description" rows="6" placeholder="请详细描述企划内容..."></textarea>
          </div>

          <button class="submit-btn" @click="submit" :disabled="uploading">
            {{ uploading ? '正在创建...' : '🚀 确认发布' }}
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
const publishAs = ref('personal')
const myCircleInfo = ref(null)

const form = reactive({
  name: '', start_date: '', end_date: '', 
  allow_external: true, is_ai: false, description: '', project_type: '综合'
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { alert('请先登录'); router.push('/login'); return }
  currentUser.value = user
  
  // 检查是否有社团权限
  const { data: member } = await supabase.from('circle_members')
    .select('circle_id, role').eq('user_id', user.id)
    .in('role', ['团长', '主催', '管理员']).maybeSingle()
  
  if (member) {
    const { data: circle } = await supabase.from('circles').select('id, name').eq('id', member.circle_id).single()
    if (circle) myCircleInfo.value = circle
  }
})

const handleFile = (e) => {
  const file = e.target.files[0]
  if (file) { fileToUpload.value = file; preview.value = URL.createObjectURL(file) }
}
const goBack = () => router.push('/projects')

const submit = async () => {
  if (!form.name) return alert('请填写标题')
  uploading.value = true

  try {
    let imageUrl = 'https://placehold.co/600x400?text=Project'
    if (fileToUpload.value) {
      const fileExt = fileToUpload.value.name.split('.').pop()
      const fileName = `projects/${Date.now()}.${fileExt}`
      const { error: upErr } = await supabase.storage.from('user_uploads').upload(fileName, fileToUpload.value)
      if (!upErr) {
        const { data: imgData } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
        imageUrl = imgData.publicUrl
      }
    }

    let finalDesc = form.description
    if (form.is_ai) finalDesc = `[包含AI辅助创作] \n${finalDesc}`
    const finalCircleId = (publishAs.value === 'circle' && myCircleInfo.value) ? myCircleInfo.value.id : null

    // 1. 创建企划
    const { data: projectData, error: projError } = await supabase.from('projects').insert([{
      name: form.name, description: finalDesc, image_url: imageUrl, category: '同人企划',
      project_type: form.project_type, uploader_id: currentUser.value.id, circle_id: finalCircleId,
      start_date: form.start_date || null, end_date: form.end_date || null, recruit_status: 'recruiting',
      allow_external: form.allow_external
    }]).select().single()

    if (projError) throw projError

    // 2. 自动加入成员 (现在数据库有了 is_approved 字段，这段代码可以正常运行了)
    const { error: memError } = await supabase.from('project_members').insert({
      project_id: projectData.id,
      user_id: currentUser.value.id,
      role: '主催',
      is_approved: true
    })
    
    if (memError) console.error('自动加入失败:', memError)

    alert('发布成功！')
    if (finalCircleId) router.push('/circle')
    else router.push(`/project/${projectData.id}`)

  } catch (e) {
    alert('发布失败: ' + e.message)
  }
  uploading.value = false
}
</script>

<style scoped>
.page-wrapper { background: #f0f9f9; min-height: 100vh; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; font-family: sans-serif; position: relative; }
.back-home-btn { position: absolute; top: 20px; left: 20px; background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; color: #555; font-weight: bold; transition: 0.2s; }
.back-home-btn:hover { background: #39C5BB; color: white; border-color: #39C5BB; }
.submit-container { width: 100%; max-width: 700px; }
.form-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.header-area { text-align: center; margin-bottom: 20px; }
.title { margin: 0; color: #333; font-size: 24px; }
.subtitle { color: #888; font-size: 14px; margin-top: 5px; }
.identity-section { background: #f8fbfa; padding: 15px; border-radius: 8px; border: 1px solid #e0f2f1; margin-bottom: 25px; }
.section-label { font-size: 14px; font-weight: bold; color: #555; display: block; margin-bottom: 10px; }
.identity-options { display: flex; gap: 15px; }
.id-card { flex: 1; border: 2px solid #ddd; border-radius: 8px; padding: 10px; cursor: pointer; display: flex; align-items: center; gap: 10px; background: white; transition: 0.2s; position: relative; overflow: hidden; }
.id-card:hover { border-color: #39C5BB; }
.id-card.active { border-color: #39C5BB; background: #e0f2f1; color: #00695c; }
.icon { font-size: 20px; }
.text-group { display: flex; flex-direction: column; }
.sub-text { font-size: 11px; color: #888; }
.check { margin-left: auto; color: #39C5BB; opacity: 0; font-weight: bold; }
.id-card.active .check { opacity: 1; }
.hint-text { font-size: 12px; color: #999; margin-top: 8px; }
.divider { height: 1px; background: #eee; margin-bottom: 25px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #555; }
input, textarea, .select-std { width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px; box-sizing: border-box; font-size: 14px; transition: 0.2s; }
input:focus, textarea:focus, .select-std:focus { border-color: #39C5BB; outline: none; }
.row { display: flex; gap: 20px; } .half { flex: 1; }
.upload-area { height: 200px; border: 2px dashed #ccc; border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer; background: #fafafa; overflow: hidden; transition: 0.2s; }
.upload-area:hover { border-color: #39C5BB; background: #e0f2f1; }
.preview-img { width: 100%; height: 100%; object-fit: contain; }
.upload-placeholder { color: #999; font-weight: bold; font-size: 14px; }
.settings-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #eee; }
.setting-row { margin-bottom: 10px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #333; }
.checkbox-label input { width: auto; transform: scale(1.2); }
.bold { font-weight: bold; }
.submit-btn { width: 100%; background: #39C5BB; color: white; padding: 15px; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.submit-btn:hover { background: #26a69a; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>