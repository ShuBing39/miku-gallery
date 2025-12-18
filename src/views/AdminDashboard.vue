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
        <span class="user-email">{{ userStore.user?.email }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <div v-show="currentTab === 'audit'" class="tab-content">
      <div class="audit-section">
        <div class="section-header"><h3>🚨 待审核周边 ({{ pendingItems.length }})</h3></div>
        <div class="audit-grid">
          <div v-for="item in pendingItems" :key="item.id" class="audit-card">
            <div class="img-box-wrapper"><img :src="item.image_url" class="audit-img" @click="openLightbox(item.image_url)" /><span class="mini-type-tag">{{ item.is_fan_work ? '同人' : '官方' }}</span></div>
            <div class="audit-info">
              <h4 class="card-title">#{{ item.id }} {{ item.name }}</h4>
              <div class="audit-actions">
                <button @click="handleAudit('items', item.id, 'approved')" class="approve-btn">✅ 通过</button>
                <button @click="handleAudit('items', item.id, 'rejected')" class="reject-btn">❌ 驳回</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="toolbar"><button @click="loadAuditData" class="refresh-btn">🔄 刷新列表</button></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>ID</th><th>图</th><th>名称</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.id }}</td>
              <td><img :src="item.image_url" class="mini-thumb"></td>
              <td>{{ item.name }}</td>
              <td><span class="status-badge" :class="item.status">{{ item.status }}</span></td>
              <td><button @click="handleDelete('items', item.id)" class="del-btn">🗑️</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="currentTab === 'events'" class="tab-content">
      <div v-if="pendingProjects.length > 0" class="audit-section project-audit">
        <div class="section-header"><h3>📢 待审核企划 ({{ pendingProjects.length }})</h3></div>
        <div class="audit-grid">
          <div v-for="p in pendingProjects" :key="p.id" class="audit-card project-style">
            <div class="img-box-wrapper"><img :src="p.image_url" class="audit-img" @click="openLightbox(p.image_url)"><span class="mini-type-tag project-tag">企划</span></div>
            <div class="audit-info"><h4 class="card-title">{{ p.name }}</h4><div class="audit-actions"><button @click="handleAudit('items', p.id, 'approved', true)" class="approve-btn">✅</button><button @click="handleAudit('items', p.id, 'rejected', true)" class="reject-btn">❌</button></div></div>
          </div>
        </div>
      </div>
      <div class="toolbar"><button @click="loadEventData" class="refresh-btn">🔄 刷新列表</button></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>活动名</th><th>日期</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="ev in eventList" :key="ev.id">
              <td>{{ ev.name }}</td><td>{{ ev.release_date }}</td><td><button @click="handleDelete('items', ev.id, true)" class="del-btn">🗑️</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="currentTab === 'tickets'" class="tab-content">
      <div class="audit-section ticket-audit">
        <div class="section-header"><h3>🛡️ 买家资质 ({{ pendingVerifications.length }})</h3></div>
        <div class="audit-grid">
          <div v-for="v in pendingVerifications" :key="v.id" class="audit-card wide">
            <div class="audit-info">
              <p>用户: {{ v.user_id.slice(0,6) }}... | 姓名: {{ v.real_name }}</p>
              <div class="proof-imgs"><img v-for="img in v.travel_proofs" :key="img" :src="img" class="proof-thumb" @click="openLightbox(img)"></div>
              <div class="audit-actions"><button @click="handleAudit('buyer_verifications', v.id, 'approved')" class="approve-btn">✅ 合格</button><button @click="handleAudit('buyer_verifications', v.id, 'rejected')" class="reject-btn">❌ 驳回</button></div>
            </div>
          </div>
        </div>
        <div v-if="pendingVerifications.length===0" class="empty-mini">暂无待审资质</div>
      </div>
      <div class="audit-section ticket-audit">
        <div class="section-header"><h3>🎫 待审门票 ({{ pendingTickets.length }})</h3></div>
        <div class="audit-grid">
          <div v-for="t in pendingTickets" :key="t.id" class="audit-card wide">
            <div class="audit-info">
              <p>{{ t.event_name }} [{{ t.seat_type }}] ¥{{ t.price }}</p>
              <div class="proof-imgs"><img v-for="img in t.proof_images" :key="img" :src="img" class="proof-thumb" @click="openLightbox(img)"></div>
              <div class="audit-actions"><button @click="handleAudit('tickets', t.id, 'active')" class="approve-btn">✅ 上架</button><button @click="handleAudit('tickets', t.id, 'rejected')" class="reject-btn">❌ 驳回</button></div>
            </div>
          </div>
        </div>
        <div v-if="pendingTickets.length===0" class="empty-mini">暂无待审门票</div>
      </div>
    </div>

    <div v-show="currentTab === 'wiki_seed'" class="tab-content">
      <div class="invite-header-box"><div class="left-box"><h2>📖 百科补全</h2></div><div class="right-actions"><button class="gen-btn" @click="$router.push('/encyclopedia/edit')">➕ 手动新建</button></div></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>周边名称</th><th>分类</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="seed in seedCandidates" :key="seed.id">
              <td>{{ seed.name }}</td><td>{{ seed.category }}</td>
              <td><button @click="$router.push(`/encyclopedia/edit?import_id=${seed.id}`)" class="gen-btn small">⚡ 生成</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="currentTab === 'invites'" class="tab-content">
      <div class="invite-header-box"><button @click="handleGenCode" class="gen-btn">✨ 生成邀请码</button></div>
      <div class="invite-grid">
        <div v-for="code in inviteCodes" :key="code.id" class="invite-card" :class="{ used: code.is_used }">
          <div class="code-display">{{ code.code }}</div>
          <div class="status-tag">{{ code.is_used ? '已用' : '未用' }}</div>
          <button @click="handleDelCode(code.id)" class="del-invite-btn">删</button>
        </div>
      </div>
    </div>

    <div v-show="currentTab === 'banner'" class="tab-content">
      <div class="preview-section">
        <h3 class="preview-title">📱 首页效果实时预览</h3>
        <div class="preview-banner-container">
          <div v-if="banners.length > 0" class="preview-carousel">
            <div 
              v-for="(b, index) in banners" 
              :key="b.id" 
              class="preview-slide" 
              :class="{ active: index === previewIndex }"
              :style="{ backgroundImage: `url(${b.image_url})` }"
            >
              <div class="preview-text">
                <h4>{{ b.title }}</h4>
              </div>
            </div>
            <div class="preview-dots">
              <span v-for="(b, idx) in banners" :key="idx" :class="{ active: idx === previewIndex }"></span>
            </div>
          </div>
          <div v-else class="preview-empty">暂无轮播图，首页将显示默认背景</div>
        </div>
      </div>

      <div class="invite-header-box">
        <div class="left-box">
          <h2>🖼️ 轮播图列表</h2>
          <p>建议上传尺寸：1920x600 (横幅) | 权重越大越靠前</p>
        </div>
        <div class="right-actions"><button class="gen-btn" @click="showBannerModal = true">+ 上传新海报</button></div>
      </div>

      <div class="banner-grid">
        <div v-for="b in banners" :key="b.id" class="banner-card">
          <div class="b-img-box">
            <img :src="b.image_url" class="b-img" @click="openLightbox(b.image_url)">
          </div>
          <div class="b-info">
            <div class="b-row title"><strong>{{ b.title || '无标题' }}</strong></div>
            <div class="b-row meta">权重: {{ b.sort_order }} | <span class="link-text">{{ b.link_url ? '有链接' : '无链接' }}</span></div>
          </div>
          <button @click="handleDelBanner(b.id)" class="del-invite-btn top-right">✕</button>
        </div>
      </div>
    </div>

    <div v-if="showBannerModal" class="modal-overlay">
      <div class="modal-content">
        <h3>上传轮播海报</h3>
        
        <div class="upload-preview-box">
          <div v-if="bannerPreview" class="preview-img-container">
            <img :src="bannerPreview">
            <button class="reselect-btn" @click="$refs.fileInput.click()">更换</button>
          </div>
          <div v-else class="upload-placeholder" @click="$refs.fileInput.click()">
            <span>➕ 点击选择图片</span>
            <span class="tip">推荐 1920x600 px</span>
          </div>
          <input ref="fileInput" type="file" accept="image/*" @change="handleBannerFile" style="display:none">
        </div>

        <div class="form-row">
          <label>标题</label>
          <input v-model="newBanner.title" placeholder="如: Miku Expo 2025" class="std-input">
        </div>
        <div class="form-row">
          <label>跳转链接</label>
          <input v-model="newBanner.link_url" placeholder="可选 (http...)" class="std-input">
        </div>
        <div class="form-row">
          <label>排序权重</label>
          <input v-model="newBanner.sort_order" type="number" placeholder="数字越大越靠前" class="std-input">
        </div>
        <div class="form-row">
          <label>描述</label>
          <textarea v-model="newBanner.description" placeholder="可选备注" class="std-input" rows="2"></textarea>
        </div>

        <div class="modal-actions">
          <button @click="showBannerModal = false">取消</button>
          <button @click="submitBanner" class="approve-btn">发布上架</button>
        </div>
      </div>
    </div>

    <transition name="fade"><div v-if="showLightbox" class="lightbox-overlay" @click="showLightbox=false"><img :src="lightboxImage" class="lightbox-img"></div></transition>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
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
  { key: 'tickets', name: '🎫 票务资质' },
  { key: 'wiki_seed', name: '📖 百科补全' },
  { key: 'invites', name: '🔑 邀请码' },
  { key: 'banner', name: '🖼️ 轮播图' }
]
const currentTab = ref(route.query.tab || 'audit')

