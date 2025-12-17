<template>
  <div class="admin-container">
    <button class="back-home-btn" @click="$router.push('/')">⬅ 返回首页</button>

    <header class="admin-header">
      <div class="header-left">
        <h1>🎛️ 综合管理后台</h1>
        <div class="admin-tabs">
          <button class="nav-tab" :class="{ active: currentTab === 'audit' }" @click="currentTab = 'audit'">📦 周边商品管理</button>
          <button class="nav-tab" :class="{ active: currentTab === 'events' }" @click="currentTab = 'events'">📅 企划与活动</button>
          <button class="nav-tab" :class="{ active: currentTab === 'invites' }" @click="currentTab = 'invites'">🔑 邀请码管理</button>
        </div>
      </div>
      <div class="header-actions">
        <span class="admin-badge">👑 管理员</span>
        <span class="user-email">{{ currentUser?.email }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <div v-show="currentTab === 'audit'" class="tab-content">
      <div v-if="pendingItems.length > 0" class="audit-section">
        <div class="section-header"><h3>🚨 待审核周边 ({{ pendingItems.length }})</h3></div>
        <div class="audit-grid">
          <div v-for="item in pendingItems" :key="item.id" class="audit-card">
            <div class="img-box-wrapper">
              <img :src="item.image_url" class="audit-img zoom-cursor" @click="openLightbox(item.image_url)" />
              <span class="mini-type-tag" :class="item.is_fan_work ? 'fan' : 'off'">{{ item.is_fan_work ? '同人' : '官方' }}</span>
            </div>
            <div class="audit-info">
              <h4 class="card-title">#{{ item.id }} {{ item.name }}</h4>
              <div class="tags-row"><span class="mini-tag cat">{{ item.category }}</span></div>
              <div class="audit-actions">
                <button @click="auditItem(item.id, 'approved')" class="approve-btn">✅ 通过</button>
                <button @click="auditItem(item.id, 'rejected')" class="reject-btn">❌ 驳回</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar">
        <input v-model="searchQuery" @input="fetchItems" placeholder="🔍 搜索周边..." class="search-input" />
        <button @click="fetchItems" class="refresh-btn">🔄 刷新</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th width="50">ID</th><th width="60">图</th><th>名称 (点击跳转)</th><th width="80">状态</th><th width="100">分类</th><th width="80">价格</th><th width="120">操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.id }}</td>
              <td><img :src="item.image_url" class="mini-thumb zoom-cursor" @click="openLightbox(item.image_url)" /></td>
              <td><span class="internal-link" @click="$router.push(`/item/${item.id}`)">{{ item.name }}</span></td>
              <td><span class="status-badge" :class="item.status">{{ item.status || 'approved' }}</span></td>
              <td><span class="badge cat">{{ item.category }}</span></td>
              <td><span class="price">{{ item.market_price ? '¥'+item.market_price : '-' }}</span></td>
              <td>
                <button @click="deleteItem(item.id)" class="del-btn">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button @click="page--; fetchItems()" :disabled="page === 0">上一页</button>
        <span>第 {{ page + 1 }} 页</span>
        <button @click="page++; fetchItems()">下一页</button>
      </div>
    </div>

    <div v-show="currentTab === 'events'" class="tab-content">
      
      <div v-if="pendingProjects.length > 0" class="audit-section project-audit">
        <div class="section-header"><h3>📢 待审核企划 ({{ pendingProjects.length }})</h3></div>
        <div class="audit-grid">
          <div v-for="proj in pendingProjects" :key="proj.id" class="audit-card project-style">
            <div class="img-box-wrapper">
              <img :src="proj.image_url" class="audit-img zoom-cursor" @click="openLightbox(proj.image_url)" />
              <span class="mini-type-tag project-tag">企划</span>
            </div>
            <div class="audit-info">
              <h4 class="card-title">{{ proj.name }}</h4>
              <div class="audit-actions">
                <button @click="auditItem(proj.id, 'approved', true)" class="approve-btn">✅ 批准</button>
                <button @click="auditItem(proj.id, 'rejected', true)" class="reject-btn">❌ 驳回</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar event-toolbar">
        <div class="left-tools">
          <input v-model="eventSearch" placeholder="🔍 搜索活动或企划..." class="search-input" />
          <button @click="fetchEventsOnly" class="refresh-btn">🔄 刷新</button>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th width="50">ID</th><th width="80">封面</th><th>活动名称</th><th width="100">分类</th><th width="130">📅 开始</th><th width="130">🏁 结束</th><th width="100">状态</th><th width="120">操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="ev in eventList" :key="ev.id">
              <td>{{ ev.id }}</td>
              <td><img :src="ev.image_url" class="mini-thumb zoom-cursor" @click="openLightbox(ev.image_url)" /></td>
              <td>
                <span v-if="ev.category === '同人企划'" class="internal-link" @click="$router.push(`/project/${ev.id}`)">{{ ev.name }}</span>
                <span v-else class="bold-text">{{ ev.name }}</span>
              </td>
              <td><span class="badge" :class="ev.category === '同人企划' ? 'project-badge' : 'cat'">{{ ev.category }}</span></td>
              <td class="date-col">{{ ev.release_date }}</td>
              <td class="date-col" :class="{'missing': !ev.event_end_date}">{{ ev.event_end_date || '-' }}</td>
              <td><span class="status-pill" :class="calcEventStatus(ev).class">{{ calcEventStatus(ev).text }}</span></td>
              <td>
                <button @click="deleteItem(ev.id, true)" class="del-btn">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="currentTab === 'invites'" class="tab-content invites-tab">
      <div class="invite-header-box">
        <div class="left-box">
          <h2>🔑 注册邀请码管理</h2>
          <p>用于分发给新用户进行注册，点击生成即可创建。</p>
        </div>
        <div class="right-actions">
          <button @click="generateInviteCode" class="gen-btn" :disabled="isGenerating">
            {{ isGenerating ? '生成中...' : '✨ 生成新邀请码' }}
          </button>
        </div>
      </div>

      <div class="toolbar">
        <label class="filter-check">
          <input type="checkbox" v-model="showUnusedOnly" @change="fetchInviteCodes"> 只看未使用
        </label>
        <button @click="fetchInviteCodes" class="refresh-btn">🔄 刷新列表</button>
      </div>

      <div class="invite-grid" v-if="inviteCodes.length > 0">
        <div v-for="code in inviteCodes" :key="code.id" class="invite-card" :class="{ used: code.is_used }">
          <div class="code-display">{{ code.code }}</div>
          <div class="status-tag" :class="code.is_used ? 'used-tag' : 'new-tag'">
            {{ code.is_used ? '🔴 已使用' : '🟢 未使用' }}
          </div>
          <div class="meta-info">创建于: {{ new Date(code.created_at).toLocaleString() }}</div>
          <button @click="deleteInviteCode(code.id)" class="del-invite-btn">删除</button>
        </div>
      </div>
      <div v-else class="empty-state">暂无邀请码，请点击生成</div>
    </div>

    <transition name="fade">
      <div v-if="showLightbox" class="lightbox-overlay" @click="closeLightbox">
        <button class="lightbox-close-btn">✕</button>
        <div class="lightbox-img-container" @click.stop><img :src="lightboxImage" class="lightbox-img" /></div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()

