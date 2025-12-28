<template>
  <div class="submit-container skin-theme">
    <div class="notebook-paper">
      <h2 class="page-title">📝 情报/作品投递箱</h2>
      <p class="page-desc">
        不论是官方新情报，还是您创作/发现的同人作品，都欢迎投递！
      </p>

      <div class="tabs-nav">
        <button 
          :class="{ active: activeTab === 'product' }" 
          @click="activeTab = 'product'"
        >
          🛍️ 官方制品情报
        </button>

        <button 
          :class="{ active: activeTab === 'dojin_quick' }" 
          @click="activeTab = 'dojin_quick'" 
          class="dojin-tab"
        >
          🎁 同人/无料一键投递
        </button>

        <button 
          :class="{ active: activeTab === 'work' }" 
          @click="activeTab = 'work'"
        >
          🎨 同人音像创作
        </button>
      </div>

      <div class="form-content-box">
        <div v-if="isSubmitting" class="loading-overlay">
          <div class="spinner"></div>
          <p>正在快马加鞭投递中...🐎</p>
        </div>

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

          <div class="form-group highlight-group">
            <label class="sub-label">🏷️ 特殊属性标记</label>
            <div class="checkbox-group">
              <label class="check-box-pill">
                <input type="checkbox" v-model="productForm.is_blind_box"> 
                🎲 盲抽/随机商品 (Random)
              </label>
              <label class="check-box-pill">
                <input type="checkbox" v-model="productForm.is_collection"> 
                📦 全套合集 (Collection)
              </label>
            </div>
            <p class="hint-mini" v-if="productForm.is_blind_box">
              ⚠️ 盲抽商品请直接上传“全种一览图”，不要拆分成单款上传。
            </p>
          </div>

          <button type="submit" class="submit-btn theme-btn">🛍️ 投递制品情报</button>
        </form>

        <div v-show="activeTab === 'dojin_quick'">
          
          <div class="role-switch-container">
            <button 
              class="role-btn" 
              :class="{ active: quickRole === 'creator' }"
              @click="quickRole = 'creator'"
            >
              🔘 我是创作者 (发放者)
            </button>
            <button 
              class="role-btn" 
              :class="{ active: quickRole === 'receiver' }"
              @click="quickRole = 'receiver'"
            >
              ⚪ 我是领取者 (吃谷人)
            </button>
          </div>

          <form @submit.prevent="handleSubmitDojinQuick" class="quick-form">
            
            <p v-if="quickRole === 'creator'" class="hint-text creator-hint">
              ✨ 感谢产粮！祝您的作品大受欢迎！
            </p>
            <p v-else class="hint-text receiver-hint">
              💖 感谢返图！若系统检测到已有该作品，请直接点进去发返图哦，避免重复创建~
            </p>

            <div class="form-group highlight-group">
              <label class="big-label">📸 {{ quickRole === 'creator' ? '实物图/宣图' : '实拍返图' }} <span class="required">*</span></label>
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
              <select v-model="dojinQuickForm.event_id" required class="big-select" @change="handleEventSelection">
                <option value="" disabled selected>请选择 (已加载标准活动库)</option>
                <optgroup v-for="(group, year) in groupedEvents" :key="year" :label="year + '年活动'">
                  <option v-for="ev in group" :key="ev.id" :value="ev.id">{{ ev.name }}</option>
                </optgroup>
                <option value="unknown">❓ 忘记了 / 待认领活动</option>
              </select>

              <div v-if="availableLocations.length > 0" class="location-picker fade-in">
                <label class="sub-label">📍 具体是哪一场？(多选)</label>
                <div class="checkbox-group">
                  <label v-for="loc in availableLocations" :key="loc" class="check-box-pill">
                    <input type="checkbox" :value="loc" v-model="dojinQuickForm.selected_locations"> 
                    {{ loc }}
                  </label>
                </div>
              </div>
            </div>

            <div v-if="quickRole === 'creator'" class="form-group">
              <label>🖌️ 作者信息</label>
              <input type="text" :value="userStore.profile?.username || '当前用户 (您)'" disabled class="locked-input" />
              <p class="hint-mini">✅ 已锁定为您本人发布</p>
            </div>

            <div v-else class="form-group relative-box">
              <label>🖌️ 作者是谁？(支持搜索)</label>
              <input 
                v-model="dojinQuickForm.creator_input" 
                type="text" 
                placeholder="不知道可不填~" 
                @input="handleCreatorSearch"
                autocomplete="off"
              />
              
              <div v-if="searchResults.length > 0" class="search-results-popover">
                <p class="popover-title">🤔 您是指这些已发布的作品吗？</p>
                <div class="results-grid">
                  <div 
                    v-for="item in searchResults" 
                    :key="item.id" 
                    class="result-item"
                    @click="redirectToItem(item.id)"
                  >
                    <img :src="item.image_url" class="result-thumb">
                    <div class="result-info">
                      <span class="r-name">{{ item.name }}</span>
                      <span class="r-author">@{{ item.author_name || '未知作者' }}</span>
                    </div>
                    <div class="r-action">👉 去发图</div>
                  </div>
                </div>
                <div class="popover-footer" @click="searchResults = []">
                  不是以上这些 (点击关闭)
                </div>
              </div>
            </div>
            
            <div class="form-group">
               <label>周边类型</label>
               <select v-model="dojinQuickForm.category">
                 <option value="同人制品" disabled>请选择类型</option>
                 <option v-for="cat in merchCategories" :key="cat.id" :value="cat.name">
                   {{ cat.name }}
                 </option>
               </select>
            </div>

            <div class="form-group">
               <label>简单描述 (选填)</label>
               <input v-model="dojinQuickForm.name" type="text" placeholder="例如：Miku 2025 生贺吧唧" />
            </div>

            <button type="submit" class="submit-btn dojin-btn">
              {{ quickRole === 'creator' ? '🎁 我是作者，确认发布' : '🎁 我是路人，提交情报' }}
            </button>
          </form>
        </div>

        <form v-show="activeTab === 'work'" @submit.prevent="handleSubmitWork">
          <p class="hint-text">
            🎵 支持投稿 <b>原创音乐/PV/翻调/插画</b> 等。<br>
            ⚠️ 视频音频文件请托管在B站/网易云等平台，此处仅填写链接。
          </p>
          
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
            <label>作品链接 (B站/P站/Niconico等) <span class="required">*</span></label>
            <input v-model="workForm.link_url" type="url" placeholder="https://..." required />
          </div>
          <div class="form-group">
            <label>封面图/预览图 (上传图片)</label>
            <div class="file-upload-box" @click="$refs.workFile.click()">
              <span v-if="!workPreview">点击选择封面图片</span>
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

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import { supabase } from '../../services/supabase'
import { uploadImage } from '../../services/storage'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('dojin_quick') 
const isSubmitting = ref(false)