// 数据状态
const pendingItems = ref([])
const items = ref([])
const pendingProjects = ref([])
const eventList = ref([])
const pendingVerifications = ref([])
const pendingTickets = ref([])
const seedCandidates = ref([])
const inviteCodes = ref([])
const banners = ref([])

// 轮播预览状态
const previewIndex = ref(0)
let previewTimer = null

// UI 状态
const showLightbox = ref(false)
const lightboxImage = ref('')
const showBannerModal = ref(false)
const bannerFile = ref(null)
const bannerPreview = ref(null)
const fileInput = ref(null)
const newBanner = ref({ title: '', link_url: '', sort_order: 0, description: '' })

onMounted(() => {
  loadAllData()
  startPreviewTimer()
})

onUnmounted(() => {
  stopPreviewTimer()
})

watch(currentTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } })
  loadAllData()
  if(newTab === 'banner') startPreviewTimer()
  else stopPreviewTimer()
})

const switchTab = (key) => currentTab.value = key
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
const handleLogout = async () => { await userStore.logout(); router.push('/login') }
const openLightbox = (url) => { lightboxImage.value = url; showLightbox.value = true }

// --- 轮播预览逻辑 ---
const startPreviewTimer = () => {
  stopPreviewTimer()
  if (currentTab.value === 'banner') {
    previewTimer = setInterval(() => {
      if (banners.value.length > 1) {
        previewIndex.value = (previewIndex.value + 1) % banners.value.length
      }
    }, 3000) // 3秒切换预览
  }
}
const stopPreviewTimer = () => {
  if (previewTimer) clearInterval(previewTimer)
}

