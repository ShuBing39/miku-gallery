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

    <div v-show="currentTab === 'events'" class="tab-content">
      <div class="audit-section project-audit">
        <div class="section-header"><h3>📢 企划管理 ({{ pendingProjects.length }})</h3></div>
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
                <button @click="openProjectEdit(p)" class="edit-btn">✏️ 修改</button>
                <button @click="handleDelete('projects', p.id)" class="reject-btn">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-header" style="margin-top: 30px;"><h3>📅 官方活动列表</h3></div>
      <div class="toolbar"><button @click="loadEventData" class="refresh-btn">🔄 刷新列表</button></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>ID</th><th>活动名称</th><th>开始日期</th><th>结束日期</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="ev in eventList" :key="ev.id">
              <td>{{ ev.id }}</td>
              <td class="name-col" :title="ev.name">{{ ev.name }}</td>
              <td>{{ ev.release_date || '未设置' }}</td>
              <td>{{ ev.event_end_date || '未设置' }}</td>
              <td>
                <button @click="openItemEdit(ev)" class="edit-btn" style="margin-right:5px;">✏️ 编辑</button>
                <button @click="handleDelete('items', ev.id)" class="del-btn">🗑️</button>
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
            <span>总计: {{ code.max_uses }}</span>
            <span :class="{ 'red-text': code.remaining <= 0 }">剩余: {{ code.remaining }}</span>
          </div>
          <div class="progress-bar"><div class="fill" :style="{ width: ((code.used_count || 0) / code.max_uses * 100) + '%' }"></div></div>
        </div>
      </div>
    </div>

    <div v-show="currentTab === 'wiki_seed'" class="tab-content">
      <div class="invite-header-box">
        <div class="left-box"><h2>📖 百科补全预览</h2></div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>周边名称</th><th>分类</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="seed in seedCandidates" :key="seed.id">
              <td>{{ seed.name }}</td><td>{{ seed.category }}</td>
              <td><button class="gen-btn small" disabled>仅预览</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="currentTab === 'tickets'" class="tab-content">
      <p style="padding:20px; color:#666;">(票务审核暂未启用)</p>
    </div>
    
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
        <h3>✏️ 修改企划</h3>
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

    <div v-if="showItemEdit" class="modal-overlay">
      <div class="modal-content">
        <h3>✏️ 编辑活动情报</h3>
        <div class="form-row"><label>活动名称 (本地化标题)</label><input v-model="editItemForm.name" class="std-input"></div>
        <div class="form-row"><label>开始日期</label><input type="date" v-model="editItemForm.release_date" class="std-input"></div>
        <div class="form-row"><label>结束日期</label><input type="date" v-model="editItemForm.event_end_date" class="std-input"></div>
        <div class="form-row"><label>详细介绍 (本地化翻译)</label><textarea v-model="editItemForm.description" rows="5" class="std-input"></textarea></div>
        <div class="modal-actions">
          <button @click="showItemEdit = false">取消</button>
          <button @click="confirmItemEdit" class="approve-btn">保存</button>
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
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { uploadImage } from '../services/storage'
import * as api from '../services/adminData'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const tabs = [
  { key: 'audit', name: '📦 周边审核' },
  { key: 'events', name: '📅 活动企划' },
  { key: 'invites', name: '🔑 邀请码' },
  { key: 'wiki_seed', name: '📖 百科补全' },
  { key: 'tickets', name: '🎫 票务' },
  { key: 'banner', name: '🖼️ 轮播图' }
]
const currentTab = ref(route.query.tab || 'audit')

const pendingItems = ref([])
const items = ref([])
const pendingProjects = ref([])
const eventList = ref([]) // 官方活动列表
const seedCandidates = ref([])
const inviteCodes = ref([])
const banners = ref([])
const pendingTickets = ref([])

const showLightbox = ref(false)
const lightboxImage = ref('')

// 编辑表单
const showProjectEdit = ref(false)
const editProjectForm = ref({})
const showItemEdit = ref(false)
const editItemForm = ref({})

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
  if(currentTab.value === 'events') loadEventData()
  if(currentTab.value === 'invites') loadInviteData()
  if(currentTab.value === 'wiki_seed') loadWikiData()
  if(currentTab.value === 'banner') loadBannerData()
}

const loadAuditData = async () => { pendingItems.value = await api.getPendingItems(); items.value = await api.getItems() }
const loadEventData = async () => { 
  pendingProjects.value = await api.getPendingProjects() 
  eventList.value = await api.getEvents() // 加载活动列表
}
const loadInviteData = async () => { inviteCodes.value = await api.getInviteCodes() }
const loadWikiData = async () => { seedCandidates.value = await api.getWikiSeeds() }
const loadBannerData = async () => { banners.value = await api.getBanners() }

const handleAudit = async (table, id, status) => { if(confirm('确认操作?')) { await api.auditRecord(table, id, status); loadAllData() } }
const handleDelete = async (table, id) => { if(confirm('确认删除? ⚠️此操作不可逆')) { await api.deleteRecord(table, id); loadAllData() } }
const handleGenCode = async (count) => { await api.createInviteCode(count); loadInviteData() }

// 企划编辑
const openProjectEdit = (p) => { editProjectForm.value = { ...p }; showProjectEdit.value = true }
const confirmProjectEdit = async () => {
  try {
    await api.updateProjectInfo(editProjectForm.value.id, {
      name: editProjectForm.value.name,
      recruit_status: editProjectForm.value.recruit_status
    })
    alert('修改成功'); showProjectEdit.value = false; loadEventData()
  } catch(e) { alert('失败:'+e.message) }
}

// 活动/Item 编辑 (新增)
const openItemEdit = (item) => { editItemForm.value = { ...item }; showItemEdit.value = true }
const confirmItemEdit = async () => {
  try {
    await api.updateItem(editItemForm.value.id, {
      name: editItemForm.value.name,
      release_date: editItemForm.value.release_date,
      event_end_date: editItemForm.value.event_end_date,
      description: editItemForm.value.description
    })
    alert('修改成功'); showItemEdit.value = false; loadEventData()
  } catch(e) { alert('失败:'+e.message) }
}

const handleBannerFile = (e) => bannerFile.value = e.target.files[0]
const submitBanner = async () => {
  if(!bannerFile.value) return alert('请选图')
  const url = await uploadImage('user_uploads', 'banners', bannerFile.value)
  await api.createBanner({ ...newBanner.value, image_url: url })
  showBannerModal.value = false; loadBannerData()
}
</script>

<style scoped>
/* 保持所有原有样式，直接复用 */
.admin-container { padding: 20px; font-family: sans-serif; background: #f9f9f9; min-height: 100vh; }
.admin-header { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.admin-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
.nav-tab { padding: 8px 16px; border: none; background: #f0f2f5; border-radius: 6px; cursor: pointer; font-weight: bold; color: #666; transition: 0.2s; }
.nav-tab.active { background: #39C5BB; color: white; }
.admin-badge { background: #673ab7; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px; }

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
.empty-mini { color: #999; text-align: center; padding: 20px; grid-column: 1/-1; }
.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.lightbox-img { max-height: 90vh; max-width: 90vw; }
.del-btn { color: red; border: 1px solid #ffcdd2; background: white; padding: 2px 8px; border-radius: 4px; cursor: pointer; }
</style>