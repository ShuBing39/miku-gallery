<template>
  <div class="admin-container">
    
    <button class="back-home-btn" @click="$router.push('/')">
      ⬅ 返回首页
    </button>

    <header class="admin-header">
      <div class="header-left">
        <h1>🎛️ 综合管理后台</h1>
        <div class="admin-tabs">
          <button 
            class="nav-tab" 
            :class="{ active: currentTab === 'audit' }"
            @click="currentTab = 'audit'"
          >
            📋 内容审核 & 列表
          </button>
          <button 
            class="nav-tab" 
            :class="{ active: currentTab === 'events' }"
            @click="currentTab = 'events'"
          >
            📅 活动情报局管理
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
        <div class="section-header">
          <h3>🚨 待审核队列 ({{ pendingItems.length }})</h3>
        </div>
        <div class="audit-grid">
          <div v-for="item in pendingItems" :key="item.id" class="audit-card">
            <div class="img-box-wrapper">
              <img :src="item.image_url" class="audit-img zoom-cursor" @click="openLightbox(item.image_url)" />
              <span class="mini-type-tag" :class="item.is_fan_work ? 'fan' : 'off'">{{ item.is_fan_work ? '同人' : '官方' }}</span>
            </div>
            <div class="audit-info">
              <h4>#{{ item.id }} {{ item.name }}</h4>
              <div class="tags-row">
                <span class="mini-tag cat">{{ item.category }}</span>
                <span v-if="item.is_ai" class="mini-tag ai">🤖 AI</span>
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
        <input v-model="searchQuery" @input="fetchItems" placeholder="🔍 搜索全站商品 ID 或 名称..." class="search-input" />
        <button @click="fetchItems" class="refresh-btn">🔄 刷新</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th width="50">ID</th>
              <th width="60">图</th>
              <th>名称</th>
              <th width="80">状态</th>
              <th width="100">分类</th>
              <th width="80">价格</th>
              <th width="120">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.id }}</td>
              <td><img :src="item.image_url" class="mini-thumb zoom-cursor" @click="openLightbox(item.image_url)" /></td>
              <td>
                <input v-if="editingId === item.id" v-model="editForm.name" class="edit-input" />
                <a v-else :href="item.link" target="_blank" class="item-link">{{ item.name }}</a>
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
      
      <div class="toolbar event-toolbar">
        <div class="left-tools">
          <input v-model="eventSearch" placeholder="🔍 搜索活动..." class="search-input" />
          <button @click="fetchEventsOnly" class="refresh-btn">🔄 刷新活动</button>
        </div>
        <button class="add-btn" @click="openEventModal()">➕ 手动新增活动</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th width="50">ID</th>
              <th width="80">封面</th>
              <th>活动名称</th>
              <th width="100">分类</th>
              <th width="130">📅 开始日期</th>
              <th width="130">🏁 结束日期</th>
              <th width="100">状态</th>
              <th width="120">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in eventList" :key="ev.id">
              <td>{{ ev.id }}</td>
              <td><img :src="ev.image_url" class="mini-thumb zoom-cursor" @click="openLightbox(ev.image_url)" /></td>
              <td class="bold-text">{{ ev.name }}</td>
              <td><span class="badge cat">{{ ev.category }}</span></td>
              
              <td class="date-col">{{ ev.release_date }}</td>
              <td class="date-col" :class="{'missing': !ev.event_end_date}">
                {{ ev.event_end_date || '(未设置)' }}
              </td>

              <td>
                <span class="status-pill" :class="calcEventStatus(ev).class">
                  {{ calcEventStatus(ev).text }}
                </span>
              </td>

              <td>
                <button @click="openEventModal(ev)" class="edit-btn">✏️ 编辑</button>
                <button @click="deleteItem(ev.id, true)" class="del-btn" style="margin-left:5px">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showEventModal" class="modal-overlay" @click.self="showEventModal = false">
      <div class="modal-box">
        <h3>{{ isEditingEvent ? '✏️ 编辑活动信息' : '➕ 新增活动情报' }}</h3>
        
        <div class="modal-form">
          <div class="form-row">
            <label>活动名称 *</label>
            <input v-model="eventForm.name" placeholder="例如：2025 魔法未来 演唱会" />
          </div>

          <div class="form-row half">
            <div>
              <label>分类</label>
              <select v-model="eventForm.category">
                <option v-for="c in EVENT_CATEGORIES" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div>
              <label>角色</label>
              <input v-model="eventForm.character" placeholder="如: 初音未来" />
            </div>
          </div>

          <div class="form-row half">
            <div>
              <label>📅 开始日期 (发布日)</label>
              <input type="date" v-model="eventForm.release_date" />
            </div>
            <div>
              <label>🏁 结束日期 (留空则长期)</label>
              <input type="date" v-model="eventForm.event_end_date" />
              <span class="hint-small">💡 设置为昨天即可标记为"已结束"</span>
            </div>
          </div>

          <div class="form-row">
            <label>封面图片链接 *</label>
            <input v-model="eventForm.image_url" placeholder="https://..." />
            <div class="preview-box" v-if="eventForm.image_url">
              <img :src="eventForm.image_url" />
            </div>
          </div>

          <div class="form-row">
            <label>详情页链接 (Link)</label>
            <input v-model="eventForm.link" placeholder="跳转到博客或官网" />
          </div>

           <div class="form-row">
            <label>购票/外部链接 (External Link)</label>
            <input v-model="eventForm.external_link" placeholder="如: 票务网站" />
          </div>

          <div class="modal-actions">
            <button @click="saveEvent" class="save-btn-lg">💾 保存提交</button>
            <button @click="showEventModal = false" class="cancel-btn-lg">取消</button>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showLightbox" class="lightbox-overlay" @click="closeLightbox">
        <button class="lightbox-close-btn">✕</button>
        <div class="lightbox-img-container" @click.stop>
          <img :src="lightboxImage" class="lightbox-img" />
        </div>
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

