<template>
  <div class="submit-container skin-theme">
    <div class="notebook-paper">
      <h2 class="page-title">📝 情报/作品投递箱</h2>
      <p class="page-desc">
        不论是官方新情报，还是您创作/发现的同人作品，都欢迎投递！<br />
        <span style="font-size:0.9em; color:#666;">(审核通过后将展示在Wiki或活动列表中)</span>
      </p>

      <div class="tabs-nav">
        <button :class="{ active: activeTab === 'dojin_quick' }" @click="activeTab = 'dojin_quick'" class="dojin-tab">🎁 同人/无料一键投递</button>
        <button :class="{ active: activeTab === 'work' }" @click="activeTab = 'work'">🎨 同人创作</button>
        <button :class="{ active: activeTab === 'product' }" @click="activeTab = 'product'">🛍️ 官方制品情报</button>
      </div>

      <div class="form-content-box">
        <div v-if="isSubmitting" class="loading-overlay">
          <div class="spinner"></div>
          <p>正在快马加鞭投递中...🐎</p>
        </div>

        <form v-show="activeTab === 'dojin_quick'" @submit.prevent="handleSubmitDojinQuick" class="quick-form">
          <p class="hint-text" style="background:#e8f5e9; border-color:#c8e6c9; color:#2e7d32;">
            🎁 专为展会/活动现场设计！拍照 -> 选活动 -> 提交，立刻分享您收集到的宝藏无料或同人周边！
          </p>
          
          <div class="form-group highlight-group">
            <label class="big-label">📸 拍个照吧！<span class="required">*</span></label>
            <div class="file-upload-box big-upload" @click="$refs.dojinQuickFile.click()" :class="{ 'has-img': dojinQuickPreview }">
              <span v-if="!dojinQuickPreview" class="upload-placeholder">
                <span style="font-size: 3em;">📷</span><br />
                点击调起摄像头或相册
              </span>
              <img v-else :src="dojinQuickPreview" class="preview-img cover-fit" />
              <input type="file" ref="dojinQuickFile" @change="(e) => handleFileChange(e, 'dojin_quick')" style="display:none" accept="image/*" required />
            </div>
          </div>

          <div class="form-group highlight-group">
            <label class="big-label">📅 来自哪场活动？<span class="required">*</span></label>
            <select v-model="dojinQuickForm.event_id" required class="big-select">
              <option value="" disabled selected>请选择 (系统已自动推荐近期活动)</option>
              
              <optgroup v-if="sortedEvents.hot.length" label="🔥 正在进行 / 刚刚结束 (推荐)">
                <option v-for="ev in sortedEvents.hot" :key="ev.id" :value="ev.id">
                  {{ ev.localized_title || ev.name }} 
                </option>
              </optgroup>

              <optgroup v-if="sortedEvents.upcoming.length" label="📅 即将开始">
                <option v-for="ev in sortedEvents.upcoming" :key="ev.id" :value="ev.id">
                  {{ ev.localized_title || ev.name }}
                </option>
              </optgroup>

              <optgroup v-if="sortedEvents.past.length" label="🕒 往期活动">
                <option v-for="ev in sortedEvents.past" :key="ev.id" :value="ev.id">
                  {{ ev.localized_title || ev.name }}
                </option>
              </optgroup>

              <option value="unknown">❓ 忘记了 / 待认领活动</option>
            </select>
            <p class="hint-mini">列表中显示的是简称，方便查找。如果没有找到，请选“待认领”哦~</p>
          </div>

          <div class="form-group">
            <label>🖌️ 画师/社团/制作人 (选填)</label>
            <input v-model="dojinQuickForm.creator_name" type="text" placeholder="如果不记得也没关系~" />
          </div>
          
          <div class="form-group">
             <label>简单描述 (选填)</label>
             <input v-model="dojinQuickForm.name" type="text" placeholder="例如：很可爱的Miku吧唧 (不填则默认显示为'同人周边')" />
          </div>

          <button type="submit" class="submit-btn dojin-btn">🎁 咻！一键投递</button>
        </form>

        <form v-show="activeTab === 'work'" @submit.prevent="handleSubmitWork">
          <div class="form-group">
            <label>作品标题 <span class="required">*</span></label>
            <input v-model="workForm.title" type="text" placeholder="例如：【初音未来】Miku的一天" required />
          </div>
          <div class="form-group">
             <label>作品类型</label>
             <select v-model="workForm.type">
               <option value="illustration">插画/漫画</option>
               <option value="music">原创音乐/翻调</option>
               <option value="video">视频/PV</option>
               <option value="cosplay">Cosplay</option>
               <option value="other">其他</option>
             </select>
          </div>
           <div class="form-group">
            <label>作品链接 (来源于B站/P站等) <span class="required">*</span></label>
            <input v-model="workForm.link_url" type="url" placeholder="https://..." required />
          </div>
          <div class="form-group">
            <label>封面图/预览图 (选填，但强烈建议)</label>
            <div class="file-upload-box" @click="$refs.workFile.click()">
              <span v-if="!workPreview">点击选择图片 (支持拖拽)</span>
              <img v-else :src="workPreview" class="preview-img" />
              <input type="file" ref="workFile" @change="(e) => handleFileChange(e, 'work')" style="display:none" accept="image/*" />
            </div>
          </div>
           <div class="form-group">
            <label>创作者/社团名 (选填)</label>
             <input v-model="workForm.creator_name" type="text" placeholder="请填写您或原作者的圈名" />
          </div>
          <div class="form-group">
            <label>想说的话/简介 (选填)</label>
            <textarea v-model="workForm.description" rows="3" placeholder="介绍一下这个作品吧~"></textarea>
          </div>
          <button type="submit" class="submit-btn theme-btn">🚀 投递作品</button>
        </form>

        <form v-show="activeTab === 'product'" @submit.prevent="handleSubmitProduct">
          <p class="hint-text">💡 这里的“制品”指手办、CD、官方周边等实体商品。</p>
          <div class="form-group">
            <label>制品名称 <span class="required">*</span></label>
            <input v-model="productForm.name" type="text" placeholder="例如：初音未来 V4X 1/7 手办" required />
          </div>
          <div class="form-group">
            <label>官方/通贩链接 <span class="required">*</span></label>
            <input v-model="productForm.link_url" type="url" placeholder="https://..." required />
          </div>
           <div class="form-group">
            <label>制品官方图 (选填)</label>
            <div class="file-upload-box" @click="$refs.productFile.click()">
              <span v-if="!productPreview">点击选择图片</span>
              <img v-else :src="productPreview" class="preview-img" />
              <input type="file" ref="productFile" @change="(e) => handleFileChange(e, 'product')" style="display:none" accept="image/*" />
            </div>
          </div>
          <div class="form-group">
            <label>分类 (选填)</label>
             <select v-model="productForm.category">
               <option value="">请选择(可选)</option>
               <option value="手办/模型">手办/模型</option>
               <option value="CD/专辑">CD/专辑</option>
               <option value="服饰/挂件">服饰/挂件</option>
               <option value="其他周边">其他周边</option>
             </select>
          </div>
          <button type="submit" class="submit-btn theme-btn">🛍️ 投递制品情报</button>
        </form>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useUserStore } from '../../stores/userStore'
