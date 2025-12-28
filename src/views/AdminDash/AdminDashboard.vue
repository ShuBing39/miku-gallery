<template>
  <div class="admin-container">
    <div class="floating-nav left">
      <button @click="$router.push('/')" title="返回首页">🏠</button>
      <button @click="$router.go(-1)" title="返回上一页">⬅</button>
    </div>
    <div class="floating-nav right">
      <button @click="scrollToTop" title="回到顶部">⬆</button>
    </div>

    <header class="admin-header">
      <div class="header-left">
        <h1>🎛️ 综合管理后台</h1>
        <div class="admin-tabs">
          <button v-for="tab in tabs" :key="tab.key" class="nav-tab" :class="{ active: currentTab === tab.key }" @click="switchTab(tab.key)">
            {{ tab.name }}
          </button>
        </div>
      </div>
      <div class="header-actions">
        <button v-if="currentTab === 'events'" @click="openCreateModal" class="create-btn">➕ 添加新活动 (标签)</button>
        <span class="admin-badge">👑 管理员</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <div v-show="currentTab === 'audit'" class="tab-content">
      <div class="audit-section">
        <div class="section-header"><h3>🚨 待审核周边 ({{ pendingItems.length }})</h3></div>
        <div class="audit-grid">
          <div v-for="item in pendingItems" :key="item.id" class="audit-card">
            <div class="img-box-wrapper">
              <img :src="item.image_url" class="audit-img" @click="openLightbox(item.image_url)" />
              <span class="mini-type-tag">{{ item.is_fan_work ? '同人' : '官方' }}</span>
            </div>
            <div class="audit-info">
              <h4 class="card-title" :title="item.name">{{ item.name }}</h4>
              <div class="audit-actions">
                <button @click="handleAudit('items', item.id, 'approved')" class="approve-btn">✅ 通过</button>
                <button @click="handleAudit('items', item.id, 'rejected')" class="reject-btn">❌ 驳回</button>
              </div>
            </div>
          </div>
          <div v-if="pendingItems.length === 0" class="empty-mini">暂无待审内容</div>
        </div>
      </div>
      <div class="toolbar"><button @click="loadAuditData" class="refresh-btn">🔄 刷新列表</button></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>ID</th><th>图</th><th>名称</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.id }}</td>
              <td><div class="mini-thumb-box"><img :src="item.image_url" class="mini-thumb"></div></td>
              <td class="name-col">{{ item.name }}</td>
              <td><span class="status-badge" :class="item.status">{{ item.status }}</span></td>
              <td><button @click="handleDelete('items', item.id)" class="del-btn">🗑️</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="currentTab === 'gallery'" class="tab-content">
      <div class="audit-section">
        <div class="section-header">
          <h3>📸 待审核返图 ({{ pendingGallery.length }})</h3>
          <button @click="loadGalleryData" class="refresh-btn">🔄 刷新</button>
        </div>
        <div class="audit-grid">
          <div v-for="img in pendingGallery" :key="img.id" class="audit-card" style="height: auto; flex-direction: column;">
            <div class="img-box-wrapper" style="width: 100%; height: 200px;">
              <img :src="img.image_url" class="audit-img" @click="openLightbox(img.image_url)">
            </div>
            <div class="audit-info" style="padding: 10px 0;">
              <div style="font-size: 12px; color: #666; margin-bottom: 5px;">
                关联: <a :href="`/items/${img.item_id}`" target="_blank" style="color: #39C5BB; font-weight: bold;">{{ img.items?.name || '未知词条' }} 🔗</a><br>
                用户: {{ img.profiles?.username || '未知' }}
              </div>
              <div v-if="img.caption" style="background:#f5f5f5; padding:5px; border-radius:4px; font-size:13px; margin-bottom:10px;">
                "{{ img.caption }}"
              </div>
              <div class="audit-actions">
                <button @click="handleAudit('item_user_images', img.id, 'approved')" class="approve-btn" style="flex:1">✅ 通过</button>
                <button @click="handleAudit('item_user_images', img.id, 'rejected')" class="reject-btn" style="flex:1">❌ 驳回</button>
              </div>
            </div>
          </div>
          <div v-if="pendingGallery.length === 0" class="empty-mini">暂无待审返图</div>
        </div>
      </div>
    </div>

    <div v-show="currentTab === 'revisions'" class="tab-content">
      <div class="section-header">
        <h3>🔧 纠错提交 ({{ pendingRevisions.length }})</h3>
        <button @click="loadRevisionsData" class="refresh-btn">🔄 刷新</button>
      </div>
      <div class="revisions-list">
        <div v-for="rev in pendingRevisions" :key="rev.id" class="revision-card">
          <div class="rev-header">
            <div class="rev-meta">
              <span class="rev-id">#{{ rev.id }}</span>
              <span>提交人: <strong>{{ rev.profiles?.username || '未知' }}</strong></span>
              <span>关联: <a :href="`/items/${rev.item_id}`" target="_blank" class="link-item">{{ rev.items?.name || rev.item_id }} 🔗</a></span>
            </div>
            <div class="rev-actions">
              <button @click="handleApproveRevision(rev)" class="approve-btn">✅ 批准</button>
              <button @click="handleRejectRevision(rev)" class="reject-btn">❌ 忽略</button>
            </div>
          </div>
          <div class="rev-body">
            <div class="rev-comment"><strong>💬 备注:</strong> {{ rev.comment || '无' }}</div>
            <div class="rev-diff-table">
              <div v-for="change in getDiff(rev)" :key="change.key" class="diff-row">
                <div class="diff-label">{{ change.label }}</div>
                <div class="diff-old"><span class="badge old">旧</span> {{ change.oldVal }}</div>
                <div class="diff-arrow">➡</div>
                <div class="diff-new"><span class="badge new">新</span> {{ change.newVal }}</div>
              </div>
              <div v-if="getDiff(rev).length === 0" class="no-change-hint">⚠️ 无实质修改</div>
            </div>
          </div>
        </div>
        <div v-if="pendingRevisions.length === 0" class="empty-mini">暂无待审纠错</div>
      </div>
    </div>

    <div v-show="currentTab === 'kyc'" class="tab-content">
      <div class="section-header">
        <h3>🛡️ 待审核身份 ({{ pendingKycs.length }})</h3>
        <button @click="loadKycData" class="refresh-btn">🔄 刷新</button>
      </div>
      <div class="kyc-list">
        <div v-for="k in pendingKycs" :key="k.id" class="kyc-row">
          <div class="k-info">
            <div class="k-header">
              <span class="k-name">{{ k.real_name }}</span>
              <span class="k-age" :class="{minor: k.is_minor}">{{ k.is_minor ? '🔞 未成年' : '✅ 成年' }}</span>
              <span class="k-id">{{ k.id_number }}</span>
            </div>
            <div class="k-imgs">
              <div class="k-img-box" v-if="k.id_photos?.front"><span>正面</span><img :src="k.id_photos.front" @click="openLightbox(k.id_photos.front)"></div>
              <div class="k-img-box" v-if="k.id_photos?.back"><span>反面</span><img :src="k.id_photos.back" @click="openLightbox(k.id_photos.back)"></div>
              <div class="k-img-box" v-if="k.id_photos?.handheld"><span>手持</span><img :src="k.id_photos.handheld" @click="openLightbox(k.id_photos.handheld)"></div>
            </div>
          </div>
          <div class="k-actions">
            <button @click="processKYC(k, 'approved')" class="approve-btn large">通过</button>
            <button @click="processKYC(k, 'rejected')" class="reject-btn large">驳回</button>
          </div>
        </div>
        <div v-if="pendingKycs.length === 0" class="empty-mini">暂无待审核申请</div>
      </div>
    </div>

    <div v-show="currentTab === 'events'" class="tab-content">
      
      <div class="audit-section project-audit">
        <div class="section-header" style="background:#fff3e0; border-color:#ffe0b2;">
          <h3 style="color:#e65100;">📢 同人企划审核 (用户投稿)</h3>
          <span style="font-size:12px; color:#ef6c00; margin-left:10px;">处理用户发起的招募/应援</span>
        </div>
        <div class="audit-grid">
          <div v-for="p in pendingProjects" :key="p.id" class="audit-card project-style">
            <div class="img-box-wrapper">
              <img :src="p.image_url" class="audit-img" @click="openLightbox(p.image_url)">
              <span class="mini-type-tag project-tag">企划</span>
            </div>
            <div class="audit-info">
              <h4 class="card-title">{{ p.name }}</h4>
              <p class="sub-text">状态: {{ p.recruit_status }}</p>
              <div class="audit-actions">
                <button @click="openProjectEdit(p)" class="edit-btn">✏️ 审核</button>
                <button @click="handleDelete('projects', p.id)" class="reject-btn">🗑️</button>
              </div>
            </div>
          </div>
          <div v-if="pendingProjects.length === 0" class="empty-mini">暂无待审企划</div>
        </div>
      </div>

      <div class="section-header" style="margin-top: 40px; background:#e0f2f1; border-color:#b2ebf2; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="color:#00695c;">🏢 官方活动库 (标签源)</h3>
          <p style="font-size:12px; color:#00796b; margin:0;">
            这里管理的活动会自动出现在前台“一键投递”的下拉框中。
          </p>
        </div>
        <button @click="loadEventData" class="refresh-btn">🔄 刷新</button>
      </div>
      
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th style="width: 150px;">中文简称</th>
              <th style="min-width: 250px;">官方全名</th>
              <th style="width: 100px;">开始日期</th>
              <th style="width: 140px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in eventList" :key="ev.id">
              <td>{{ ev.id }}</td>
              <td style="font-weight:bold; color:#39C5BB;">
                {{ ev.localized_title || '(未填)' }}
              </td>
              <td class="name-col-full">
                <div style="display:flex; align-items:flex-start; gap:5px;">
                  <span>{{ ev.name }}</span>
                  <a :href="`https://www.google.com/search?q=${ev.name}`" target="_blank" title="Google 搜索" style="text-decoration:none; font-size:14px;">🔎</a>
                </div>
              </td>
              <td>{{ ev.start_date || '未设置' }}</td>
              <td>
                <button @click="openEventEdit(ev)" class="edit-btn" style="margin-right:5px;">✏️ 编辑</button>
                <button @click="handleDeleteOfficialEvent(ev.id)" class="del-btn">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="currentTab === 'invites'" class="tab-content">
      <div class="invite-header-box">
        <div class="left-box"><h2>🔑 邀请码管理</h2></div>
        <div class="right-actions btn-group">
          <button @click="handleGenCode(1)" class="gen-btn">✨ 单次码</button>
          <button @click="handleGenCode(10)" class="gen-btn multi">🔥 10次码</button>
          <button @click="handleGenCode(100)" class="gen-btn infinity">♾️ 100次码</button>
        </div>
      </div>
      <div class="invite-grid">
        <div v-for="code in inviteCodes" :key="code.id" class="invite-card" :class="{ exhausted: code.remaining <= 0 }">
          <div class="code-main">
            <span class="code-text">{{ code.code }}</span>
            <button @click="handleDelete('invite_codes', code.id)" class="btn-del-mini">✕</button>
          </div>
          <div class="code-meta">
            <span>总: {{ code.max_uses }}</span>
            <span :class="{ 'red-text': code.remaining <= 0 }">余: {{ code.remaining }}</span>
          </div>
          <div class="progress-bar"><div class="fill" :style="{ width: ((code.used_count || 0) / code.max_uses * 100) + '%' }"></div></div>
        </div>
      </div>
    </div>

    <div v-show="currentTab === 'wiki_seed'" class="tab-content">
      <div class="invite-header-box"><h2>📖 百科补全预览</h2></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>名称</th><th>分类</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="seed in seedCandidates" :key="seed.id">
              <td>{{ seed.name }}</td><td>{{ seed.category }}</td>
              <td><button class="gen-btn small" disabled>仅预览</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="currentTab === 'tickets'" class="tab-content"><p style="padding:20px; color:#666;">(票务审核暂略)</p></div>
    
    <div v-show="currentTab === 'banner'" class="tab-content">
      <div class="invite-header-box">
        <h2>🖼️ 轮播图管理</h2>
        <button class="gen-btn" @click="showBannerModal = true">+ 上传</button>
      </div>
      <div class="banner-grid">
        <div v-for="b in banners" :key="b.id" class="banner-card">
          <img :src="b.image_url" class="b-img">
          <button @click="handleDelete('home_banners', b.id)" class="del-invite-btn top-right">✕</button>
        </div>
      </div>
    </div>

    <div v-if="showProjectEdit" class="modal-overlay">
      <div class="modal-content">
        <h3>✏️ 修改同人企划</h3>
        <div class="form-row"><label>标题</label><input v-model="editProjectForm.name" class="std-input"></div>
        <div class="form-row"><label>状态</label>
          <select v-model="editProjectForm.recruit_status" class="std-input">
            <option value="recruiting">正在招募</option>
            <option value="ongoing">进行中</option>
            <option value="paused">暂停</option>
            <option value="ended">已结束</option>
          </select>
        </div>
        <div class="modal-actions">
          <button @click="showProjectEdit = false">取消</button>
          <button @click="confirmProjectEdit" class="approve-btn">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showEventEdit" class="modal-overlay">
      <div class="modal-content">
        <h3>✏️ 编辑官方活动标签</h3>
        <div class="form-row">
          <label>中文简称 (前台下拉框显示)</label>
          <input v-model="editEventForm.localized_title" class="std-input">
        </div>
        <div class="form-row">
          <label>官方全名</label>
          <input v-model="editEventForm.name" class="std-input">
        </div>
        <div class="form-row">
          <label>开始日期 (start_date)</label>
          <input type="date" v-model="editEventForm.start_date" class="std-input">
        </div>
        <div class="form-row">
          <label>结束日期 (end_date)</label>
          <input type="date" v-model="editEventForm.end_date" class="std-input">
        </div>
        <div class="modal-actions">
          <button @click="showEventEdit = false">取消</button>
          <button @click="confirmEventEdit" class="approve-btn">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal-content">
        <h3 style="color:#00695c;">➕ 添加官方活动标签</h3>
        <p style="font-size:12px; color:#666; margin-bottom:15px; background:#e0f2f1; padding:8px; border-radius:4px;">
          这里添加的是<b>“events”表</b>的数据，专门用于同人周边投递时的“活动来源”选项。
        </p>
        
        <div class="form-row">
          <label>中文简称 (下拉框显示) *</label>
          <input v-model="createForm.localized_title" placeholder="例如：未来有你2025" class="std-input">
        </div>

        <div class="form-row">
          <label>官方全名/原名 *</label>
          <input v-model="createForm.name" placeholder="例如：MIKU WITH YOU 2025" class="std-input">
        </div>

        <div class="form-row">
          <div style="display:flex; gap:10px;">
            <div style="flex:1">
              <label>开始日期 *</label>
              <input type="date" v-model="createForm.start_date" class="std-input">
            </div>
            <div style="flex:1">
              <label>结束日期</label>
              <input type="date" v-model="createForm.end_date" class="std-input">
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showCreateModal = false">取消</button>
          <button @click="submitCreateEvent" class="approve-btn" :disabled="creating">
            {{ creating ? '添加中...' : '确认添加' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showBannerModal" class="modal-overlay">
      <div class="modal-content">
        <h3>上传海报</h3>
        <input type="file" @change="handleBannerFile" class="std-input">
        <input v-model="newBanner.title" placeholder="标题" class="std-input" style="margin-top:10px;">
        <input v-model="newBanner.link_url" placeholder="跳转链接" class="std-input" style="margin-top:10px;">
        <input v-model="newBanner.sort_order" type="number" placeholder="权重" class="std-input" style="margin-top:10px;">
        <div class="modal-actions">
          <button @click="showBannerModal = false">取消</button>
          <button @click="submitBanner" class="approve-btn">发布</button>
        </div>
      </div>
    </div>

    <transition name="fade"><div v-if="showLightbox" class="lightbox-overlay" @click="showLightbox=false"><img :src="lightboxImage" class="lightbox-img"></div></transition>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import { uploadImage } from '../../services/storage'
import * as api from '../../services/adminData'
import { auditVerification } from '../../services/authService'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const tabs = [
  { key: 'audit', name: '📦 周边审核' },
  { key: 'gallery', name: '📸 返图审核' }, 
  { key: 'revisions', name: '🔧 纠错' }, 
  { key: 'kyc', name: '🛡️ 实名审核' }, 
  { key: 'events', name: '📅 活动管理' },
  { key: 'invites', name: '🔑 邀请码' },
  { key: 'wiki_seed', name: '📖 百科补全' },
  { key: 'tickets', name: '🎫 票务' },
  { key: 'banner', name: '🖼️ 轮播图' }
]
const currentTab = ref(route.query.tab || 'audit')

const pendingItems = ref([])
const items = ref([])
const pendingProjects = ref([])
const eventList = ref([]) 
const seedCandidates = ref([])
const inviteCodes = ref([])
const banners = ref([])
const pendingKycs = ref([]) 
const pendingGallery = ref([])
const pendingRevisions = ref([]) 

const showLightbox = ref(false)
const lightboxImage = ref('')

const showProjectEdit = ref(false)
const editProjectForm = ref({})

// ✅ 编辑官方活动 (Events) 状态
const showEventEdit = ref(false)
const editEventForm = ref({})

// ✅ 发布新官方活动 (Events) 状态
const showCreateModal = ref(false)
const creating = ref(false)
const createForm = reactive({
  name: '',
  localized_title: '',
  start_date: '',
  end_date: ''
})

const showBannerModal = ref(false)
const newBanner = ref({})
const bannerFile = ref(null)

onMounted(() => loadAllData())
watch(currentTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } })
  loadAllData()
})

