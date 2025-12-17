<template>
  <div class="admin-container">
    
    <button class="back-home-btn" @click="$router.push('/')">
      ⬅ 返回首页
    </button>

    <header class="admin-header">
      <div class="header-left">
        <h1>🎛️ 综合管理后台</h1>
        <div class="admin-tabs">
          <button class="nav-tab" :class="{ active: currentTab === 'audit' }" @click="currentTab = 'audit'">
            📋 审核队列
          </button>
          <button class="nav-tab" :class="{ active: currentTab === 'events' }" @click="currentTab = 'events'">
            📅 活动情报
          </button>
          <button class="nav-tab" :class="{ active: currentTab === 'invites' }" @click="currentTab = 'invites'">
            🔑 注册邀请码
          </button>
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
        <div class="section-header"><h3>🚨 待审核队列 ({{ pendingItems.length }})</h3></div>
        <div class="audit-grid">
          <div v-for="item in pendingItems" :key="item.id" class="audit-card">
            <div class="img-box-wrapper">
              <img :src="item.image_url" class="audit-img zoom-cursor" @click="openLightbox(item.image_url)" />
              <span class="mini-type-tag" :class="item.is_fan_work ? 'fan' : 'off'">{{ item.is_fan_work ? '同人' : '官方' }}</span>
            </div>
            <div class="audit-info">
              <h4 class="card-title">#{{ item.id }} {{ item.name }}</h4>
              <div class="tags-row"><span class="mini-tag cat">{{ item.category }}</span><span v-if="item.is_ai" class="mini-tag ai">🤖 AI</span></div>
              <div class="meta-info-box">
                <div class="meta-row"><span class="meta-label">📅 提交:</span> <span class="meta-val">{{ formatTime(item.created_at) }}</span></div>
                <div class="meta-row"><span class="meta-label">👤 来源:</span> <span class="meta-val user-id" :title="item.user_id">{{ item.user_id ? item.user_id.slice(0, 8)+'...' : '爬虫' }}</span></div>
              </div>
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
            <tr><th width="50">ID</th><th width="60">图</th><th>名称</th><th width="80">状态</th><th width="100">分类</th><th width="80">价格</th><th width="120">操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.id }}</td>
              <td><img :src="item.image_url" class="mini-thumb zoom-cursor" @click="openLightbox(item.image_url)" /></td>
              <td>
                <input v-if="editingId === item.id" v-model="editForm.name" class="edit-input" />
                <span v-else class="internal-link" @click="goToDetail(item.id)">{{ item.name }}</span>
              </td>
              <td><span class="status-badge" :class="item.status">{{ item.status || 'approved' }}</span></td>
              <td>
                <input v-if="editingId === item.id" v-model="editForm.category" class="edit-input" />
                <span v-else class="badge cat">{{ item.category }}</span>
              </td>
              <td>
                <input v-if="editingId === item.id" v-model="editForm.market_price" type="number" class="edit-input" />
                <span v-else class="price">{{ item.market_price ? '¥'+item.market_price : '-' }}</span>
              </td>
              <td>
                 <div v-if="editingId === item.id" class="action-group">
                  <button @click="saveEdit(item.id)" class="save-btn">💾</button>
                  <button @click="cancelEdit" class="cancel-btn">✕</button>
                </div>
                <div v-else class="action-group">
                  <button @click="startEdit(item)" class="edit-btn">✏️</button>
                  <button @click="deleteItem(item.id)" class="del-btn">🗑️</button>
                </div>
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
              <div class="meta-info-box">
                <div class="meta-row"><span class="meta-label">📅 提交:</span> <span class="meta-val">{{ formatTime(proj.created_at) }}</span></div>
                <div class="meta-row"><span class="meta-label">👤 发起:</span> <span class="meta-val">{{ proj.author || '未知' }}</span></div>
              </div>
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
          <input v-model="eventSearch" placeholder="🔍 搜索活动..." class="search-input" />
          <button @click="fetchEventsOnly" class="refresh-btn">🔄 刷新</button>
        </div>
        <button class="add-btn" @click="openEventModal()">➕ 新增活动</button>
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
              <td><span v-if="ev.category === '同人企划'" class="internal-link" @click="$router.push(`/project/${ev.id}`)">{{ ev.name }}</span><span v-else class="bold-text">{{ ev.name }}</span></td>
              <td><span class="badge" :class="ev.category === '同人企划' ? 'project-badge' : 'cat'">{{ ev.category }}</span></td>
              <td class="date-col">{{ ev.release_date }}</td>
              <td class="date-col" :class="{'missing': !ev.event_end_date}">{{ ev.event_end_date || '-' }}</td>
              <td><span class="status-pill" :class="calcEventStatus(ev).class">{{ calcEventStatus(ev).text }}</span></td>
              <td>
                <button @click="openEventModal(ev)" class="edit-btn">✏️ 编辑</button>
                <button @click="deleteItem(ev.id, true)" class="del-btn" style="margin-left:5px">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-show="currentTab === 'invites'" class="tab-content">
      <div class="invite-manager">
        <div class="im-header">
          <div class="im-left">
            <h3>🔑 注册邀请码管理</h3>
            <p>用于分发给新用户进行注册</p>
          </div>
          <button @click="generateInviteCode" class="gen-code-btn">✨ 生成新邀请码</button>
        </div>

        <div class="code-filters">
          <label><input type="checkbox" v-model="showUnusedOnly" @change="fetchInviteCodes"> 只看未使用</label>
          <button @click="fetchInviteCodes" class="refresh-btn-sm">刷新列表</button>
        </div>

        <div class="code-list">
          <div v-if="inviteCodes.length === 0" class="empty-codes">暂无数据</div>
          <div v-for="code in inviteCodes" :key="code.id" class="code-item" :class="{ used: code.is_used }">
            <div class="code-val">{{ code.code }}</div>
            <div class="code-status">
              <span v-if="code.is_used" class="badge used">已使用</span>
              <span v-else class="badge new">未使用</span>
            </div>
            <div class="code-meta">
              创建于: {{ formatTime(code.created_at) }}
            </div>
            <button @click="deleteInviteCode(code.id)" class="del-btn-mini">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEventModal" class="modal-overlay" @click.self="showEventModal = false">
      <div class="modal-box">
        <h3>{{ isEditingEvent ? '✏️ 编辑信息' : '➕ 新增活动/企划' }}</h3>
        <div class="modal-form">
          <div class="form-row"><label>名称 *</label><input v-model="eventForm.name" /></div>
          <div class="form-row half">
            <div><label>分类</label><select v-model="eventForm.category"><option v-for="c in EVENT_CATEGORIES" :key="c" :value="c">{{ c }}</option></select></div>
            <div><label>角色</label><input v-model="eventForm.character" /></div>
          </div>
          <div class="form-row half">
            <div><label>📅 开始日期</label><input type="date" v-model="eventForm.release_date" /></div>
            <div><label>🏁 结束日期</label><input type="date" v-model="eventForm.event_end_date" /></div>
          </div>
          <div class="form-row"><label>图片链接</label><input v-model="eventForm.image_url" /></div>
          <div class="form-row"><label>详情链接</label><input v-model="eventForm.link" /></div>
          <div class="modal-actions">
            <button @click="saveEvent" class="save-btn-lg">💾 保存</button>
            <button @click="showEventModal = false" class="cancel-btn-lg">取消</button>
          </div>
        </div>
      </div>
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
import { ref, reactive, onMounted, watch, onUnmounted } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()