import { supabase } from '../../services/supabase'
import { uploadImage } from '../../services/storage'

const userStore = useUserStore()
// ✅ 默认激活“同人一键投递”，方便现场用户
const activeTab = ref('dojin_quick')
const isSubmitting = ref(false)

const workForm = reactive({ title: '', type: 'illustration', link_url: '', creator_name: '', description: '' })
const workFile = ref(null); const workPreview = ref('')

const productForm = reactive({ name: '', link_url: '', category: '' })
const productFile = ref(null); const productPreview = ref('')

const dojinQuickForm = reactive({ event_id: '', creator_name: '', name: '' })
const dojinQuickFile = ref(null)
const dojinQuickPreview = ref('')
const rawEventList = ref([]) 

onMounted(async () => {
  loadEventOptions()
})

const loadEventOptions = async () => {
  // ✅ 修正：现在从 'events' 表读取数据，而不是 'items'
  // 这样就彻底把 官方活动 和 普通周边/同人企划 分开了
  const { data, error } = await supabase
    .from('events')
    .select('id, name, localized_title, start_date, end_date')
    .order('start_date', { ascending: false }) // 先按时间倒序拿
    .limit(50)

  if (!error && data) {
    rawEventList.value = data
  }
}

// ✅ 智能排序逻辑 (适配新的 events 表结构)
const sortedEvents = computed(() => {
  const now = new Date().getTime()
  const oneDay = 24 * 60 * 60 * 1000
  const sevenDays = 7 * oneDay

  const hot = []
  const upcoming = []
  const past = []

  rawEventList.value.forEach(ev => {
    // events 表使用的是 start_date 和 end_date
    const start = new Date(ev.start_date).getTime()
    // 如果没有结束时间，默认持续1天
    const end = ev.end_date ? new Date(ev.end_date).getTime() : start + oneDay

    // 逻辑：
    // 1. 进行中/近期: (开始时间 <= 现在) 且 (现在 <= 结束时间 + 7天缓冲期)
    // 2. 即将开始: (开始时间 > 现在)
    // 3. 往期: (现在 > 结束时间 + 7天)
    
    if (start > now) {
      upcoming.push(ev)
    } else if (now <= end + sevenDays) {
      hot.push(ev)
    } else {
      past.push(ev)
    }
  })

  // 近期活动按“开始时间”倒序（最近开始的在最前）
  hot.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
  // 即将开始按“开始时间”正序（越近的越靠前）
  upcoming.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
  // 往期按“开始时间”倒序
  past.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

  return { hot, upcoming, past }
})

