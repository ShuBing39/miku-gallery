<template>
  <div class="dashboard-container">
    <div class="floating-nav left">
      <button @click="$router.push('/')" title="返回首页">🏠</button>
      <button @click="$router.go(-1)" title="返回">⬅</button>
    </div>

    <div class="profile-header">
      <div class="avatar-section">
        <div class="avatar-wrapper" @click="triggerAvatarUpload">
          <img 
            :src="userStore.profile?.avatar_url || 'https://placehold.co/150x150/e0e0e0/888888?text=Avatar'" 
            class="user-avatar"
          >
          <div class="avatar-overlay">📷 更换</div>
        </div>
        <input type="file" ref="fileInput" hidden accept="image/*" @change="handleAvatarUpload">

        <div class="info">
          <h2 class="username">
            {{ userStore.profile?.username || userStore.user?.user_metadata?.username || '未命名用户' }}
            <span v-if="isAdmin" class="role-tag admin">管理员</span>
          </h2>
          <p class="uid-tag">UID: {{ userStore.profile?.user_no || '---' }}</p>
          <p class="email">{{ userStore.user?.email }}</p>
          
          <div class="badges">
            <span class="badge">Vocaloid P</span>
            <span class="badge">收藏家</span>
            
            <span v-if="verifyStatus === 'approved'" class="badge verified" :class="{ minor: isMinor }">
              {{ isMinor ? '🔞 实名(未成年)' : '✅ 已实名' }}
            </span>
            <span v-else-if="verifyStatus === 'pending'" class="badge pending">⏳ 审核中</span>
            <span v-else class="badge unverified" @click="$router.push('/verify')">⚠️ 未实名 (点击认证)</span>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button v-if="verifyStatus === 'none' || verifyStatus === 'rejected'" class="btn-verify" @click="$router.push('/verify')">
          🛡️ 立即实名认证
        </button>

        <div class="btn-row">
          <button v-if="isAdmin" @click="$router.push('/admin')" class="btn-admin">👑 管理后台</button>
          <button @click="$router.push('/circle')" class="btn-circle">🏯 我的社团</button>
        </div>

        <div class="btn-row sm">
          <button @click="showEditModal = true" class="btn-edit">✏️ 编辑资料</button>
          <button @click="handleLogout" class="btn-logout">退出</button>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button :class="{ active: currentTab === 'projects' }" @click="currentTab = 'projects'">我的企划</button>
      <button :class="{ active: currentTab === 'contributions' }" @click="currentTab = 'contributions'">我的投稿</button>
      <button :class="{ active: currentTab === 'tasks' }" @click="currentTab = 'tasks'">我的任务</button>
      <button :class="{ active: currentTab === 'collect' }" @click="currentTab = 'collect'">我的收藏</button>
    </div>

    <div class="tab-content">
      
      <div v-if="currentTab === 'projects'" class="tab-pane">
        <div class="pane-actions">
          <button class="btn-small" @click="$router.push('/submit-project')">+ 发起新企划</button>
        </div>
        <div v-if="myProjects.length === 0" class="empty-state">还没有参与或发布企划</div>
        <div v-else class="list-grid">
          <div v-for="p in myProjects" :key="p.id" class="mini-card" @click="$router.push(`/project/${p.id}`)">
            <img :src="p.image_url" class="mini-cover">
            <div class="card-text">
              <span class="name">{{ p.name }}</span>
              <span class="status" :class="p.recruit_status">{{ p.recruit_status }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentTab === 'contributions'" class="tab-pane">
        <div class="sub-tabs">
          <button :class="{ active: contribSubTab === 'images' }" @click="contribSubTab = 'images'">📸 我的返图 ({{ myImages.length }})</button>
          <button :class="{ active: contribSubTab === 'wiki' }" @click="contribSubTab = 'wiki'">📝 纠错记录 ({{ myRevisions.length }})</button>
        </div>

        <div v-if="contribSubTab === 'images'" class="sub-view">
           <div class="pane-actions">
             <button class="btn-small" @click="$router.push('/events')">+ 去周边页发图</button>
           </div>
           <div v-if="myImages.length === 0" class="empty-state">还没有上传过买家秀哦 ~</div>
           <div v-else class="list-grid">
             <div v-for="img in myImages" :key="img.id" class="mini-card gallery-card">
               <div class="img-wrapper">
                 <img :src="img.image_url" class="mini-cover">
                 <div class="status-badge-corner" :class="img.status">
                   {{ getStatusLabel(img.status) }}
                 </div>
               </div>
               <div class="card-text">
                 <span class="name">关联: {{ img.items?.name || '未知周边' }}</span>
                 <p v-if="img.caption" class="caption-text">"{{ img.caption }}"</p>
                 <span class="date-text">{{ formatDate(img.created_at) }}</span>
               </div>
             </div>
           </div>
        </div>

        <div v-if="contribSubTab === 'wiki'" class="sub-view">
           <div v-if="myRevisions.length === 0" class="empty-state">还没有提交过词条纠错建议 ~</div>
           <div v-else class="simple-list">
             <div v-for="rev in myRevisions" :key="rev.id" class="list-row revision-row">
               <div class="row-left">
                 <span class="status-dot" :class="rev.status"></span>
                 <div class="row-content">
                   <span class="row-title">修改: {{ rev.items?.name }}</span>
                   <p class="row-desc">备注: {{ rev.comment || '无' }}</p>
                 </div>
               </div>
               <div class="row-right">
                 <span class="status-text" :class="rev.status">{{ getStatusLabel(rev.status) }}</span>
                 <span class="date-text">{{ formatDate(rev.created_at) }}</span>
               </div>
             </div>
           </div>
        </div>
      </div>

      <div v-if="currentTab === 'tasks'" class="tab-pane">
        <div v-if="myTasks.length === 0" class="empty-state">还没有认领任务</div>
        <div v-else class="simple-list">
          <div v-for="t in myTasks" :key="t.id" class="list-row" @click="$router.push(`/project/${t.project_id}`)">
            <span class="row-title">📌 {{ t.content }}</span>
            <span class="row-status" :class="t.status">{{ t.status === 'done' ? '已完成' : '进行中' }}</span>
          </div>
        </div>
      </div>

      <div v-if="currentTab === 'collect'" class="tab-pane">
        <p class="empty-state">暂无收藏 (功能开发中)</p>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal">
        <h3>修改资料</h3>
        <div class="form-group">
          <label>昵称</label>
          <input v-model="editForm.username" type="text" placeholder="请输入新昵称" class="modal-input">
        </div>
        <div class="modal-actions">
          <button @click="showEditModal = false">取消</button>
          <button @click="saveProfile" class="btn-primary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import { supabase } from '../../services/supabase'
import { uploadImage } from '../../services/storage'
import { getIdentityStatus } from '../../services/authService'
import { getMyImages, getMyWikiRevisions } from '../../services/userData'

const router = useRouter()
const userStore = useUserStore()

// 状态
const currentTab = ref('projects')
const contribSubTab = ref('images')
const showEditModal = ref(false)
const fileInput = ref(null)
const editForm = reactive({ username: '' })

// 数据容器
const myProjects = ref([])
const myTasks = ref([])
const myImages = ref([])
const myRevisions = ref([])

// 认证状态
const verifyStatus = ref('none')
const isMinor = ref(false)

const isAdmin = computed(() => {
  const email = userStore.user?.email || ''
  return email === 'admin@miku.com' || userStore.profile?.role === 'admin'
})

onMounted(async () => {
  if (!userStore.user) await userStore.initialize()
  if (!userStore.user) return router.replace('/login')

  if (userStore.profile) {
    editForm.username = userStore.profile.username
  }

  // 加载所有数据
  await Promise.all([
    fetchVerifyStatus(),
    fetchMyProjects(),
    fetchMyTasks(),
    fetchContributions()
  ])
})

const fetchVerifyStatus = async () => {
  const data = await getIdentityStatus(userStore.user.id)
  if (data) {
    verifyStatus.value = data.status
    isMinor.value = data.is_minor
  }
}

// ✅ 修正：使用 user_id 查询，保持代码一致性
const fetchMyProjects = async () => {
  const { data } = await supabase.from('projects').select('*').eq('user_id', userStore.user.id)
  if (data) myProjects.value = data
}

const fetchMyTasks = async () => {
  // 这里的 assignee_id 保持原样，因为你之前的代码就是 assignee_id
  const { data } = await supabase.from('project_tasks_v2').select('*').eq('assignee_id', userStore.user.id)
  if (data) myTasks.value = data
}

const fetchContributions = async () => {
  const userId = userStore.user.id
  const [imgs, revs] = await Promise.all([
    getMyImages(userId),
    getMyWikiRevisions(userId)
  ])
  myImages.value = imgs
  myRevisions.value = revs
}

const getStatusLabel = (status) => {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已驳回'
  return '审核中'
}
const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return `${d.getMonth()+1}/${d.getDate()}`
}