// 状态：身份切换
const quickRole = ref('creator') 

// 状态：搜索相关
const searchResults = ref([])
let searchTimeout = null

// 状态：字典数据
const merchCategories = ref([]) 

// 状态：活动数据
const rawEventList = ref([]) 
const availableLocations = ref([]) 

// 表单数据：同人音像
const workForm = reactive({ title: '', type: 'illustration', link_url: '', creator_name: '', description: '' })
const workFile = ref(null); const workPreview = ref('')

// 表单数据：官方制品 (✅ 新增 is_blind_box 和 is_collection)
const productForm = reactive({ 
  name: '', 
  link_url: '', 
  category: '',
  is_blind_box: false,
  is_collection: false
})
const productFile = ref(null); const productPreview = ref('')

// 表单数据：一键投递
const dojinQuickForm = reactive({ 
  event_id: '', 
  creator_input: '', 
  name: '', 
  category: '同人制品', 
  selected_locations: [] 
})
const dojinQuickFile = ref(null)
const dojinQuickPreview = ref('')

onMounted(async () => {
  await Promise.all([
    loadEventOptions(),
    loadMerchCategories()
  ])
})

// 加载活动列表
const loadEventOptions = async () => {
  const { data } = await supabase.from('standard_events').select('*').eq('is_active', true).order('year', { ascending: false }) 
  if (data) rawEventList.value = data
}

// 加载周边类型字典
const loadMerchCategories = async () => {
  const { data } = await supabase.from('merch_categories').select('*').order('sort_order', { ascending: true })
  if (data && data.length > 0) {
    merchCategories.value = data
    dojinQuickForm.category = data[0].name 
  }
}

const groupedEvents = computed(() => {
  const groups = {}
  rawEventList.value.forEach(ev => {
    const y = ev.year || '其他年份'
    if (!groups[y]) groups[y] = []
    groups[y].push(ev)
  })
  return groups
})

const handleEventSelection = () => {
  const eventId = dojinQuickForm.event_id
  dojinQuickForm.selected_locations = [] 
  availableLocations.value = [] 
  if (!eventId || eventId === 'unknown') return
  const selectedEvent = rawEventList.value.find(e => e.id === eventId)
  if (selectedEvent?.locations) availableLocations.value = selectedEvent.locations
}