const switchTab = (key) => currentTab.value = key
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
const handleLogout = async () => { await userStore.logout(); router.push('/login') }
const openLightbox = (url) => { lightboxImage.value = url; showLightbox.value = true }

const loadAllData = () => {
  if(currentTab.value === 'audit') loadAuditData()
  if(currentTab.value === 'gallery') loadGalleryData()
  if(currentTab.value === 'revisions') loadRevisionsData() 
  if(currentTab.value === 'kyc') loadKycData() 
  if(currentTab.value === 'events') loadEventData() // ✅ 这里现在会调用 getOfficialEvents
  if(currentTab.value === 'invites') loadInviteData()
  if(currentTab.value === 'wiki_seed') loadWikiData()
  if(currentTab.value === 'banner') loadBannerData()
}

const loadRevisionsData = async () => {
  pendingRevisions.value = await api.getPendingWikiRevisions()
}

const getDiff = (rev) => {
  const oldItem = rev.items || {}
  const newItem = rev.new_data || {}
  const changes = []
  // ... (简化对比逻辑，与之前一致)
  for (const key in newItem) {
    if (newItem[key] != oldItem[key]) {
      changes.push({ key: key, label: key, oldVal: oldItem[key], newVal: newItem[key] })
    }
  }
  return changes
}