const handleFileChange = (e, type) => {
  const file = e.target.files[0]
  if (!file) return
  
  if (file.size > 5 * 1024 * 1024) {
    alert('图片太大啦，请选择5MB以内的图片哦')
    return
  }

  const previewUrl = URL.createObjectURL(file)
  if (type === 'work') { workFile.value = file; workPreview.value = previewUrl }
  if (type === 'product') { productFile.value = file; productPreview.value = previewUrl }
  if (type === 'dojin_quick') { dojinQuickFile.value = file; dojinQuickPreview.value = previewUrl }
}

const submitToDb = async (table, data, file, storagePathPrefix) => {
  if (!userStore.user) return alert('请先登录再投递哦 🥺')
  isSubmitting.value = true
  try {
    let imageUrl = null
    if (file) {
        const path = `${storagePathPrefix}/${Date.now()}_${Math.random().toString(36).substring(7)}`
        imageUrl = await uploadImage('user_uploads', path, file)
    }
    
    const payload = {
        ...data,
        user_id: userStore.user.id,
        status: 'pending', 
        created_at: new Date().toISOString()
    }
    if(imageUrl) payload.image_url = imageUrl

    const { error } = await supabase.from(table).insert(payload)
    if (error) throw error

    alert('投递成功！感谢您的分享，管理员审核通过后就会显示啦 🎉')
    window.location.reload() 
  } catch (e) {
    console.error(e)
    alert('投递失败: ' + (e.message || '未知错误，请稍后再试'))
  } finally {
    isSubmitting.value = false
  }
}

const handleSubmitWork = () => {
    submitToDb('works', {
        ...workForm,
        is_fan_work: true 
    }, workFile.value, 'works')
}

const handleSubmitProduct = () => {
    submitToDb('items', {
        ...productForm,
        is_fan_work: false, 
        category: productForm.category || '未分类制品'
    }, productFile.value, 'items')
}