const triggerAvatarUpload = () => fileInput.value.click()
const handleAvatarUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  try {
    const url = await uploadImage('user_uploads', 'avatars', file)
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userStore.user.id)
    await userStore.initialize() 
    alert('头像更新成功')
  } catch (e) {
    alert('上传失败: ' + e.message)
  }
}

const saveProfile = async () => {
  if (!editForm.username.trim()) return
  try {
    await supabase.from('profiles').update({ username: editForm.username }).eq('id', userStore.user.id)
    await userStore.initialize()
    showEditModal.value = false
    alert('资料已更新')
  } catch (e) {
    alert('保存失败')
  }
}

const handleLogout = async () => {
  await userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
/* 继承原有的样式 */
.dashboard-container { max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: 'Segoe UI', sans-serif; min-height: 80vh; }
.floating-nav { position: fixed; bottom: 30px; left: 20px; display: flex; flex-direction: column; gap: 10px; }
.floating-nav button { width: 40px; height: 40px; border-radius: 50%; border: none; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); cursor: pointer; font-size: 20px; }

.profile-header { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; gap: 30px; align-items: center; margin-bottom: 30px; }
.avatar-wrapper { position: relative; width: 90px; height: 90px; border-radius: 50%; overflow: hidden; cursor: pointer; border: 4px solid #e0f2f1; }
.user-avatar { width: 100%; height: 100%; object-fit: cover; }
.avatar-overlay { position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.6); color: white; font-size: 10px; text-align: center; padding: 3px 0; opacity: 0; transition: 0.2s; }
.avatar-wrapper:hover .avatar-overlay { opacity: 1; }
.info { flex: 1; }
.username { margin: 0 0 5px 0; font-size: 24px; display: flex; align-items: center; gap: 10px; color: #333; }
.uid-tag { margin: 0 0 5px 0; font-size: 14px; color: #39C5BB; font-weight: bold; font-family: 'Courier New', monospace; background: #e0f2f1; display: inline-block; padding: 2px 6px; border-radius: 4px; }
.role-tag { font-size: 12px; background: #673ab7; color: white; padding: 2px 8px; border-radius: 4px; vertical-align: middle; }
.email { margin: 0; color: #888; font-size: 14px; }
.badges { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.badge { background: #e0f2f1; color: #00695c; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.badge.verified { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.badge.verified.minor { background: #fff3e0; color: #ef6c00; }
.badge.pending { background: #fff3e0; color: #ef6c00; }
.badge.unverified { background: #ffebee; color: #c62828; border: 1px dashed #ffcdd2; cursor: pointer; }

.actions { display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
.btn-row { display: flex; gap: 10px; }
.btn-verify { background: #39C5BB; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; box-shadow: 0 4px 10px rgba(57,197,187,0.2); animation: pulse 2s infinite; }
.btn-admin { background: #673ab7; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; }
.btn-circle { background: #ff9800; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; }
.btn-edit, .btn-logout { background: white; border: 1px solid #ddd; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #666; }
.btn-logout { color: #f44336; border-color: #ffcdd2; }

/* 标签页 */
.tabs { display: flex; gap: 20px; border-bottom: 1px solid #eee; margin-bottom: 20px; }
.tabs button { background: none; border: none; padding: 10px 0; font-size: 16px; color: #666; cursor: pointer; border-bottom: 3px solid transparent; transition: 0.2s; }
.tabs button.active { color: #39C5BB; border-bottom-color: #39C5BB; font-weight: bold; }

/* ✅ 子标签页 (我的投稿) */
.sub-tabs { display: flex; gap: 10px; margin-bottom: 15px; }
.sub-tabs button { background: #f5f5f5; border: none; padding: 5px 12px; border-radius: 20px; font-size: 13px; color: #666; cursor: pointer; }
.sub-tabs button.active { background: #39C5BB; color: white; font-weight: bold; }

.pane-actions { text-align: right; margin-bottom: 15px; }
.btn-small { background: #e0f2f1; color: #00695c; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; }

/* 列表样式 */
.list-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }
.mini-card { background: white; border: 1px solid #eee; border-radius: 8px; overflow: hidden; cursor: pointer; transition: 0.2s; }
.mini-card:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
.mini-cover { width: 100%; height: 100px; object-fit: cover; }
.card-text { padding: 10px; }
.name { display: block; font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { font-size: 11px; color: #999; }

.simple-list { display: flex; flex-direction: column; gap: 10px; }
.list-row { display: flex; align-items: center; background: white; padding: 10px; border-radius: 8px; border: 1px solid #eee; cursor: pointer; transition: 0.2s; }
.list-row:hover { border-color: #39C5BB; }
.row-title { flex: 1; font-weight: 500; font-size: 14px; }
.row-status { font-size: 12px; padding: 2px 6px; border-radius: 4px; background: #eee; color: #666; }

/* ✅ 返图卡片特殊样式 */
.gallery-card .img-wrapper { position: relative; height: 140px; }
.gallery-card .mini-cover { height: 100%; }
.status-badge-corner { position: absolute; top: 5px; right: 5px; font-size: 10px; padding: 2px 6px; border-radius: 4px; color: white; font-weight: bold; }
.status-badge-corner.approved { background: #4caf50; }
.status-badge-corner.rejected { background: #f44336; }
.status-badge-corner.pending { background: #ff9800; }
.caption-text { font-size: 12px; color: #666; background: #f5f5f5; padding: 4px; margin: 5px 0 0 0; border-radius: 4px; }
.date-text { font-size: 11px; color: #ccc; margin-top: 5px; display: block; text-align: right; }

/* ✅ 纠错行特殊样式 */
.revision-row { justify-content: space-between; align-items: flex-start; }
.row-left { display: flex; gap: 10px; flex: 1; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.status-dot.approved { background: #4caf50; }
.status-dot.rejected { background: #f44336; }
.status-dot.pending { background: #ff9800; }
.row-desc { font-size: 12px; color: #888; margin: 2px 0 0 0; }
.row-right { text-align: right; display: flex; flex-direction: column; gap: 2px; }
.status-text { font-size: 12px; font-weight: bold; }
.status-text.approved { color: #4caf50; }
.status-text.pending { color: #ff9800; }
.status-text.rejected { color: #f44336; }

.empty-state { text-align: center; padding: 40px; color: #aaa; font-style: italic; background: #f9f9f9; border-radius: 8px; }

/* 弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal { background: white; padding: 25px; border-radius: 12px; width: 350px; }
.modal-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-top: 5px; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.modal-actions button { padding: 8px 15px; border-radius: 6px; cursor: pointer; border: 1px solid #ddd; background: white; }
.btn-primary { background: #39C5BB !important; color: white !important; border: none !important; }

@media (max-width: 600px) {
  .profile-header { flex-direction: column; text-align: center; }
  .actions { width: 100%; align-items: center; }
  .btn-row { width: 100%; justify-content: center; }
}
</style>