const currentUser = ref(null)
const currentTab = ref('audit')
const EVENT_CATEGORIES = ['魔法未来', '雪未来', 'MIKU EXPO', '交响乐会', '演唱会', '联动/咖啡厅', '展览/漫展', '线下活动', '同人企划']

// 数据
const items = ref([])
const pendingItems = ref([])
const pendingProjects = ref([])
const eventList = ref([])
const inviteCodes = ref([]) // 邀请码列表

const page = ref(0)
const PAGE_SIZE = 20
const searchQuery = ref('')
const eventSearch = ref('')
const showUnusedOnly = ref(false)

const editingId = ref(null)
const editForm = ref({})
const showEventModal = ref(false)
const isEditingEvent = ref(false)
const eventForm = reactive({
  id: null, name: '', category: '线下活动', character: '全员/混合',
  release_date: '', event_end_date: '', image_url: '', link: '', external_link: ''
})
const showLightbox = ref(false)
const lightboxImage = ref('')

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

// --- 邀请码逻辑 (Tab 3) ---
const fetchInviteCodes = async () => {
  let query = supabase.from('registration_codes').select('*').order('created_at', { ascending: false })
  if (showUnusedOnly.value) query = query.eq('is_used', false)
  const { data } = await query
  if (data) inviteCodes.value = data
}