const handleCreatorSearch = (e) => {
  const query = e.target.value.trim()
  searchResults.value = []
  if (!query || query.length < 2) return 

  if (searchTimeout) clearTimeout(searchTimeout)
  
  searchTimeout = setTimeout(async () => {
    const { data } = await supabase
      .from('items')
      .select('id, name, author_name, image_url')
      .eq('is_fan_work', true)
      .ilike('author_name', `%${query}%`)
      .limit(3)
    
    if (data && data.length > 0) {
      searchResults.value = data
    }
  }, 500)
}

const redirectToItem = (itemId) => {
  if(confirm('即将跳转到该作品页面进行返图/评论，确认吗？')) {
    router.push(`/events`) 
  }
}

const handleFileChange = (e, type) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) return alert('图片太大啦，请选择5MB以内的图片哦')

  const previewUrl = URL.createObjectURL(file)
  if (type === 'work') { workFile.value = file; workPreview.value = previewUrl }
  if (type === 'product') { productFile.value = file; productPreview.value = previewUrl }
  if (type === 'dojin_quick') { dojinQuickFile.value = file; dojinQuickPreview.value = previewUrl }
}

const submitToDb = async (table, payload, file, storagePathPrefix) => {
  if (!userStore.user) return alert('请先登录再投递哦 🥺')
  isSubmitting.value = true
  try {
    let imageUrl = null
    if (file) {
        const path = `${storagePathPrefix}/${Date.now()}_${Math.random().toString(36).substring(7)}`
        imageUrl = await uploadImage('user_uploads', path, file)
    }
    
    const finalPayload = {
        ...payload,
        status: 'pending', 
        created_at: new Date().toISOString()
    }
    if(imageUrl) finalPayload.image_url = imageUrl

    const { error } = await supabase.from(table).insert(finalPayload)
    if (error) throw error

    alert('投递成功！管理员审核通过后就会显示啦 🎉')
    window.location.reload() 
  } catch (e) {
    console.error(e)
    alert('投递失败: ' + (e.message || '未知错误，请稍后再试'))
  } finally {
    isSubmitting.value = false
  }
}

// 提交：一键投递
const handleSubmitDojinQuick = () => {
    if (!dojinQuickFile.value) return alert('请拍摄或选择一张照片哦 📸')
    if (!dojinQuickForm.event_id) return alert('请选择来源活动 📅')

    let finalDesc = dojinQuickForm.name || '同人无料'
    
    if (dojinQuickForm.selected_locations.length > 0) {
      finalDesc += `\n📍 参展场次: ${dojinQuickForm.selected_locations.join(', ')}`
    }

    const payload = {
      category: dojinQuickForm.category,
      is_fan_work: true,
      event_id: dojinQuickForm.event_id === 'unknown' ? null : dojinQuickForm.event_id,
      name: dojinQuickForm.name || '未命名同人制品',
      description: finalDesc,
      
      author_name: null, 
      user_id: null,       
      uploader_id: userStore.user.id, 
      is_creator_verified: false
    }

    if (quickRole.value === 'creator') {
      payload.user_id = userStore.user.id 
      payload.author_name = userStore.profile?.username || '未命名'
      payload.is_creator_verified = true
      payload.description += '\n✨ 作者本人发布'
    } else {
      const creatorName = dojinQuickForm.creator_input ? dojinQuickForm.creator_input : '未知创作者'
      payload.user_id = null 
      payload.author_name = creatorName
      payload.is_creator_verified = false
      payload.description += `\n📍 领取者贡献 (上传人UID: ${userStore.profile?.user_no || '?'})`
    }

    submitToDb('items', payload, dojinQuickFile.value, 'items_dojin')
}

// 提交：同人音像创作
const handleSubmitWork = () => {
    submitToDb('items', {
        name: workForm.title,  
        author_name: workForm.creator_name, 
        category: '同人音像', 
        description: `类型: ${workForm.type}\n链接: ${workForm.link_url}\n简介: ${workForm.description}`, 
        is_fan_work: true,
        user_id: userStore.user.id,
        is_creator_verified: true,
        uploader_id: userStore.user.id
    }, workFile.value, 'works')
}

// 提交：官方制品 (✅ 已包含新字段)
const handleSubmitProduct = () => {
    submitToDb('items', {
        ...productForm,
        is_fan_work: false, 
        category: productForm.category || '未分类制品',
        user_id: userStore.user.id,
        uploader_id: userStore.user.id,
        // 下面两个是新增的关键字段
        is_blind_box: productForm.is_blind_box,
        is_collection: productForm.is_collection
    }, productFile.value, 'items')
}
</script>