const handleSubmitDojinQuick = () => {
    if (!dojinQuickFile.value) return alert('请拍摄或选择一张照片哦 📸')
    if (!dojinQuickForm.event_id) return alert('请选择来源活动 📅')

    const finalData = {
        name: dojinQuickForm.name || '同人周边/无料', 
        category: '同人制品', 
        is_fan_work: true, 
        description: dojinQuickForm.creator_name ? `画师/制作: ${dojinQuickForm.creator_name}` : null, 
        // 如果选了 unknown，则 event_id 设为 null，这样就会进入“待认领”
        event_id: dojinQuickForm.event_id === 'unknown' ? null : dojinQuickForm.event_id 
    }
    
    submitToDb('items', finalData, dojinQuickFile.value, 'items_dojin')
}

</script>

<style scoped>
.submit-container { max-width: 800px; margin: 20px auto; padding: 0 15px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
.skin-theme .notebook-paper { background: #fffaf0; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 2px solid #eee; position: relative; overflow: hidden; }
.skin-theme .notebook-paper::before { content: ''; position: absolute; top: 0; left: 30px; width: 2px; height: 100%; background: #ffcdd2; }
.page-title { text-align: center; color: #555; margin-bottom: 10px; font-family: 'Comic Sans MS', cursive, sans-serif; }
.page-desc { text-align: center; color: #888; margin-bottom: 30px; font-size: 14px; }

.tabs-nav { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 2px solid #eee; padding-bottom: 10px; overflow-x: auto; }
.tabs-nav button { background: none; border: none; padding: 10px 15px; cursor: pointer; font-size: 15px; color: #666; font-weight: bold; border-radius: 8px; white-space: nowrap; transition: 0.3s; }
.tabs-nav button.active { background: #39C5BB; color: white; }
.tabs-nav button.dojin-tab { color: #2e7d32; }
.tabs-nav button.dojin-tab.active { background: #4caf50; color: white; }

.form-content-box { position: relative; min-height: 300px; }
.loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10; }
.spinner { border: 4px solid #f3f3f3; border-top: 4px solid #39C5BB; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin-bottom: 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #555; }
.required { color: #ff5252; }
input[type="text"], input[type="url"], select, textarea, .date-row input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; background: rgba(255,255,255,0.8); font-family: inherit; box-sizing: border-box; transition: 0.3s; }
input:focus, select:focus, textarea:focus { border-color: #39C5BB; outline: none; background: white; }
.file-upload-box { border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 8px; cursor: pointer; background: rgba(255,255,255,0.5); transition: 0.3s; display: flex; justify-content: center; align-items: center; min-height: 100px; }
.file-upload-box:hover { border-color: #39C5BB; background: rgba(57, 197, 187, 0.1); }
.preview-img { max-width: 100%; max-height: 200px; border-radius: 8px; }
.radio-group { display: flex; gap: 20px; }
.radio-group label { font-weight: normal; cursor: pointer; display: flex; align-items: center; gap: 5px; }
.date-row { display: flex; gap: 10px; align-items: center; }
.submit-btn { width: 100%; padding: 15px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; color: white; cursor: pointer; transition: 0.3s; }
.theme-btn { background: #39C5BB; box-shadow: 0 4px 0 #2da8a0; }
.theme-btn:hover { transform: translateY(2px); box-shadow: 0 2px 0 #2da8a0; }
.hint-text { font-size: 13px; color: #777; margin-bottom: 15px; background: #f0f0f0; padding: 10px; border-radius: 6px; }

.quick-form .highlight-group { background: rgba(255,255,255,0.6); padding: 15px; border-radius: 12px; border: 1px solid #e0e0e0; }
.big-label { font-size: 1.1em; color: #2e7d32; }
.big-upload { min-height: 180px; border-color: #a5d6a7; background: #e8f5e9; }
.big-upload.has-img { padding: 0; border: none; }
.cover-fit { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; min-height: 200px; }
.upload-placeholder { color: #66bb6a; font-weight: bold; }
.big-select { font-size: 1.1em; padding: 15px; border-color: #a5d6a7; }
.hint-mini { font-size: 12px; color: #888; margin-top: 5px; }
.dojin-btn { background: #4caf50; box-shadow: 0 4px 0 #388e3c; }
.dojin-btn:hover { transform: translateY(2px); box-shadow: 0 2px 0 #388e3c; }
</style>