const handleApproveRevision = async (rev) => {
  if (!confirm('确认批准？')) return
  try {
    await api.approveWikiRevision(rev)
    alert('✅ 批准成功！')
    loadRevisionsData()
  } catch (e) {
    alert('❌ 失败: ' + e.message)
  }
}

const handleRejectRevision = async (rev) => {
  if (!confirm('确认驳回？')) return
  try {
    await api.rejectWikiRevision(rev.id)
    loadRevisionsData()
  } catch (e) {
    alert('❌ 失败: ' + e.message)
  }
}

const loadAuditData = async () => { pendingItems.value = await api.getPendingItems(); items.value = await api.getItems() }
const loadGalleryData = async () => { pendingGallery.value = await api.getPendingUserImages() }

// ✅ 这里加载的是 pendingProjects (同人企划) 和 eventList (官方 events 表)
const loadEventData = async () => { 
  pendingProjects.value = await api.getPendingProjects(); 
  eventList.value = await api.getOfficialEvents(); // ✅ 改为读取 events 表
}

const loadInviteData = async () => { inviteCodes.value = await api.getInviteCodes() }
const loadWikiData = async () => { seedCandidates.value = await api.getWikiSeeds() }
const loadBannerData = async () => { banners.value = await api.getBanners() }
const loadKycData = async () => { pendingKycs.value = await api.getPendingUserKYC() } 