<style scoped>
/* 保持原有基础样式 */
.submit-container { max-width: 800px; margin: 20px auto; padding: 0 15px; font-family: 'Segoe UI', sans-serif; }
.skin-theme .notebook-paper { background: #fffaf0; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 2px solid #eee; position: relative; overflow: hidden; }
.page-title { text-align: center; color: #555; margin-bottom: 10px; }
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
.sub-label { display: block; margin: 10px 0 5px; font-size: 14px; color: #2e7d32; font-weight: bold; }
.required { color: #ff5252; }
input[type="text"], input[type="url"], select, textarea { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; background: rgba(255,255,255,0.8); font-family: inherit; box-sizing: border-box; transition: 0.3s; }
input:focus, select:focus, textarea:focus { border-color: #39C5BB; outline: none; background: white; }
.file-upload-box { border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 8px; cursor: pointer; background: rgba(255,255,255,0.5); transition: 0.3s; display: flex; justify-content: center; align-items: center; min-height: 100px; }
.file-upload-box:hover { border-color: #39C5BB; background: rgba(57, 197, 187, 0.1); }
.preview-img { max-width: 100%; max-height: 200px; border-radius: 8px; }
.submit-btn { width: 100%; padding: 15px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; color: white; cursor: pointer; transition: 0.3s; }
.theme-btn { background: #39C5BB; box-shadow: 0 4px 0 #2da8a0; }
.dojin-btn { background: #4caf50; box-shadow: 0 4px 0 #388e3c; }

/* 身份切换 */
.role-switch-container { display: flex; gap: 15px; margin-bottom: 20px; justify-content: center; }
.role-btn { padding: 10px 20px; border: 2px solid #ddd; border-radius: 30px; background: white; cursor: pointer; color: #666; transition: 0.2s; font-weight: bold; }
.role-btn:hover { border-color: #4caf50; color: #4caf50; }
.role-btn.active { background: #4caf50; color: white; border-color: #4caf50; box-shadow: 0 4px 10px rgba(76,175,80,0.3); }

/* 提示文本 */
.hint-text { padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; text-align: center; }
.creator-hint { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.receiver-hint { background: #fff3e0; color: #ef6c00; border: 1px solid #ffe0b2; }

/* 搜索结果 */
.relative-box { position: relative; }
.search-results-popover { position: absolute; top: 100%; left: 0; width: 100%; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 5px 20px rgba(0,0,0,0.15); z-index: 100; margin-top: 5px; overflow: hidden; }
.popover-title { padding: 10px; background: #f5f5f5; margin: 0; font-size: 12px; color: #666; font-weight: bold; }
.results-grid { max-height: 250px; overflow-y: auto; }
.result-item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; transition: 0.2s; }
.result-item:hover { background: #f0f9eb; }
.result-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 10px; }
.result-info { flex: 1; display: flex; flex-direction: column; }
.r-name { font-weight: bold; font-size: 13px; color: #333; }
.r-author { font-size: 11px; color: #888; }
.r-action { font-size: 12px; color: #4caf50; font-weight: bold; }
.popover-footer { padding: 10px; text-align: center; font-size: 12px; color: #888; cursor: pointer; background: #fafafa; }

.quick-form .highlight-group { background: rgba(255,255,255,0.6); padding: 15px; border-radius: 12px; border: 1px solid #e0e0e0; }
.big-label { font-size: 1.1em; color: #2e7d32; }
.big-upload { min-height: 180px; border-color: #a5d6a7; background: #e8f5e9; }
.big-upload.has-img { padding: 0; border: none; }
.cover-fit { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; min-height: 200px; }
.upload-placeholder { color: #66bb6a; font-weight: bold; }
.big-select { font-size: 1.1em; padding: 15px; border-color: #a5d6a7; }
.locked-input { background: #f0f0f0; color: #555; cursor: not-allowed; }
.hint-mini { font-size: 12px; color: #4caf50; margin-top: 5px; }

/* 动画 */
.location-picker { margin-top: 10px; padding: 10px; background: #f1f8e9; border-radius: 8px; border: 1px dashed #a5d6a7; }
.checkbox-group { display: flex; flex-wrap: wrap; gap: 8px; }
.check-box-pill { background: white; padding: 6px 12px; border-radius: 20px; font-size: 13px; border: 1px solid #c8e6c9; cursor: pointer; user-select: none; transition: 0.2s; display: flex; align-items: center; gap: 5px; color: #333; }
.check-box-pill:hover { background: #e8f5e9; }
.check-box-pill:has(input:checked) { background: #4caf50; color: white; border-color: #4caf50; font-weight: bold; box-shadow: 2px 5px rgba(76, 175, 80, 0.3); }
.fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>