// 核心状态
const currentUser = ref(null)
const currentTab = ref('audit') // 'audit' | 'events'
const EVENT_CATEGORIES = ['魔法未来', '雪未来', 'MIKU EXPO', '交响乐会', '演唱会', '联动/咖啡厅', '展览/漫展', '线下活动']

// 列表数据
const items = ref([])
const pendingItems = ref([])
const eventList = ref([]) // 专门存活动数据

// 分页与搜索
const page = ref(0)
const PAGE_SIZE = 20
const searchQuery = ref('')
const eventSearch = ref('')

// 编辑状态 (通用)
const editingId = ref(null)
const editForm = ref({})

// 弹窗状态 (活动)
const showEventModal = ref(false)
const isEditingEvent = ref(false)
const eventForm = reactive({
  id: null, name: '', category: '线下活动', character: '全员/混合',
  release_date: '', event_end_date: '', image_url: '', link: '', external_link: ''
})

// 灯箱
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
  }
})

// --- 通用逻辑 ---
const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
const openLightbox = (url) => { lightboxImage.value = url; showLightbox.value = true; document.body.style.overflow = 'hidden' }
const closeLightbox = () => { showLightbox.value = false; lightboxImage.value = ''; document.body.style.overflow = 'auto' }
onUnmounted(() => { document.body.style.overflow = 'auto' })

// --- Tab 1: 审核 & 全站逻辑 ---
const fetchPendingItems = async () => {
  const { data } = await supabase.from('items').select('*').eq('status', 'pending').order('created_at', { ascending: false })
  if (data) pendingItems.value = data
}
const auditItem = async (id, status) => {
  if (!confirm('确定操作?')) return
  await supabase.from('items').update({ status }).eq('id', id)
  fetchPendingItems(); fetchItems()
}
const fetchItems = async () => {
  let query = supabase.from('items').select('*').order('id', { ascending: false }).range(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE - 1)
  if (searchQuery.value) query = query.ilike('name', `%${searchQuery.value}%`)
  const { data } = await query; if (data) items.value = data
}
const startEdit = (item) => { editingId.value = item.id; editForm.value = { ...item } }
const cancelEdit = () => { editingId.value = null; editForm.value = {} }
const saveEdit = async (id) => {
  const { error } = await supabase.from('items').update({
    name: editForm.value.name, category: editForm.value.category, market_price: editForm.value.market_price
  }).eq('id', id)
  if (!error) { editingId.value = null; fetchItems() } else alert('保存失败')
}
const deleteItem = async (id, isEvent = false) => {
  if (!confirm('⚠️ 彻底删除？不可恢复')) return
  await supabase.from('items').delete().eq('id', id)
  if (isEvent) fetchEventsOnly(); else fetchItems()
}

// --- Tab 2: 活动管理逻辑 ---
const fetchEventsOnly = async () => {
  let query = supabase.from('items').select('*').in('category', EVENT_CATEGORIES).order('release_date', { ascending: false })
  if (eventSearch.value) query = query.ilike('name', `%${eventSearch.value}%`)
  // 这里暂时不分页，取前100条方便管理，或者你可以加分页
  query = query.limit(100)
  const { data } = await query
  if (data) eventList.value = data
}

// 计算活动状态
const calcEventStatus = (ev) => {
  const today = new Date().toISOString().split('T')[0]
  if (ev.release_date && today < ev.release_date) return { text: '📅 即将开始', class: 'upcoming' }
  if (ev.event_end_date && today > ev.event_end_date) return { text: '🚫 已结束', class: 'ended' }
  return { text: '🟢 进行中', class: 'active' }
}

// 打开弹窗
const openEventModal = (ev = null) => {
  showEventModal.value = true
  if (ev) {
    isEditingEvent.value = true
    Object.assign(eventForm, ev)
  } else {
    isEditingEvent.value = false
    // 重置表单
    Object.assign(eventForm, {
      id: null, name: '', category: '线下活动', character: '全员/混合',
      release_date: new Date().toISOString().split('T')[0], 
      event_end_date: '', image_url: '', link: '', external_link: ''
    })
  }
}