const handleAudit = async (table, id, status) => { if(confirm('确认操作?')) { await api.auditRecord(table, id, status); loadAllData() } }
const handleDelete = async (table, id) => { if(confirm('确认删除? ⚠️此操作不可逆')) { await api.deleteRecord(table, id); loadAllData() } }
const handleGenCode = async (count) => { await api.createInviteCode(count); loadInviteData() }

// ✅ 新增：删除官方活动
const handleDeleteOfficialEvent = async (id) => {
  if (confirm('确认删除此活动标签？这将影响所有关联了此活动的周边！')) {
    try {
      await api.deleteOfficialEvent(id)
      loadEventData()
    } catch (e) {
      alert('删除失败: ' + e.message)
    }
  }
}

const processKYC = async (kyc, status) => { /* ... (保持不变) */ }

// 同人企划编辑
const openProjectEdit = (p) => { editProjectForm.value = { ...p }; showProjectEdit.value = true }
const confirmProjectEdit = async () => {
  try {
    await api.updateProjectInfo(editProjectForm.value.id, { name: editProjectForm.value.name, recruit_status: editProjectForm.value.recruit_status })
    alert('修改成功'); showProjectEdit.value = false; loadEventData()
  } catch(e) { alert('失败:'+e.message) }
}

// ✅ 官方活动编辑 (Events)
const openEventEdit = (ev) => { editEventForm.value = { ...ev }; showEventEdit.value = true }
const confirmEventEdit = async () => {
  try {
    await api.updateOfficialEvent(editEventForm.value.id, {
      name: editEventForm.value.name,
      localized_title: editEventForm.value.localized_title,
      start_date: editEventForm.value.start_date,
      end_date: editEventForm.value.end_date
    })
    alert('修改成功'); showEventEdit.value = false; loadEventData()
  } catch(e) { alert('失败:'+e.message) }
}