// --- 数据加载 ---
const loadAuditData = async () => { pendingItems.value = await api.getPendingItems(); items.value = await api.getItems() }
const loadEventData = async () => { pendingProjects.value = await api.getPendingProjects(); eventList.value = await api.getEvents() }
const loadTicketData = async () => { pendingVerifications.value = await api.getPendingVerifications(); pendingTickets.value = await api.getPendingTickets() }
const loadWikiData = async () => { seedCandidates.value = await api.getWikiSeeds() }
const loadInviteData = async () => { inviteCodes.value = await api.getInviteCodes(true) }
const loadBannerData = async () => { 
  banners.value = await api.getBanners()
  // 重置预览索引
  if (banners.value.length > 0) previewIndex.value = 0
}

const loadAllData = () => {
  if(currentTab.value === 'audit') loadAuditData()
  if(currentTab.value === 'events') loadEventData()
  if(currentTab.value === 'tickets') loadTicketData()
  if(currentTab.value === 'wiki_seed') loadWikiData()
  if(currentTab.value === 'invites') loadInviteData()
  if(currentTab.value === 'banner') loadBannerData()
}

// --- 操作逻辑 ---
const handleAudit = async (table, id, status, isProject=false) => {
  if(!confirm('确认操作?')) return
  await api.auditRecord(table, id, status)
  loadAllData()
}