const currentUser = ref(null)
const currentTab = ref('audit')
const EVENT_CATEGORIES = ['魔法未来', '雪未来', 'MIKU EXPO', '交响乐会', '演唱会', '联动/咖啡厅', '展览/漫展', '线下活动', '同人企划']

// 数据状态
const items = ref([])
const pendingItems = ref([]) 
const pendingProjects = ref([])
const eventList = ref([])
const inviteCodes = ref([]) // 邀请码列表

const page = ref(0)
const PAGE_SIZE = 20
const searchQuery = ref('')
const eventSearch = ref('')

const showLightbox = ref(false)
const lightboxImage = ref('')

// 邀请码相关状态
const isGenerating = ref(false)
const showUnusedOnly = ref(false)

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) router.push('/login')
  else {
    currentUser.value = user
    fetchItems()
    fetchPendingItems()
    fetchEventsOnly()
    fetchPendingProjects()
    fetchInviteCodes() // 加载邀请码
  }
})

// --- 核心数据获取 ---
const fetchPendingItems = async () => {
  const { data } = await supabase.from('items').select('*').eq('status', 'pending').not('category', 'in', `(${EVENT_CATEGORIES.map(c=>`"${c}"`).join(',')})`).order('created_at', { ascending: false })
  if (data) pendingItems.value = data
}
const fetchItems = async () => {
  let query = supabase.from('items').select('*').not('category', 'in', `(${EVENT_CATEGORIES.map(c=>`"${c}"`).join(',')})`).order('id', { ascending: false }).range(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE - 1)
  if (searchQuery.value) query = query.ilike('name', `%${searchQuery.value}%`)
  const { data } = await query; if (data) items.value = data
}
const fetchPendingProjects = async () => {
  const { data } = await supabase.from('items').select('*').eq('category', '同人企划').eq('status', 'pending').order('created_at', { ascending: false })
  if (data) pendingProjects.value = data
}
const fetchEventsOnly = async () => {
  let query = supabase.from('items').select('*').in('category', EVENT_CATEGORIES).order('release_date', { ascending: false }).limit(100)
  if (eventSearch.value) query = query.ilike('name', `%${eventSearch.value}%`)
  const { data } = await query; if (data) eventList.value = data
}