// 保存活动 (新增或修改)
const saveEvent = async () => {
  if (!eventForm.name || !eventForm.release_date) return alert('名称和开始日期必填')
  
  const payload = {
    name: eventForm.name,
    category: eventForm.category,
    character: eventForm.character,
    release_date: eventForm.release_date,
    event_end_date: eventForm.event_end_date || null,
    image_url: eventForm.image_url,
    link: eventForm.link,
    external_link: eventForm.external_link,
    // 默认字段
    status: 'approved',
    author: '官方/管理员',
    is_ai: false
  }

  let error = null
  if (isEditingEvent.value) {
    // 更新
    const res = await supabase.from('items').update(payload).eq('id', eventForm.id)
    error = res.error
  } else {
    // 新增
    const res = await supabase.from('items').insert([payload])
    error = res.error
  }

  if (error) {
    alert('保存失败: ' + error.message)
  } else {
    alert('✅ 保存成功')
    showEventModal.value = false
    fetchEventsOnly()
  }
}

// 监听 Tab 切换
watch(currentTab, (newVal) => {
  if (newVal === 'events') fetchEventsOnly()
})
</script>

<style scoped>
.admin-container { padding: 20px; font-family: sans-serif; background: #f9f9f9; min-height: 100vh; position: relative; }
.back-home-btn { position: absolute; top: 20px; left: 20px; background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; color: #555; z-index: 10; transition:0.2s;}
.back-home-btn:hover { background: #39C5BB; color: white; border-color: #39C5BB; }

/* Header & Tabs */
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-top: 50px; margin-bottom: 20px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.header-left h1 { margin: 0 0 15px 0; font-size: 24px; color: #2c3e50; }
.admin-tabs { display: flex; gap: 10px; }
.nav-tab { padding: 10px 20px; border: none; background: #f0f2f5; border-radius: 8px; cursor: pointer; font-weight: bold; color: #666; transition: 0.2s; }
.nav-tab.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }

.header-actions { display: flex; align-items: center; gap: 12px; }
.admin-badge { background: #673ab7; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.logout-btn { background: #ff4d4f; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; }

/* Toolbar */
.toolbar { display: flex; gap: 10px; margin-bottom: 15px; }
.event-toolbar { justify-content: space-between; }
.left-tools { display: flex; gap: 10px; }
.search-input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; width: 300px; }
.refresh-btn { background: #fff; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; padding: 0 15px; }
.add-btn { background: #2e7d32; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(46, 125, 50, 0.2); }
.add-btn:hover { background: #1b5e20; }

/* Table */
.table-wrapper { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f8f9fa; color: #555; }
.mini-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; }
.bold-text { font-weight: bold; color: #333; }
.date-col { font-family: monospace; color: #555; }
.missing { color: #ccc; font-style: italic; }

/* Status Pills */
.status-pill { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
.status-pill.upcoming { background: #fff3e0; color: #ef6c00; }
.status-pill.active { background: #e0f2f1; color: #00695c; }
.status-pill.ended { background: #eee; color: #999; }

/* Audit Cards (Tab 1) */
.audit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-bottom: 20px; }
.audit-card { background: white; border: 1px solid #ffe0b2; border-radius: 8px; display: flex; overflow: hidden; }
.img-box-wrapper { width: 100px; position: relative; }
.audit-img { width: 100%; height: 100%; object-fit: cover; }
.audit-info { padding: 10px; flex: 1; display: flex; flex-direction: column; }
.audit-actions { margin-top: auto; display: flex; gap: 5px; }
.approve-btn { flex: 1; background: #4caf50; color: white; border:none; padding: 5px; border-radius: 4px; cursor: pointer; }
.reject-btn { flex: 1; background: #f44336; color: white; border:none; padding: 5px; border-radius: 4px; cursor: pointer; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center; }
.modal-box { background: white; width: 500px; padding: 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.modal-box h3 { margin-top: 0; color: #333; }
.form-row { margin-bottom: 15px; }
.form-row.half { display: flex; gap: 15px; }
.form-row.half > div { flex: 1; }
.form-row label { display: block; font-weight: bold; font-size: 13px; margin-bottom: 5px; color: #555; }
.form-row input, .form-row select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
.hint-small { font-size: 11px; color: #999; display: block; margin-top: 2px; }
.preview-box { margin-top: 10px; height: 100px; background: #eee; display: flex; justify-content: center; overflow: hidden; border-radius: 6px; }
.preview-box img { height: 100%; object-fit: contain; }

.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.save-btn-lg { flex: 2; background: #39C5BB; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px; }
.cancel-btn-lg { flex: 1; background: #eee; color: #666; border: none; padding: 12px; border-radius: 6px; cursor: pointer; }

/* Lightbox */
.lightbox-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.lightbox-img { max-height: 90vh; max-width: 90vw; }
.lightbox-close-btn { position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 30px; cursor: pointer; }

/* Misc */
.edit-input { width: 100%; padding: 4px; box-sizing: border-box; }
.badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.cat { background: #e3f2fd; color: #1565c0; }
.price { color: #d32f2f; font-weight: bold; font-family: monospace; }
.edit-btn, .del-btn { padding: 4px 8px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }
.del-btn { color: red; border-color: red; }
.pagination { margin-top: 20px; text-align: center; }
.pagination button { padding: 5px 15px; margin: 0 5px; }
</style>