const handleDelete = async (table, id) => {
  if(!confirm('确认删除?')) return
  await api.deleteRecord(table, id)
  loadAllData()
}

const handleGenCode = async () => { await api.createInviteCode(); loadInviteData() }
const handleDelCode = async (id) => { if(confirm('删?')) await api.deleteRecord('invite_codes', id); loadInviteData() }
const handleDelBanner = async (id) => { if(confirm('删?')) await api.deleteRecord('home_banners', id); loadBannerData() }

// --- Banner 上传 ---
const handleBannerFile = (e) => {
  const file = e.target.files[0]
  if (file) {
    bannerFile.value = file
    bannerPreview.value = URL.createObjectURL(file)
  }
}

const submitBanner = async () => {
  if(!bannerFile.value) return alert('请选图')
  try {
    const url = await uploadImage('user_uploads', 'banners', bannerFile.value)
    await api.createBanner({ ...newBanner.value, image_url: url })
    alert('发布成功'); 
    showBannerModal.value = false; 
    bannerFile.value = null;
    bannerPreview.value = null;
    newBanner.value = { title: '', link_url: '', sort_order: 0, description: '' }
    loadBannerData()
  } catch(e) { alert(e.message) }
}
</script>

<style scoped>
.admin-container { padding: 20px; font-family: sans-serif; background: #f9f9f9; min-height: 100vh; }
.admin-header { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.header-left h1 { margin: 0 0 15px 0; font-size: 24px; color: #2c3e50; }
.admin-tabs { display: flex; gap: 10px; flex-wrap: wrap; }
.nav-tab { padding: 8px 16px; border: none; background: #f0f2f5; border-radius: 6px; cursor: pointer; font-weight: bold; color: #666; transition: 0.2s; }
.nav-tab.active { background: #39C5BB; color: white; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.admin-badge { background: #673ab7; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.logout-btn { background: #ff4d4f; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; }

/* 悬浮球 */
.floating-nav { position: fixed; bottom: 30px; display: flex; flex-direction: column; gap: 10px; z-index: 100; }
.floating-nav.left { left: 20px; }
.floating-nav.right { right: 20px; }
.floating-nav button { width: 40px; height: 40px; border-radius: 50%; border: none; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); cursor: pointer; font-size: 20px; }

/* 通用列表样式 */
.audit-section { margin-bottom: 30px; }
.section-header h3 { border-left: 4px solid #39C5BB; padding-left: 10px; color: #333; }
.audit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
.audit-card { background: white; border: 1px solid #ddd; border-radius: 8px; display: flex; overflow: hidden; padding: 10px; gap: 10px; }
.audit-card.wide { grid-column: span 2; }
.img-box-wrapper { width: 80px; height: 80px; flex-shrink: 0; position: relative; }
.audit-img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; cursor: zoom-in; }
.audit-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.card-title { margin: 0 0 5px 0; font-size: 14px; }
.audit-actions button { padding: 4px 10px; margin-right: 5px; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px; }
.approve-btn { background: #4caf50; } .reject-btn { background: #f44336; }

/* 表格 */
.table-wrapper { background: white; border-radius: 8px; overflow-x: auto; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f8f9fa; }
.mini-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
.del-btn { color: red; border: 1px solid #ffcdd2; background: white; padding: 2px 8px; border-radius: 4px; cursor: pointer; }

/* --- 轮播图管理专属样式 (优化) --- */
.preview-section { background: #333; padding: 20px; border-radius: 12px; margin-bottom: 20px; color: white; text-align: center; }
.preview-title { margin: 0 0 15px 0; font-size: 14px; opacity: 0.8; }
.preview-banner-container { max-width: 800px; height: 200px; margin: 0 auto; background: #000; border-radius: 8px; overflow: hidden; position: relative; border: 2px solid #555; }
.preview-carousel { width: 100%; height: 100%; position: relative; }
.preview-slide { position: absolute; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0; transition: opacity 0.5s ease; }
.preview-slide.active { opacity: 1; }
.preview-text { position: absolute; bottom: 10px; left: 20px; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
.preview-dots { position: absolute; bottom: 10px; right: 20px; display: flex; gap: 5px; }
.preview-dots span { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.5); }
.preview-dots span.active { background: white; transform: scale(1.2); }
.preview-empty { line-height: 200px; color: #666; }

.invite-header-box { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.invite-header-box h2 { margin: 0 0 5px 0; font-size: 18px; }
.invite-header-box p { margin: 0; color: #999; font-size: 13px; }
.gen-btn { background: #39C5BB; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }

.banner-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 320px)); gap: 20px; }
.banner-card { background: white; border-radius: 8px; border: 1px solid #eee; overflow: hidden; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: 0.2s; }
.banner-card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
.b-img-box { width: 100%; height: 120px; background: #eee; }
.b-img { width: 100%; height: 100%; object-fit: cover; cursor: zoom-in; }
.b-info { padding: 10px; font-size: 13px; }
.b-row { margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { color: #888; font-size: 12px; }
.link-text { background: #f0f2f5; padding: 2px 6px; border-radius: 4px; }
.del-invite-btn { position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; }
.del-invite-btn:hover { background: #ff4d4f; }

/* 弹窗样式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 30px; border-radius: 12px; width: 450px; display: flex; flex-direction: column; gap: 15px; }
.modal-content h3 { margin: 0 0 10px 0; color: #333; text-align: center; }
.upload-preview-box { width: 100%; height: 150px; border: 2px dashed #ddd; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fafafa; position: relative; }
.upload-placeholder { text-align: center; cursor: pointer; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; color: #999; }
.upload-placeholder:hover { background: #f0f9f8; border-color: #39C5BB; color: #39C5BB; }
.tip { font-size: 12px; margin-top: 5px; opacity: 0.7; }
.preview-img-container { width: 100%; height: 100%; position: relative; }
.preview-img-container img { width: 100%; height: 100%; object-fit: contain; background: #333; }
.reselect-btn { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; border: none; padding: 4px 10px; border-radius: 20px; cursor: pointer; font-size: 12px; }
.form-row { display: flex; flex-direction: column; gap: 5px; }
.form-row label { font-size: 13px; font-weight: bold; color: #555; }
.std-input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; outline: none; transition: 0.2s; }
.std-input:focus { border-color: #39C5BB; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.modal-actions button { padding: 8px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; }
.modal-actions .approve-btn { background: #39C5BB; color: white; border: none; }

.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.lightbox-img { max-height: 90vh; max-width: 90vw; }
.empty-mini { padding: 20px; text-align: center; color: #999; font-size: 13px; }
</style>