// --- 🔑 邀请码逻辑 (新增) ---
const fetchInviteCodes = async () => {
  let query = supabase.from('invite_codes').select('*').order('created_at', { ascending: false })
  if (showUnusedOnly.value) {
    query = query.eq('is_used', false)
  }
  const { data, error } = await query
  if (data) inviteCodes.value = data
  else console.error('获取邀请码失败', error)
}

const generateInviteCode = async () => {
  isGenerating.value = true
  // 生成 6 位随机码 (大写字母+数字，排除易混淆字符)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  // 写入正确的 invite_codes 表
  const { error } = await supabase.from('invite_codes').insert([{ code: code, is_used: false }])
  
  if (!error) {
    // 成功后刷新列表
    await fetchInviteCodes()
  } else {
    alert('生成失败: ' + error.message)
  }
  isGenerating.value = false
}

const deleteInviteCode = async (id) => {
  if (!confirm('确认删除此邀请码？')) return
  const { error } = await supabase.from('invite_codes').delete().eq('id', id)
  if (!error) fetchInviteCodes()
}

// --- 其他操作 ---
const auditItem = async (id, status, isProject = false) => {
  if (!confirm('确认操作？')) return
  await supabase.from('items').update({ status }).eq('id', id)
  if (isProject) { fetchPendingProjects(); fetchEventsOnly() } else { fetchPendingItems(); fetchItems() }
}
const deleteItem = async (id, isEvent = false) => {
  if (!confirm('⚠️ 彻底删除？')) return
  await supabase.from('items').delete().eq('id', id)
  if (isEvent) { fetchEventsOnly(); fetchPendingProjects() } else { fetchItems(); fetchPendingItems() }
}
const calcEventStatus = (ev) => {
  const today = new Date().toISOString().split('T')[0]
  if (ev.release_date && today < ev.release_date) return { text: '即将开始', class: 'upcoming' }
  if (ev.event_end_date && today > ev.event_end_date) return { text: '已结束', class: 'ended' }
  return { text: '进行中', class: 'active' }
}
const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
const openLightbox = (url) => { lightboxImage.value = url; showLightbox.value = true }
const closeLightbox = () => { showLightbox.value = false }
watch(currentTab, (newVal) => { 
  if (newVal === 'events') { fetchEventsOnly(); fetchPendingProjects() }
  if (newVal === 'invites') { fetchInviteCodes() }
})
</script>