const generateInviteCode = async () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const { error } = await supabase.from('registration_codes').insert([{ code }])
  if (error) alert('生成失败: ' + error.message)
  else {
    fetchInviteCodes()
    alert(`生成成功: ${code}`)
  }
}

const deleteInviteCode = async (id) => {
  if (!confirm('确认删除？')) return
  await supabase.from('registration_codes').delete().eq('id', id)
  fetchInviteCodes()
}

// --- 其他逻辑保持不变 ---
const goToDetail = (id) => router.push(`/item/${id}`)
const formatTime = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`
}

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
const auditItem = async (id, status, isProject = false) => {
  if (!confirm('确认操作？')) return
  await supabase.from('items').update({ status }).eq('id', id)
  if (isProject) { fetchPendingProjects(); fetchEventsOnly() } else { fetchPendingItems(); fetchItems() }
}
const startEdit = (item) => { editingId.value = item.id; editForm.value = { ...item } }
const cancelEdit = () => { editingId.value = null; editForm.value = {} }
const saveEdit = async (id) => {
  const { error } = await supabase.from('items').update({ name: editForm.value.name, category: editForm.value.category, market_price: editForm.value.market_price }).eq('id', id)
  if (!error) { editingId.value = null; fetchItems() } else alert('保存失败')
}
const deleteItem = async (id, isEvent = false) => {
  if (!confirm('⚠️ 彻底删除？')) return
  await supabase.from('items').delete().eq('id', id)
  if (isEvent) { fetchEventsOnly(); fetchPendingProjects() } else { fetchItems(); fetchPendingItems() }
}
const calcEventStatus = (ev) => {
  const today = new Date().toISOString().split('T')[0]
  if (ev.release_date && today < ev.release_date) return { text: '📅 即将开始', class: 'upcoming' }
  if (ev.event_end_date && today > ev.event_end_date) return { text: '🚫 已结束', class: 'ended' }
  return { text: '🟢 进行中', class: 'active' }
}
const openEventModal = (ev = null) => {
  showEventModal.value = true
  if (ev) { isEditingEvent.value = true; Object.assign(eventForm, ev) }
  else { isEditingEvent.value = false; Object.assign(eventForm, { id: null, name: '', category: '同人企划', character: '', release_date: '', event_end_date: '', image_url: '', link: '', external_link: '' }) }
}
const saveEvent = async () => {
  if (!eventForm.name) return alert('名称必填')
  const payload = { ...eventForm, status: 'approved' }; delete payload.id
  let error = null
  if (isEditingEvent.value) { error = (await supabase.from('items').update(payload).eq('id', eventForm.id)).error }
  else { error = (await supabase.from('items').insert([payload])).error }
  if (!error) { showEventModal.value = false; fetchEventsOnly() } else alert(error.message)
}
const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
const openLightbox = (url) => { lightboxImage.value = url; showLightbox.value = true }
const closeLightbox = () => { showLightbox.value = false }
watch(currentTab, (newVal) => { 
  if (newVal === 'events') { fetchEventsOnly(); fetchPendingProjects() }
  if (newVal === 'invites') fetchInviteCodes()
})
</script>

<style scoped>
.admin-container { padding: 20px; font-family: sans-serif; background: #f9f9f9; min-height: 100vh; position: relative; }
.back-home-btn { position: absolute; top: 20px; left: 20px; background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; color: #555; z-index: 10; transition:0.2s;}
.back-home-btn:hover { background: #39C5BB; color: white; border-color: #39C5BB; }

/* Header */
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-top: 50px; margin-bottom: 20px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.header-left h1 { margin: 0 0 15px 0; font-size: 24px; color: #2c3e50; }
.admin-tabs { display: flex; gap: 10px; }
.nav-tab { padding: 10px 20px; border: none; background: #f0f2f5; border-radius: 8px; cursor: pointer; font-weight: bold; color: #666; transition: 0.2s; }
.nav-tab.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
.header-actions { display: flex; align-items: center; gap: 12px; }
.admin-badge { background: #673ab7; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.logout-btn { background: #ff4d4f; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; }

/* Invite Manager (New) */
.invite-manager { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.im-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.im-header h3 { margin: 0; color: #333; }
.im-header p { margin: 5px 0 0; color: #888; font-size: 14px; }
.gen-code-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(118, 75, 162, 0.3); transition: 0.2s; }
.gen-code-btn:hover { transform: translateY(-2px); }

.code-filters { margin-bottom: 20px; display: flex; gap: 20px; align-items: center; }
.code-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
.code-item { background: #f8f9fa; border: 1px solid #eee; padding: 15px; border-radius: 8px; position: relative; transition: 0.2s; }
.code-item:hover { border-color: #ccc; }
.code-item.used { opacity: 0.6; background: #eee; }
.code-val { font-size: 24px; font-family: monospace; font-weight: bold; color: #333; letter-spacing: 2px; text-align: center; margin-bottom: 10px; background: white; padding: 5px; border-radius: 4px; }
.code-status { display: flex; justify-content: center; margin-bottom: 10px; }
.badge.new { background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.badge.used { background: #ffebee; color: #c62828; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.code-meta { font-size: 12px; color: #999; text-align: center; margin-bottom: 10px; }
.del-btn-mini { width: 100%; border: 1px solid #ffcdd2; background: white; color: #e57373; cursor: pointer; padding: 5px; border-radius: 4px; font-size: 12px; }
.del-btn-mini:hover { background: #ffebee; }
.empty-codes { text-align: center; color: #999; grid-column: 1 / -1; padding: 40px; }

/* Existing Styles (Audit, Table, Modal...) */
.audit-section { margin-bottom: 30px; }
.section-header h3 { margin-bottom: 15px; border-left: 5px solid #ff9800; padding-left: 10px; color: #333; }
.audit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px; }
.audit-card { background: white; border: 1px solid #ffcc80; border-radius: 8px; display: flex; overflow: hidden; height: 160px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
.project-audit .section-header h3 { border-left-color: #9c27b0; }
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
.mini-tag.ai { background: black; color: white; }
.meta-info-box { background: #fafafa; border: 1px dashed #ddd; border-radius: 4px; padding: 5px; font-size: 11px; color: #666; margin-bottom: 5px; }
.meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
.meta-label { color: #999; }
.meta-val { font-family: monospace; color: #333; }
.user-id { background: #eee; padding: 0 4px; border-radius: 3px; }
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
.refresh-btn, .edit-btn, .del-btn, .save-btn, .cancel-btn { padding: 5px 10px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }
.refresh-btn-sm { padding: 2px 8px; font-size: 12px; cursor: pointer; }
.del-btn, .cancel-btn { color: red; border-color: #ffcdd2; }
.add-btn { background: #2e7d32; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
.status-pill { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
.status-pill.active { background: #e0f2f1; color: #00695c; }
.status-pill.ended { background: #eee; color: #999; }
.pagination { margin-top: 20px; text-align: center; }
.pagination button { padding: 5px 15px; margin: 0 5px; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center; }
.modal-box { background: white; width: 500px; padding: 30px; border-radius: 12px; }
.form-row { margin-bottom: 15px; }
.form-row.half { display: flex; gap: 15px; }
.form-row.half > div { flex: 1; }
.form-row input, .form-row select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.save-btn-lg { flex: 2; background: #39C5BB; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; }
.cancel-btn-lg { flex: 1; background: #eee; color: #666; border: none; padding: 12px; border-radius: 6px; cursor: pointer; }
.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.lightbox-img { max-height: 90vh; max-width: 90vw; }
.lightbox-close-btn { position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 30px; cursor: pointer; }
</style>