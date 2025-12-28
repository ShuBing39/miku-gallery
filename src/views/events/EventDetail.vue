<template>
  <div class="event-detail-container">
    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>正在读取情报...</p>
    </div>

    <div v-else-if="event" class="content-wrapper">
      <div class="hero-header" :style="{ backgroundImage: `url(${event.image_url})` }">
        <div class="hero-overlay">
          <div class="top-bar">
            <button class="back-btn" @click="$router.go(-1)">⬅ 返回列表</button>
            <div class="action-buttons-right">
              <button class="btn-icon-glass" @click="openUploadModal">📸 返图</button>
              <button class="btn-icon-glass" @click="openRevisionModal">🔧 纠错</button>
              
              <button v-if="isAdmin" class="btn-edit-float" @click="showEditModal = true">
                ⚙️ 管理情报
              </button>
            </div>
          </div>
          
          <div class="header-content">
            <div class="status-badge-row">
              <span class="status-pill" :class="statusColor">
                {{ getStatusText(event) }}
              </span>
              <span v-if="event.needs_reservation" class="tag warn">⚠️ 需要预约</span>
            </div>
            
            <h1 class="title">
              {{ event.localized_title || event.title }}
            </h1>
            <h2 v-if="event.localized_title" class="sub-title">{{ event.title }}</h2>
            
            <div class="tags-wall" v-if="event.tags && event.tags.length">
              <span v-for="tag in event.tags" :key="tag" class="smart-tag">#{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="main-body">
        <div class="info-card">
          <div class="time-block highlight" v-if="event.reservation_start">
            <div class="block-icon">🎫</div>
            <div class="block-content">
              <label>预约/售票期</label>
              <p class="time-text">
                {{ formatDate(event.reservation_start) }} ~ {{ formatDate(event.reservation_end) }}
              </p>
              <div class="countdown" v-if="isReserving">
                🔥 正在抢票中
              </div>
            </div>
          </div>

          <div class="time-block">
            <div class="block-icon">📅</div>
            <div class="block-content">
              <label>活动举办期</label>
              <p>{{ formatDate(event.start_date) }} ~ {{ formatDate(event.end_date) }}</p>
            </div>
          </div>
          
          <div v-if="event.has_goods" class="goods-hint-box">
             🛍️ 此活动有周边贩售，请查阅维基或前往开团大厅。
          </div>

          <div class="action-grid">
            <a :href="event.source_url" target="_blank" class="btn-action primary">
              🔗 前往官网查看
            </a>
            
            <template v-if="event.has_goods">
              <button @click="$router.push('/wiki')" class="btn-action wiki">
                📖 查看周边列表 (Wiki)
              </button>
              <button @click="$router.push('/group-buy-lobby')" class="btn-action shop">
                🛒 前往开团大厅
              </button>
            </template>
          </div>
        </div>

        <div class="desc-panel">
          <h3>📝 情报详情</h3>
          <div v-if="event.localized_description" class="desc-text">
            {{ event.localized_description }}
          </div>
          <div v-else class="empty-state-text">
            🚧 中文介绍暂缺
            <button v-if="isAdmin" class="text-btn" @click="showEditModal = true">
              我是管理员，我来补全
            </button>
          </div>
        </div>

        <div v-if="galleryImages.length > 0" class="desc-panel gallery-panel">
          <h3>📸 现场返图 ({{ galleryImages.length }})</h3>
          <div class="gallery-grid">
            <div 
              v-for="img in galleryImages" 
              :key="img.id" 
              class="gallery-item"
              @click="openLightbox(img.image_url)"
            >
              <img :src="img.image_url" loading="lazy">
              <div v-if="img.caption" class="gallery-caption">{{ img.caption }}</div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>⚙️ 管理员编辑</h3>
          <button class="close-btn" @click="showEditModal = false">×</button>
        </div>
        <div class="modal-body">
           <div class="form-section">
            <h4>核心定性</h4>
            <div class="form-group"><label>中文标题</label><input v-model="editForm.localized_title" class="full-width"></div>
            <div class="form-group"><label>标签</label>
              <div class="checkbox-group">
                <label v-for="tag in availableTags" :key="tag" class="check-box">
                  <input type="checkbox" :value="tag" v-model="editForm.tags"> {{ tag }}
                </label>
              </div>
            </div>
            <div class="form-group" style="margin-top:10px;background:#e0f2f1;padding:10px;border-radius:6px;">
              <label style="display:flex;align-items:center;gap:10px;"><input type="checkbox" v-model="editForm.has_goods" style="width:auto;">🛍️ 包含周边贩售</label>
            </div>
           </div>
           <div class="form-section">
             <h4>时间定档</h4>
             <div class="form-row">
               <div class="form-group half"><label>抢票开始</label><input type="date" v-model="editForm.reservation_start"></div>
               <div class="form-group half"><label>抢票结束</label><input type="date" v-model="editForm.reservation_end"></div>
             </div>
             <div class="form-row">
               <div class="form-group half"><label>活动开始</label><input type="date" v-model="editForm.start_date"></div>
               <div class="form-group half"><label>活动结束</label><input type="date" v-model="editForm.end_date"></div>
             </div>
           </div>
           <div class="form-section">
             <h4>详情</h4>
             <div class="form-group"><label>介绍</label><textarea v-model="editForm.localized_description" rows="5"></textarea></div>
             <div class="form-group"><label>状态</label>
               <select v-model="editForm.life_cycle_status" class="full-width">
                 <option value="normal">🟢 正常</option><option value="reserving">🔥 抢票中</option><option value="active">🎉 举办中</option><option value="ended">🏁 已结束</option>
               </select>
             </div>
           </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showEditModal = false">取消</button>
          <button class="btn-save" @click="saveChanges" :disabled="saving">{{ saving ? '保存中...' : '💾 直接更新' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showRevisionModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>🔧 提交纠错建议</h3>
          <button class="close-btn" @click="showRevisionModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="hint-text">请在下方直接修改您认为有误的信息，管理员审核通过后将更新到词条。</p>
          <div class="form-section">
            <div class="form-group"><label>中文标题修正</label><input v-model="revisionForm.localized_title" class="full-width"></div>
            <div class="form-group"><label>详情修正</label><textarea v-model="revisionForm.localized_description" rows="4"></textarea></div>
             <div class="form-row">
               <div class="form-group half"><label>活动开始</label><input type="date" v-model="revisionForm.start_date"></div>
               <div class="form-group half"><label>活动结束</label><input type="date" v-model="revisionForm.end_date"></div>
             </div>
          </div>
          <div class="form-section bg-gray">
            <div class="form-group">
              <label>💬 备注说明 (必填)</label>
              <textarea v-model="revisionComment" placeholder="请简要说明修改来源..." rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showRevisionModal = false">取消</button>
          <button class="btn-save" @click="submitRevision" :disabled="submittingRev">{{ submittingRev ? '提交中...' : '📤 提交审核' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showUploadModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>📸 上传活动返图</h3>
          <button class="close-btn" @click="showUploadModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>选择图片</label>
            <input type="file" @change="handleFileSelect" accept="image/*">
          </div>
          <div class="preview-box" v-if="uploadPreview">
            <img :src="uploadPreview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
          </div>
          <div class="form-group">
            <label>想说的话 (选填)</label>
            <input v-model="uploadCaption" class="full-width" placeholder="分享一下现场的气氛吧~">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showUploadModal = false">取消</button>
          <button class="btn-save" @click="submitReturnImage" :disabled="submittingImg">{{ submittingImg ? '上传中...' : '☁️ 确认上传' }}</button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showLightbox" class="lightbox-overlay" @click="showLightbox=false">
        <img :src="lightboxImage" class="lightbox-img" @click.stop>
        <button class="lightbox-close" @click="showLightbox=false">×</button>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// ✅ 修正路径引用：全部改为 ../../
import { getEventById, updateEvent } from '../../services/eventData'
import { useUserStore } from '../../stores/userStore'
import { supabase } from '../../services/supabase' 
import { uploadImage } from '../../services/storage'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const event = ref(null)
const loading = ref(true)

// 状态控制
const showEditModal = ref(false)
const showRevisionModal = ref(false)
const showUploadModal = ref(false)

// ✅ 新增：相册相关状态
const galleryImages = ref([])
const showLightbox = ref(false)
const lightboxImage = ref('')

const saving = ref(false)
const submittingRev = ref(false)
const submittingImg = ref(false)

const availableTags = ['演唱会', '企划展', '贩售', '联动/Cafe', '线上活动', 'DJ Live', '其他']

// 表单数据
const editForm = reactive({}) 
const revisionForm = reactive({}) 
const revisionComment = ref('')

const uploadFile = ref(null)
const uploadPreview = ref('')
const uploadCaption = ref('')

const isAdmin = computed(() => !!userStore.user) 

onMounted(async () => {
  await loadData()
  // ✅ 加载完活动信息后，加载相册
  if (event.value) {
    loadGallery()
  }
})

const loadData = async () => {
  loading.value = true
  const id = route.params.id
  if (id) {
    const data = await getEventById(id)
    if (data) {
      event.value = data
      const formData = {
        localized_title: data.localized_title || '',
        localized_description: data.localized_description || '',
        tags: data.tags || [],
        start_date: data.start_date?.split('T')[0] || '',
        end_date: data.end_date?.split('T')[0] || '',
        reservation_start: data.reservation_start?.split('T')[0] || '',
        reservation_end: data.reservation_end?.split('T')[0] || '',
        group_buy_link: data.group_buy_link || '',
        life_cycle_status: data.life_cycle_status || 'normal',
        needs_reservation: data.needs_reservation || false,
        has_goods: data.has_goods || false
      }
      Object.assign(editForm, formData)
    }
  }
  loading.value = false
}

// ✅ 新增：加载返图相册
const loadGallery = async () => {
  const { data, error } = await supabase
    .from('user_images')
    .select('*')
    .eq('item_id', event.value.id)
    .eq('status', 'approved') // 只显示审核通过的
    .order('created_at', { ascending: false })
  
  if (!error && data) {
    galleryImages.value = data
  }
}

// ✅ 新增：打开大图
const openLightbox = (url) => {
  lightboxImage.value = url
  showLightbox.value = true
}

// ... (以下原有逻辑保持不变) ...

const saveChanges = async () => {
  saving.value = true
  try {
    const updates = { ...editForm }
    if (!updates.reservation_start) updates.reservation_start = null
    if (!updates.reservation_end) updates.reservation_end = null
    
    await updateEvent(event.value.id, updates)
    Object.assign(event.value, editForm)
    alert('✅ 情报更新成功！')
    showEditModal.value = false
  } catch (e) {
    alert('❌ 保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

const openRevisionModal = () => {
  if (!userStore.user) return alert('请先登录后再提交纠错哦')
  Object.assign(revisionForm, JSON.parse(JSON.stringify(editForm)))
  revisionComment.value = ''
  showRevisionModal.value = true
}

const submitRevision = async () => {
  if (!revisionComment.value) return alert('请填写备注说明')
  submittingRev.value = true
  try {
    const updates = { ...revisionForm }
    if (!updates.reservation_start) updates.reservation_start = null
    if (!updates.reservation_end) updates.reservation_end = null

    const { error } = await supabase.from('wiki_revisions').insert({
      item_id: event.value.id,
      user_id: userStore.user.id,
      new_data: updates,
      comment: revisionComment.value,
      status: 'pending'
    })
    
    if (error) throw error
    alert('✅ 纠错建议已提交！')
    showRevisionModal.value = false
  } catch (e) {
    alert('❌ 提交失败: ' + e.message)
  } finally {
    submittingRev.value = false
  }
}

const openUploadModal = () => {
  if (!userStore.user) return alert('请先登录后再上传返图哦')
  uploadFile.value = null
  uploadPreview.value = ''
  uploadCaption.value = ''
  showUploadModal.value = true
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) {
    uploadFile.value = file
    uploadPreview.value = URL.createObjectURL(file)
  }
}

const submitReturnImage = async () => {
  if (!uploadFile.value) return alert('请先选择图片')
  submittingImg.value = true
  try {
    const path = `item-images/user_uploads/${Date.now()}_${Math.random().toString(36).substring(7)}`
    const url = await uploadImage('item-images', path, uploadFile.value) 
    
    const { error } = await supabase.from('user_images').insert({
      item_id: event.value.id,
      user_id: userStore.user.id,
      image_url: url,
      caption: uploadCaption.value,
      status: 'pending'
    })

    if (error) throw error
    alert('✅ 返图上传成功！管理员审核后将展示在相册中。')
    showUploadModal.value = false
    // 这里不调用 loadGallery()，因为上传后状态是 pending，前台本来就不该显示
  } catch (e) {
    console.error(e)
    alert('❌ 上传失败: ' + (e.message || '网络错误'))
  } finally {
    submittingImg.value = false
  }
}

const formatDate = (str) => {
  if (!str) return '待定'
  const d = new Date(str)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

const isReserving = computed(() => {
  if (!event.value) return false
  if (event.value.life_cycle_status === 'reserving') return true
  if (!event.value.reservation_start || !event.value.reservation_end) return false
  const now = new Date()
  return now >= new Date(event.value.reservation_start) && now <= new Date(event.value.reservation_end)
})

const getStatusText = (ev) => {
  const map = {
    'intelligence': '🔓 情报解禁',
    'reserving': '🔥 抢票中',
    'active': '🎉 举办中',
    'post_sale': '📦 事后贩售',
    'ended': '🏁 已结束',
    'normal': '📅 即将开始'
  }
  if (ev.life_cycle_status === 'normal' && isReserving.value) return '🔥 抢票中'
  return map[ev.life_cycle_status] || '活动'
}

const statusColor = computed(() => {
  const s = event.value?.life_cycle_status
  if (s === 'reserving' || isReserving.value) return 'status-red'
  if (s === 'active') return 'status-green'
  if (s === 'post_sale') return 'status-blue'
  return 'status-gray'
})
</script>

<style scoped>
.event-detail-container { max-width: 800px; margin: 0 auto; background: #f5f7fa; min-height: 100vh; font-family: 'Segoe UI', sans-serif; }
.loading-box { text-align: center; padding: 50px; }

/* Hero 区域 */
.hero-header { height: 300px; background-size: cover; background-position: center; position: relative; }
.hero-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.8)); display: flex; flex-direction: column; justify-content: space-between; padding: 20px; box-sizing: border-box; }

.top-bar { display: flex; justify-content: space-between; align-items: flex-start; }
.back-btn { background: rgba(0,0,0,0.3); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 6px 15px; border-radius: 20px; cursor: pointer; backdrop-filter: blur(4px); }
.btn-edit-float { background: rgba(255,255,255,0.9); color: #333; border: none; padding: 6px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: 0.2s; }
.btn-edit-float:hover { transform: scale(1.05); background: white; }

.action-buttons-right { display: flex; gap: 8px; }
.btn-icon-glass { background: rgba(0,0,0,0.4); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 6px 12px; border-radius: 20px; cursor: pointer; backdrop-filter: blur(4px); font-size: 13px; }

.header-content { color: white; margin-bottom: 10px; }
.status-badge-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
.status-pill { padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: bold; color: white; }
.status-red { background: #ff5252; box-shadow: 0 0 10px rgba(255, 82, 82, 0.5); }
.status-green { background: #4caf50; }
.status-blue { background: #2196f3; }
.status-gray { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); }
.tag.warn { background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }

.title { margin: 0; font-size: 28px; line-height: 1.3; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.sub-title { margin: 5px 0 15px 0; font-size: 14px; opacity: 0.8; font-weight: normal; }

.tags-wall { display: flex; flex-wrap: wrap; gap: 8px; }
.smart-tag { background: rgba(57, 197, 187, 0.2); border: 1px solid #39C5BB; color: #39C5BB; padding: 2px 10px; border-radius: 12px; font-size: 12px; backdrop-filter: blur(5px); color: white; border-color: rgba(255,255,255,0.5); }

/* 主体内容 */
.main-body { padding: 20px; transform: translateY(-40px); }

.info-card { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 25px; }
.time-block { display: flex; align-items: flex-start; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0; }
.time-block:last-child { border-bottom: none; margin-bottom: 0; }
.time-block.highlight { background: #fff5f5; margin: -10px -10px 20px -10px; padding: 15px; border-radius: 8px; border-bottom: none; border: 1px solid #ffcdd2; }

.block-icon { font-size: 24px; }
.block-content label { display: block; font-size: 12px; color: #888; margin-bottom: 4px; }
.time-text { font-size: 16px; font-weight: bold; color: #333; margin: 0; }
.countdown { color: #ff5252; font-weight: bold; font-size: 13px; margin-top: 5px; display: flex; align-items: center; gap: 5px; }

.action-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
.btn-action { display: block; text-align: center; padding: 12px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 14px; transition: 0.2s; border: none; cursor: pointer; width: 100%; box-sizing: border-box; }
.btn-action.primary { background: #333; color: white; }
.btn-action.shop { background: #FF9800; color: white; box-shadow: 0 4px 10px rgba(255, 152, 0, 0.3); }
.btn-action.wiki { background: #39C5BB; color: white; }
.btn-action:hover { transform: translateY(-2px); opacity: 0.9; }

.goods-hint-box { background: #e0f7fa; color: #006064; padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; text-align: center; border: 1px solid #b2ebf2; }

.desc-panel { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; }
.desc-panel h3 { margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0; color: #333; }
.desc-text { line-height: 1.8; color: #444; white-space: pre-wrap; font-size: 15px; }
.empty-state-text { text-align: center; padding: 40px; color: #999; background: #fafafa; border-radius: 8px; border: 1px dashed #ddd; }
.text-btn { background: none; border: none; color: #39C5BB; font-weight: bold; cursor: pointer; text-decoration: underline; margin-top: 5px; }

/* ✅ 新增：返图墙样式 */
.gallery-panel { margin-top: 20px; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.gallery-item { position: relative; border-radius: 8px; overflow: hidden; height: 150px; cursor: zoom-in; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.gallery-item:hover img { transform: scale(1.05); }
.gallery-caption { position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.6); color: white; font-size: 11px; padding: 4px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 弹窗样式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.modal-content { background: white; width: 90%; max-width: 600px; max-height: 90vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
.modal-header { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; color: #999; cursor: pointer; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }

.crawler-hint { background: #e3f2fd; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #2196f3; font-size: 0.9rem; color: #0d47a1; }
.crawler-hint p { margin: 5px 0; font-family: monospace; font-weight: bold; }

.form-section { margin-bottom: 25px; background: #fff; padding: 5px; }
.form-section h4 { margin: 0 0 15px 0; color: #39C5BB; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
.form-section.bg-gray { background: #f9f9f9; padding: 15px; border-radius: 8px; }

.form-group { margin-bottom: 15px; }
.form-group label { display: block; font-weight: bold; font-size: 13px; color: #555; margin-bottom: 6px; }
.form-row { display: flex; gap: 15px; }
.form-group.half { flex: 1; }
.hint-text { font-size: 13px; color: #666; margin-bottom: 15px; background: #fff3e0; padding: 10px; border-radius: 4px; border: 1px solid #ffe0b2; }
.preview-box { margin-bottom: 15px; text-align: center; background: #eee; padding: 10px; border-radius: 8px; }

input, textarea, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; box-sizing: border-box; }
input:focus, textarea:focus, select:focus { border-color: #39C5BB; outline: none; }
.full-width { width: 100%; }

.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
.check-box { background: #f0f0f0; padding: 6px 12px; border-radius: 20px; font-size: 13px; cursor: pointer; user-select: none; }
.check-box:has(input:checked) { background: #e0f2f1; color: #00695c; font-weight: bold; }

.modal-footer { padding: 15px 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px; background: #f9f9f9; border-radius: 0 0 12px 12px; }
.btn-cancel { padding: 10px 20px; border: none; background: #eee; border-radius: 6px; cursor: pointer; }
.btn-save { padding: 10px 25px; border: none; background: #39C5BB; color: white; border-radius: 6px; font-weight: bold; cursor: pointer; }

/* ✅ Lightbox 样式 */
.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 5000; display: flex; justify-content: center; align-items: center; }
.lightbox-img { max-width: 90vw; max-height: 90vh; border-radius: 4px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
.lightbox-close { position: absolute; top: 20px; right: 20px; background: none; border: 2px solid white; color: white; border-radius: 50%; width: 40px; height: 40px; font-size: 24px; cursor: pointer; opacity: 0.8; }
.lightbox-close:hover { opacity: 1; transform: scale(1.1); }
</style>