<style scoped>
.admin-container { padding: 20px; font-family: sans-serif; background: #f9f9f9; min-height: 100vh; position: relative; }
.back-home-btn { position: absolute; top: 20px; left: 20px; background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; color: #555; z-index: 10; transition:0.2s;}
.back-home-btn:hover { background: #39C5BB; color: white; border-color: #39C5BB; }
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-top: 50px; margin-bottom: 20px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.header-left h1 { margin: 0 0 15px 0; font-size: 24px; color: #2c3e50; }
.admin-tabs { display: flex; gap: 10px; }
.nav-tab { padding: 10px 20px; border: none; background: #f0f2f5; border-radius: 8px; cursor: pointer; font-weight: bold; color: #666; transition: 0.2s; }
.nav-tab.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
.header-actions { display: flex; align-items: center; gap: 12px; }
.admin-badge { background: #673ab7; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.logout-btn { background: #ff4d4f; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; }

/* 邀请码相关样式 */
.invites-tab { max-width: 1000px; margin: 0 auto; }
.invite-header-box { background: white; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.invite-header-box h2 { margin: 0 0 5px 0; font-size: 20px; color: #333; }
.invite-header-box p { margin: 0; color: #888; font-size: 13px; }
.gen-btn { background: #39C5BB; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
.gen-btn:hover { background: #2da8a0; transform: translateY(-2px); }
.gen-btn:disabled { opacity: 0.6; cursor: wait; }
.filter-check { font-size: 14px; display: flex; align-items: center; gap: 5px; cursor: pointer; user-select: none; }
.invite-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 20px; }
.invite-card { background: white; border: 1px solid #eee; padding: 20px; border-radius: 12px; position: relative; display: flex; flex-direction: column; align-items: center; transition: 0.2s; }
.invite-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.invite-card.used { opacity: 0.7; background: #fafafa; }
.code-display { font-size: 28px; font-family: monospace; font-weight: bold; color: #333; letter-spacing: 2px; margin: 10px 0; }
.status-tag { font-size: 12px; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 10px; }
.new-tag { background: #e8f5e9; color: #2e7d32; }
.used-tag { background: #ffebee; color: #c62828; }
.meta-info { font-size: 11px; color: #bbb; margin-bottom: 15px; }
.del-invite-btn { color: #ff4d4f; border: 1px solid #ffebee; background: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: 0.2s; }
.del-invite-btn:hover { background: #ff4d4f; color: white; }
.empty-state { text-align: center; color: #999; padding: 40px; }

/* 其他通用样式保持不变 */
.audit-section { margin-bottom: 30px; }
.section-header h3 { margin-bottom: 15px; border-left: 5px solid #ff9800; padding-left: 10px; color: #333; }
.project-audit .section-header h3 { border-left-color: #9c27b0; }
.audit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px; }
.audit-card { background: white; border: 1px solid #ffcc80; border-radius: 8px; display: flex; overflow: hidden; height: 160px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
.project-style { border-color: #e1bee7; }
.img-box-wrapper { width: 110px; position: relative; background: #eee; flex-shrink: 0; }
.audit-img { width: 100%; height: 100%; object-fit: cover; }
.mini-type-tag { position: absolute; bottom: 0; width: 100%; text-align: center; color: white; font-size: 10px; padding: 2px 0; }
.mini-type-tag.fan { background: #e91e63; }
.mini-type-tag.off { background: #2196f3; }
.project-tag { background: #9c27b0; }
.audit-info { padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
.card-title { margin: 0 0 5px 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tags-row { display: flex; gap: 5px; margin-bottom: 8px; }
.mini-tag { font-size: 10px; padding: 2px 5px; border-radius: 3px; border: 1px solid #eee; }
.mini-tag.cat { background: #f5f5f5; color: #666; }
.audit-actions { display: flex; gap: 8px; }
.approve-btn, .reject-btn { flex: 1; border: none; padding: 6px; border-radius: 4px; cursor: pointer; color: white; font-weight: bold; font-size: 12px; }
.approve-btn { background: #4caf50; }
.reject-btn { background: #f44336; }
.internal-link { color: #1565c0; cursor: pointer; font-weight: bold; transition: 0.2s; }
.internal-link:hover { color: #39C5BB; text-decoration: underline; }
.table-wrapper { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f8f9fa; color: #555; }
.mini-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; }
.status-badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.status-badge.approved { background: #e8f5e9; color: #2e7d32; }
.status-badge.pending { background: #fff3e0; color: #ef6c00; }
.project-badge { background: #f3e5f5; color: #7b1fa2; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 15px; }
.event-toolbar { justify-content: space-between; }
.search-input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; width: 300px; }
.refresh-btn, .del-btn { padding: 5px 10px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }
.del-btn { color: red; border-color: #ffcdd2; }
.status-pill { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
.status-pill.active { background: #e0f2f1; color: #00695c; }
.status-pill.ended { background: #eee; color: #999; }
.pagination { margin-top: 20px; text-align: center; }
.pagination button { padding: 5px 15px; margin: 0 5px; }
.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.lightbox-img { max-height: 90vh; max-width: 90vw; }
.lightbox-close-btn { position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 30px; cursor: pointer; }
</style>