// ✅ 发布新官方活动 (Events)
const openCreateModal = () => {
  Object.assign(createForm, { name: '', localized_title: '', start_date: '', end_date: '' })
  showCreateModal.value = true
}

const submitCreateEvent = async () => {
  if (!createForm.name) return alert('请填写官方全名')
  if (!createForm.localized_title) return alert('请填写中文简称')
  
  creating.value = true
  try {
    await api.createOfficialEvent({
      name: createForm.name,
      localized_title: createForm.localized_title,
      start_date: createForm.start_date || null,
      end_date: createForm.end_date || null
    })
    alert('✅ 活动标签添加成功！')
    showCreateModal.value = false; loadEventData()
  } catch (e) {
    alert('❌ 添加失败: ' + e.message)
  } finally {
    creating.value = false
  }
}

const handleBannerFile = (e) => bannerFile.value = e.target.files[0]
const submitBanner = async () => { /* ... (保持不变) */ }
</script>

<style scoped>
/* 保持原有基础样式 */
.admin-container { padding: 20px; font-family: sans-serif; background: #f9f9f9; min-height: 100vh; }
.admin-header { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.admin-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.nav-tab { padding: 8px 16px; border: none; background: #f0f2f5; border-radius: 6px; cursor: pointer; font-weight: bold; color: #666; transition: 0.2s; }
.nav-tab.active { background: #39C5BB; color: white; }
.admin-badge { background: #673ab7; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px; }

/* ✅ 发布按钮样式 */
.create-btn { background: #4caf50; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
.create-btn:hover { background: #43a047; transform: translateY(-1px); }

.audit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
.audit-card { background: white; border: 1px solid #ddd; border-radius: 8px; display: flex; overflow: hidden; padding: 10px; gap: 12px; height: 110px; }
.img-box-wrapper { width: 90px; height: 90px; flex-shrink: 0; position: relative; background: #f0f0f0; border-radius: 6px; overflow: hidden; }
.audit-img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: zoom-in; }
.mini-thumb-box { width: 40px; height: 40px; border-radius: 4px; overflow: hidden; background: #eee; }
.mini-thumb { width: 100%; height: 100%; object-fit: cover; }
.mini-type-tag { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 10px; text-align: center; padding: 2px 0; }
.audit-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
.card-title { margin: 0 0 5px 0; font-size: 14px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: bold; }
.approve-btn { background: #4caf50; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px; }
.reject-btn { background: #f44336; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.edit-btn { background: #2196f3; color: white; padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px; }

/* KYC 列表样式 */
.kyc-list { display: flex; flex-direction: column; gap: 15px; }
.kyc-row { background: white; padding: 20px; border-radius: 8px; border: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start; }
.k-info { display: flex; flex-direction: column; gap: 10px; flex: 1; }
.k-header { display: flex; align-items: center; gap: 12px; }
.k-name { font-weight: bold; font-size: 18px; color: #333; }
.k-age { font-size: 12px; padding: 2px 8px; border-radius: 4px; background: #e8f5e9; color: #2e7d32; font-weight: bold; }
.k-age.minor { background: #ffebee; color: #c62828; }
.k-id { font-family: monospace; color: #666; letter-spacing: 1px; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
.k-imgs { display: flex; gap: 15px; margin-top: 5px; }
.k-img-box { display: flex; flex-direction: column; align-items: center; gap: 5px; font-size: 12px; color: #888; }
.k-img-box img { width: 100px; height: 65px; object-fit: cover; border: 1px solid #ddd; border-radius: 6px; cursor: zoom-in; transition: 0.2s; }
.k-img-box img:hover { transform: scale(1.05); border-color: #39C5BB; }
.k-actions { display: flex; flex-direction: column; gap: 8px; min-width: 100px; }
.approve-btn.large { padding: 10px 20px; font-size: 14px; width: 100%; }
.reject-btn.large { padding: 10px 20px; font-size: 14px; width: 100%; }

.invite-header-box { display: flex; justify-content: space-between; background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; align-items: center; }
.btn-group { display: flex; gap: 10px; }
.gen-btn { padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer; background: #e0f2f1; color: #00695c; font-weight: bold; }
.gen-btn.multi { background: #fff3e0; color: #ef6c00; }
.gen-btn.infinity { background: #f3e5f5; color: #7b1fa2; }
.invite-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
.invite-card { background: white; padding: 12px; border-radius: 8px; border: 1px solid #eee; overflow: hidden; }
.invite-card.exhausted { opacity: 0.6; background: #f5f5f5; }
.code-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.code-text { font-family: monospace; font-size: 16px; font-weight: bold; color: #333; }
.btn-del-mini { background: #ffcdd2; color: #c62828; border: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 10px; }
.code-meta { display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-bottom: 5px; }
.red-text { color: #f44336; font-weight: bold; }
.progress-bar { height: 4px; background: #eee; border-radius: 2px; overflow: hidden; }
.fill { height: 100%; background: #39C5BB; transition: width 0.3s; }

.project-style { background: #fdfdfd; }
.sub-text { font-size: 12px; color: #999; margin: 0 0 5px; }
.banner-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.banner-card { position: relative; height: 100px; border-radius: 8px; overflow: hidden; }
.b-img { width: 100%; height: 100%; object-fit: cover; }
.del-invite-btn { position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: white; border: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 30px; border-radius: 12px; width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.form-row { margin-bottom: 15px; }
.form-row label { display: block; font-weight: bold; margin-bottom: 5px; color: #555; }
.std-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.modal-actions button { padding: 8px 20px; border-radius: 6px; border: 1px solid #ddd; cursor: pointer; background: white; }
.modal-actions .approve-btn { background: #39C5BB; color: white; border: none; }
.name-col { max-width: 150px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
/* ✅ 重点修改：活动管理表格，允许全名换行显示，不再省略 */
.name-col-full { max-width: 300px; white-space: normal; line-height: 1.4; word-break: break-all; }

.empty-mini { color: #999; text-align: center; padding: 20px; grid-column: 1/-1; }
.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.lightbox-img { max-height: 90vh; max-width: 90vw; }
.del-btn { color: red; border: 1px solid #ffcdd2; background: white; padding: 2px 8px; border-radius: 4px; cursor: pointer; }

/* 纠错对比样式 */
.revisions-list { display: flex; flex-direction: column; gap: 15px; }
.revision-card { background: white; border-radius: 8px; border: 1px solid #eee; overflow: hidden; }
.rev-header { background: #f9f9f9; padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.rev-meta { display: flex; gap: 15px; font-size: 13px; color: #666; align-items: center; }
.rev-id { background: #673ab7; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.link-item { color: #39C5BB; font-weight: bold; text-decoration: none; }
.rev-body { padding: 15px; }
.rev-comment { background: #e3f2fd; padding: 8px; border-radius: 4px; font-size: 13px; color: #0d47a1; margin-bottom: 15px; border-left: 3px solid #2196f3; }
.rev-diff-table { border: 1px solid #eee; border-radius: 6px; overflow: hidden; }
.diff-row { display: flex; align-items: center; border-bottom: 1px solid #eee; font-size: 13px; padding: 8px; }
.diff-row:last-child { border-bottom: none; }
.diff-label { width: 100px; font-weight: bold; color: #555; }
.diff-old { flex: 1; color: #999; text-decoration: line-through; padding: 0 10px; display: flex; align-items: center; gap: 5px; }
.diff-new { flex: 1; color: #2e7d32; font-weight: bold; padding: 0 10px; display: flex; align-items: center; gap: 5px; }
.diff-arrow { color: #ccc; margin: 0 5px; }
.badge { font-size: 10px; padding: 1px 4px; border-radius: 3px; }
.badge.old { background: #eee; color: #666; }
.badge.new { background: #e8f5e9; color: #2e7d32; }
.no-change-hint { text-align: center; padding: 10px; color: #999; font-style: italic; }
</style>