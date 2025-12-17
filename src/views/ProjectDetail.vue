<template>
  <div class="project-detail-container">
    <div v-if="loading" class="loading-box"><div class="spinner"></div><p>读取档案中...</p></div>
    
    <div v-else-if="project" class="project-content">
      <div class="header-section">
        <button class="btn-back" @click="$router.push('/projects')">⬅ 返回大厅</button>
        
        <div class="project-card-top">
          <div class="cover-img" :style="project.image_url ? { backgroundImage: `url(${project.image_url})` } : { backgroundColor: '#eee' }">
            <span class="status-badge-lg" :class="project.recruit_status">{{ getStatusText(project.recruit_status) }}</span>
          </div>
          
          <div class="info-area">
            <div class="top-row">
              <h1 class="p-title">{{ project.name }}</h1>
              <button v-if="isManager" @click="openManagePanel" class="btn-manage-main">⚙️ 主催管理控制台</button>
            </div>
            
            <div class="meta-data">
              <span>📅 {{ formatDate(project.start_date) }} - {{ formatDate(project.end_date) }}</span>
              <span>👤 发起人: {{ project.uploader_name }}</span>
              <span>👥 成员: {{ members.length }}人</span>
              <span>🔥 浏览: {{ project.view_count || 0 }}</span>
            </div>

            <div class="tags-area">
               <span class="type-tag">{{ project.project_type }}</span>
               <div v-if="project.external_links && project.external_links.length > 0">
                 <a v-for="(link, i) in project.external_links" :key="i" :href="link.url" target="_blank" class="ext-link">🔗 {{ link.name }}</a>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div class="nav-tabs">
        <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">🏠 概览与相册</button>
        <button :class="{ active: currentTab === 'timeline' }" @click="currentTab = 'timeline'">{{ getTabIcon('timeline') }} 进度 ({{ timeline.length }})</button>
        <button :class="{ active: currentTab === 'tasks' }" @click="currentTab = 'tasks'">{{ getTabIcon('tasks') }} 任务 ({{ tasks.length }})</button>
        <button :class="{ active: currentTab === 'team' }" @click="currentTab = 'team'">{{ getTabIcon('team') }} 团队成员 ({{ members.length }})</button>
        <button :class="{ active: currentTab === 'internal' }" @click="currentTab = 'internal'">🔒 内部讨论</button>
        <button :class="{ active: currentTab === 'public' }" @click="currentTab = 'public'">{{ getTabIcon('guest_comments') }} 游客留言</button>
      </div>

      <div class="tab-content-area">
        
        <div v-if="currentTab === 'overview'" class="tab-pane">
          <div class="desc-card">
            <h3>📜 企划介绍</h3>
            <p style="white-space: pre-wrap;">{{ project.description || '暂无详细介绍' }}</p>
          </div>
          <div class="gallery-section">
             <h3>🎨 创作展示 / 设定集</h3>
             <div v-if="project.gallery_urls && project.gallery_urls.length" class="gallery-grid">
               <div v-for="(img, idx) in project.gallery_urls" :key="idx" class="gallery-item" @click="viewImage(img)">
                 <img :src="img" loading="lazy">
               </div>
             </div>
             <div v-else class="empty-text">暂无展示图片，主催可在管理后台上传</div>
          </div>
        </div>

        <div v-if="currentTab === 'timeline'" class="tab-pane">
          <div v-if="!canView('timeline')" class="lock-screen">🔒 该区域仅对内部可见</div>
          <div v-else>
            <div v-if="isManager" class="mini-form">
              <input v-model="newTimeline.title" placeholder="输入里程碑 (如: PV发布)" class="std-input">
              <input type="date" v-model="newTimeline.date" class="std-input" title="不填默认今天">
              <button @click="addTimeline" class="btn-mini-save">添加节点</button>
            </div>
            <div class="timeline-list">
              <div v-for="node in timeline" :key="node.id" class="t-node" :class="{ done: node.is_completed }">
                 <div class="t-line"></div><div class="t-dot" @click="isManager && toggleTimeline(node)"></div>
                 <div class="t-info">
                   <div class="t-head"><strong>{{ node.title }}</strong><span class="t-date">{{ formatDate(node.event_date) }}</span></div>
                   <div class="t-meta">操作人: {{ node.profiles?.username || '未知' }}</div>
                   <button v-if="isManager" @click="deleteTimeline(node.id)" class="del-text">删除</button>
                 </div>
              </div>
              <div v-if="timeline.length === 0" class="empty-mini">暂无进度节点</div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'tasks'" class="tab-pane">
          <div v-if="!canView('tasks')" class="lock-screen">🔒 该区域仅对内部可见</div>
          <div v-else>
            <div v-if="isManager" class="mini-form">
              <input v-model="newTask.content" placeholder="快速发布任务..." class="std-input grow">
              <button @click="showTaskModal = true" class="btn-mini-save">高级发布</button>
            </div>
            <div class="task-grid-view">
               <div v-for="task in tasks" :key="task.id" class="task-box">
                  <div class="task-status-bar" :class="task.status"></div>
                  <div class="task-main">
                    
                    <div class="task-head-row">
                      <h4>{{ task.content }}</h4>
                      <span v-if="task.is_collaborative" class="tag-collab">👥 多人协作</span>
                    </div>

                    <div class="task-assignee">
                      <div v-if="task.is_collaborative" class="multi-avatars">
                        <span v-if="!task.claimants || task.claimants.length === 0" class="unassigned">⏳ 待认领 (可多人)</span>
                        <div v-else class="avatar-row">
                          <span v-for="u in task.claimants" :key="u.id" class="mini-u" :title="u.username">🏃 {{ u.username }}</span>
                        </div>
                      </div>
                      <div v-else>
                        <span v-if="task.assignee?.username">🏃 {{ task.assignee.username }}</span>
                        <span v-else class="unassigned">⏳ 待认领 (单人)</span>
                      </div>
                    </div>

                    <div class="task-dates">{{ formatDate(task.start_at) }} - {{ formatDate(task.end_at) }}</div>
                    
                    <div class="task-btns">
                       <button v-if="canClaim(task)" @click="claimTask(task)" class="btn-claim">✋ 认领</button>
                       <button v-if="canReturn(task)" @click="returnTask(task)" class="btn-return">↩️ 退回</button>

                       <button v-if="isManager" @click="deleteTask(task.id)" class="btn-del">🗑️</button>
                       <button v-if="isManager || isTaskOwner(task)" @click="toggleTaskStatus(task)" class="btn-check">
                         {{ task.status === 'done' ? '重做' : '完成' }}
                       </button>
                    </div>
                  </div>
               </div>
               <div v-if="tasks.length === 0" class="empty-mini">暂无任务</div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'team'" class="tab-pane">
          <div v-if="!canView('team')" class="lock-screen">🔒 团队名单仅对内部可见</div>
          <div v-else class="team-list">
            <div class="team-header-row">
              <span>成员</span><span>身份/头衔</span><span>当前任务</span><span>加入时间</span><span>操作</span>
            </div>
            <div v-for="m in members" :key="m.id" class="team-row">
              <div class="m-name">{{ m.profiles?.username || '未知用户' }}</div>
              <div class="m-role">
                <span class="role-tag" :class="getRoleClass(m.role)">{{ m.role || '成员' }}</span>
                <button v-if="isManager" @click="openRoleModal(m)" class="btn-edit-role">✎</button>
              </div>
              <div class="m-tasks">{{ getMemberTaskCount(m.user_id) }} 个进行中</div>
              <div class="m-join">{{ formatDate(m.joined_at || m.created_at) }}</div>
              <div class="m-action">
                <button v-if="isManager && m.user_id !== currentUser.id" @click="kickMember(m)" class="btn-kick">移出</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'internal'" class="tab-pane chat-pane">
           <div v-if="!isMember" class="lock-screen">🔒 内部讨论区仅限成员查看</div>
           <template v-else>
             <div class="chat-window" ref="internalChatRef">
               <div v-for="msg in internalComments" :key="msg.id">
                 <div v-if="msg.type === 'system'" class="sys-msg-row">
                   <span class="sys-pill">📢 {{ msg.content }} <small>{{ formatTime(msg.created_at) }}</small></span>
                 </div>
                 <div v-else class="chat-msg" :class="{ mine: msg.user_id === currentUser?.id }">
                   <div class="msg-meta">{{ msg.profiles?.username || '成员' }} · {{ formatTime(msg.created_at) }}</div>
                   <div class="msg-bubble internal">{{ msg.content }}</div>
                 </div>
               </div>
             </div>
             <div class="chat-input">
               <input v-model="newInternalMsg" placeholder="发布内部通知或讨论..." @keyup.enter="sendInternalMsg">
               <button @click="sendInternalMsg">发送</button>
             </div>
           </template>
        </div>

        <div v-if="currentTab === 'public'" class="tab-pane chat-pane">
           <div v-if="!canView('guest_comments')" class="lock-screen">🔒 留言区已关闭</div>
           <template v-else>
             <div class="chat-window" ref="publicChatRef">
               <div v-if="publicComments.length === 0" class="empty-text">暂时没有游客留言</div>
               <div v-for="msg in publicComments" :key="msg.id" class="chat-msg public">
                 <div class="msg-meta">{{ msg.profiles?.username || '路人' }} · {{ formatTime(msg.created_at) }}</div>
                 <div class="msg-bubble">{{ msg.content }}</div>
                 <button v-if="isManager" @click="deleteComment(msg.id)" class="del-cmt">×</button>
               </div>
             </div>
             <div class="chat-input">
               <input v-model="newPublicMsg" placeholder="支持一下..." @keyup.enter="sendPublicMsg">
               <button @click="sendPublicMsg">留言</button>
             </div>
           </template>
        </div>

      </div>
    </div>

    <div v-if="showManagePanel" class="modal-overlay full-screen">
      <div class="manager-console">
        <div class="console-header">
          <h2>🛠️ 主催管理控制台</h2>
          <button @click="showManagePanel = false" class="btn-close-console">退出管理</button>
        </div>
        
        <div class="console-body">
          <section class="console-section">
            <h3>👀 模块可见性设置 (权限管理)</h3>
            <div class="visibility-grid">
              <div class="v-row"><span>⏳ 进度条</span><select v-model="visibilityForm.timeline"><option value="public">🌏 公开</option><option value="team">🔒 仅团队</option></select></div>
              <div class="v-row"><span>✅ 任务板</span><select v-model="visibilityForm.tasks"><option value="public">🌏 公开</option><option value="team">🔒 仅团队</option></select></div>
              <div class="v-row"><span>👥 团队名单</span><select v-model="visibilityForm.team"><option value="public">🌏 公开</option><option value="team">🔒 仅团队</option></select></div>
              <div class="v-row"><span>💬 游客留言</span><select v-model="visibilityForm.guest_comments"><option value="public">🌏 开启</option><option value="team">🚫 关闭</option></select></div>
            </div>
          </section>

          <section class="console-section">
            <h3>🎨 相册管理</h3>
            <div class="form-grid">
               <div class="grp full">
                 <label>上传相册图片</label>
                 <div class="upload-bar">
                   <input type="file" multiple accept="image/*" @change="handleAlbumUpload" :disabled="uploadingAlbum">
                   <span v-if="uploadingAlbum">上传中...</span>
                 </div>
                 <div class="preview-grid-mini">
                   <div v-for="(url, idx) in galleryUrls" :key="idx" class="pg-item">
                     <img :src="url">
                     <button @click="removeGalleryImage(idx)" class="btn-x">×</button>
                   </div>
                 </div>
               </div>
               <div class="grp full"><label>头图 URL</label><input v-model="editForm.image_url"></div>
            </div>
          </section>

          <section class="console-section">
            <h3>🔑 邀请码管理</h3>
            <div class="invite-toolbar">
              <button @click="generateInvite" class="btn-action-sm">✨ 生成新邀请码</button>
            </div>
            <div class="invite-table-box">
              <div v-for="inv in activeInvites" :key="inv.id" class="invite-row-mini">
                <span class="code-font">{{ inv.code }}</span>
                <button @click="deleteInvite(inv.id)" class="btn-text-danger">关闭</button>
              </div>
              <div v-if="activeInvites.length===0" class="empty-mini">暂无</div>
            </div>
          </section>

          <section class="console-section">
            <h3>📝 基础信息修改</h3>
            <div class="form-grid">
               <div class="grp"><label>标题</label><input v-model="editForm.name"></div>
               <div class="grp"><label>状态</label>
                 <select v-model="editForm.recruit_status">
                   <option value="recruiting">招募中</option><option value="ongoing">进行中</option><option value="paused">⏸ 暂停</option><option value="ended">✅ 已完结</option>
                 </select>
               </div>
               <div class="grp full"><label>描述</label><textarea v-model="editForm.description" rows="3"></textarea></div>
            </div>
          </section>

          <div class="console-footer">
             <button @click="saveSettings" class="btn-save-lg">💾 保存所有配置</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showTaskModal" class="modal-overlay">
      <div class="modal-content">
        <h3>发布任务</h3>
        <input v-model="newTask.content" class="std-input" placeholder="任务内容">
        <div class="row"><div class="col"><label>开始</label><input type="date" v-model="newTask.start_at" class="std-input"></div><div class="col"><label>结束</label><input type="date" v-model="newTask.end_at" class="std-input"></div></div>
        
        <div class="checkbox-group">
          <label><input type="checkbox" v-model="newTask.is_open_claim"> 开放认领</label>
          <label class="collab-check"><input type="checkbox" v-model="newTask.is_collaborative"> 👥 允许多人协作</label>
        </div>

        <div class="modal-actions"><button @click="showTaskModal=false">取消</button><button @click="addTask" class="confirm">发布</button></div>
      </div>
    </div>

    <div v-if="showRoleModal" class="modal-overlay">
      <div class="modal-content">
        <h3>修改成员头衔</h3>
        <p>当前成员: <strong>{{ targetMember?.profiles?.username }}</strong></p>
        <div class="preset-roles"><span v-for="r in PRESET_ROLES" :key="r" class="role-chip" @click="roleInput = r">{{ r }}</span></div>
        <input v-model="roleInput" placeholder="输入自定义头衔" class="std-input">
        <div class="modal-actions"><button @click="showRoleModal=false">取消</button><button @click="confirmRoleUpdate" class="confirm">保存</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id
const PRESET_ROLES = ['主催', '副主催', '画师', 'PV', '作曲', '作词', '调音', '混音', '剧本', '财务', '外勤', '协力']

// 数据
const project = ref(null)
const timeline = ref([])
const tasks = ref([])
const members = ref([])
const internalComments = ref([])
const publicComments = ref([])
const activeInvites = ref([])
const currentUser = ref(null)

// 状态
const loading = ref(true)
const currentTab = ref('overview')
const showManagePanel = ref(false)
const showTaskModal = ref(false)
const showRoleModal = ref(false)
const uploadingAlbum = ref(false)

// 表单
const editForm = ref({})
const visibilityForm = ref({ timeline: 'public', tasks: 'public', team: 'public', guest_comments: 'public' })
const galleryUrls = ref([]) 
const linkJson = ref('[]')
const newTimeline = ref({ title: '', date: '' })
const newTask = ref({ content: '', start_at: '', end_at: '', is_open_claim: true, is_collaborative: false })
const newInternalMsg = ref('')
const newPublicMsg = ref('')
const targetMember = ref(null)
const roleInput = ref('')

const isManager = computed(() => currentUser.value && project.value && currentUser.value.id === project.value.uploader_id)
const isMember = computed(() => {
   if (!currentUser.value) return false
   return members.value.some(m => m.user_id === currentUser.value.id) || isManager.value
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
  await initData()
})

const initData = async () => {
  loading.value = true
  await fetchProject()
  if (project.value) {
    await Promise.all([
      fetchTimeline(), fetchTasks(), fetchMembers(), fetchComments('internal'), fetchComments('public')
    ])
  }
  loading.value = false
}

// ---------------------- 数据获取 ----------------------

const fetchProject = async () => {
  const { data } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (data) {
    let uploaderName = '未知'
    if (data.uploader_id) {
       const { data: u } = await supabase.from('profiles').select('username').eq('id', data.uploader_id).single()
       if (u) uploaderName = u.username
    }
    project.value = { ...data, uploader_name: uploaderName }
    editForm.value = { ...data }
    galleryUrls.value = data.gallery_urls || []
    linkJson.value = JSON.stringify(data.external_links || [])
    if (data.visibility_settings) visibilityForm.value = { ...visibilityForm.value, ...data.visibility_settings }
  }
}

const mapProfiles = async (items, idField, targetField = 'profiles') => {
  if (!items || items.length === 0) return []
  const ids = [...new Set(items.map(i => i[idField]).filter(Boolean))]
  if (ids.length === 0) return items
  const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ids)
  return items.map(item => {
    const p = profiles?.find(p => p.id === item[idField])
    return { ...item, [targetField]: p || { username: '未知' } }
  })
}

const fetchTimeline = async () => { const { data } = await supabase.from('project_timeline_v2').select('*').eq('project_id', projectId).order('event_date'); timeline.value = await mapProfiles(data, 'created_by', 'profiles') }

// 🔥 获取任务 (含多人协作)
const fetchTasks = async () => { 
  const { data: taskData } = await supabase.from('project_tasks_v2').select('*').eq('project_id', projectId).order('created_at');
  if (!taskData) { tasks.value = []; return }

  let tasksWithSingle = await mapProfiles(taskData, 'assignee_id', 'assignee')

  const multiTaskIds = tasksWithSingle.filter(t => t.is_collaborative).map(t => t.id)
  if (multiTaskIds.length > 0) {
    const { data: claims } = await supabase.from('project_task_claims').select('*').in('task_id', multiTaskIds)
    const claimUserIds = [...new Set(claims?.map(c => c.user_id) || [])]
    let userMap = {}
    if (claimUserIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', claimUserIds)
      profiles?.forEach(p => userMap[p.id] = p)
    }
    tasksWithSingle = tasksWithSingle.map(t => {
      if (t.is_collaborative) {
        const myClaims = claims?.filter(c => c.task_id === t.id) || []
        t.claimants = myClaims.map(c => userMap[c.user_id] || { username: '未知' }).filter(u => u)
      }
      return t
    })
  }
  tasks.value = tasksWithSingle
}

const fetchMembers = async () => { const { data } = await supabase.from('project_members').select('*').eq('project_id', projectId); members.value = await mapProfiles(data, 'user_id', 'profiles') }
const fetchComments = async (type) => { 
  let query = supabase.from('project_comments').select('*').eq('project_id', projectId).order('created_at')
  if (type === 'internal') query = query.in('type', ['internal', 'system'])
  else query = query.eq('type', type)
  const { data } = await query
  const mapped = await mapProfiles(data, 'user_id', 'profiles')
  if (type === 'internal') internalComments.value = mapped; else publicComments.value = mapped 
}
const fetchInvites = async () => { const { data } = await supabase.from('project_invites').select('*').eq('project_id', projectId).order('created_at', { ascending: false }); activeInvites.value = data || [] }

// 权限与辅助
const canView = (section) => { if (isMember.value || isManager.value) return true; const setting = project.value?.visibility_settings?.[section] || 'public'; return setting === 'public' }
const getTabIcon = (section) => canView(section) ? '' : '🔒'
const getUserName = () => currentUser.value?.user_metadata?.username || '某位成员'
const logSystemAction = async (action, details) => { await supabase.from('project_comments').insert({ project_id: projectId, content: details, type: 'system', user_id: currentUser.value.id }); fetchComments('internal') }

// ✅ 补全缺失的辅助函数
const getStatusText = (s) => ({ recruiting:'招募中', ongoing:'进行中', paused:'暂停中', ended:'已完结' }[s] || s)
const getRoleClass = (r) => { if (!r) return 'common'; if (r.includes('主催') || r.includes('Owner')) return 'owner'; if (r.includes('副') || r.includes('Admin')) return 'admin'; return 'common' }
const formatDate = (s) => s ? s.split('T')[0] : '待定'
const formatTime = (s) => new Date(s).toLocaleString()
const viewImage = (url) => window.open(url, '_blank')

// ---------------------- 任务逻辑 ----------------------

const isTaskOwner = (task) => {
  if (task.is_collaborative) return task.claimants?.some(u => u.id === currentUser.value.id)
  else return task.assignee_id === currentUser.value.id
}

const canClaim = (task) => {
  if (!isMember.value) return false 
  if (!task.is_open_claim) return false
  if (task.is_collaborative) {
    const alreadyClaimed = task.claimants?.some(u => u.id === currentUser.value.id)
    return !alreadyClaimed
  } else {
    return !task.assignee_id
  }
}

const canReturn = (task) => {
  if (task.is_collaborative) return task.claimants?.some(u => u.id === currentUser.value.id)
  else return task.assignee_id === currentUser.value.id
}

const addTask = async () => {
  const { error } = await supabase.from('project_tasks_v2').insert({ 
    project_id: projectId, 
    content: newTask.value.content, 
    start_at: newTask.value.start_at || null, 
    end_at: newTask.value.end_at || null, 
    is_open_claim: newTask.value.is_open_claim, 
    is_collaborative: newTask.value.is_collaborative, 
    creator_id: currentUser.value.id 
  })
  if(error) alert('发布失败: '+ error.message); else { 
    showTaskModal.value = false; 
    await logSystemAction('task_create', `${getUserName()} 发布了新任务: ${newTask.value.content}`)
    newTask.value.content = ''; fetchTasks() 
  }
}

const claimTask = async (task) => { 
  if(!confirm('确认认领此任务？')) return
  if (task.is_collaborative) {
    const { error } = await supabase.from('project_task_claims').insert({ task_id: task.id, user_id: currentUser.value.id })
    if (error) return alert('认领失败:' + error.message)
  } else {
    await supabase.from('project_tasks_v2').update({ assignee_id: currentUser.value.id }).eq('id', task.id)
  }
  await logSystemAction('task_claim', `${getUserName()} 认领了任务: ${task.content}`)
  setTimeout(() => { fetchTasks(); fetchMembers() }, 500) 
}

const returnTask = async (task) => {
  if(!confirm('确定退回/放弃此任务吗？')) return
  if (task.is_collaborative) {
    await supabase.from('project_task_claims').delete().eq('task_id', task.id).eq('user_id', currentUser.value.id)
  } else {
    await supabase.from('project_tasks_v2').update({ assignee_id: null }).eq('id', task.id)
  }
  await logSystemAction('task_return', `${getUserName()} 退回了任务: ${task.content}`)
  setTimeout(() => { fetchTasks() }, 500)
}

// ---------------------- 其他逻辑 ----------------------

const openManagePanel = () => { showManagePanel.value = true; fetchInvites() }
const handleAlbumUpload = async (event) => {
  const files = event.target.files; if (!files || files.length === 0) return; uploadingAlbum.value = true; let count = 0
  try { for (const file of files) { const fileExt = file.name.split('.').pop(); const fileName = `album/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`; await supabase.storage.from('user_uploads').upload(fileName, file); const { data: { publicUrl } } = supabase.storage.from('user_uploads').getPublicUrl(fileName); galleryUrls.value.push(publicUrl); count++ }
    if (count > 0) await logSystemAction('gallery', `${getUserName()} 上传了 ${count} 张新图片`)
  } catch (e) { alert('上传失败') } finally { uploadingAlbum.value = false }
}
const removeGalleryImage = (idx) => { galleryUrls.value.splice(idx, 1) }
const saveSettings = async () => {
  try { const links = JSON.parse(linkJson.value); await supabase.from('projects').update({ name: editForm.value.name, description: editForm.value.description, recruit_status: editForm.value.recruit_status, image_url: editForm.value.image_url, gallery_urls: galleryUrls.value, external_links: links, visibility_settings: visibilityForm.value }).eq('id', projectId); await logSystemAction('update_info', `${getUserName()} 更新了企划设置`); alert('保存成功'); showManagePanel.value = false; fetchProject() } catch (e) { alert('保存失败') }
}
const addTimeline = async () => { if(!newTimeline.value.title) return alert('请输入内容'); const dateToUse = newTimeline.value.date || new Date().toISOString(); await supabase.from('project_timeline_v2').insert({ project_id: projectId, title: newTimeline.value.title, event_date: dateToUse, created_by: currentUser.value.id }); await logSystemAction('timeline', `${getUserName()} 新增进度: ${newTimeline.value.title}`); newTimeline.value = {title:'', date:''}; fetchTimeline() }
const toggleTaskStatus = async(t) => { const newS = t.status === 'done' ? 'todo' : 'done'; await supabase.from('project_tasks_v2').update({ status: newS }).eq('id', t.id); if (newS === 'done') await logSystemAction('task_done', `${getUserName()} 完成了任务: ${t.content}`); fetchTasks() }
const openRoleModal = (m) => { targetMember.value = m; roleInput.value = m.role || ''; showRoleModal.value = true }
const confirmRoleUpdate = async () => { if (!targetMember.value) return; const { error } = await supabase.from('project_members').update({ role: roleInput.value }).eq('id', targetMember.value.id); if (!error) { await logSystemAction('role_change', `${getUserName()} 将 ${targetMember.value.profiles?.username} 的头衔更改为 [${roleInput.value}]`); targetMember.value.role = roleInput.value; showRoleModal.value = false } }
const kickMember = async(m) => { if(confirm(`踢出?`)) { await supabase.from('project_members').delete().eq('id', m.id); await logSystemAction('kick', `${getUserName()} 将 ${m.profiles?.username} 移出了团队`); fetchMembers() } }
const generateInvite = async () => { const code = Math.random().toString(36).slice(2, 8).toUpperCase(); const expiresAt = new Date(Date.now() + 86400000 * 7).toISOString(); const { error } = await supabase.from('project_invites').insert({ project_id: projectId, code, creator_id: currentUser.value.id, created_by: currentUser.value.id, expires_at: expiresAt }); if (error) alert('生成失败'); else await fetchInvites() }
const deleteInvite = async (id) => { if(!confirm('确定撤销？')) return; await supabase.from('project_invites').delete().eq('id', id); fetchInvites() }
const sendInternalMsg = async () => { if(!newInternalMsg.value) return; const {error} = await supabase.from('project_comments').insert({ project_id: projectId, user_id: currentUser.value.id, content: newInternalMsg.value, type: 'internal' }); if(error) alert('发送失败'); else { newInternalMsg.value = ''; fetchComments('internal') } }
const sendPublicMsg = async () => { if(!newPublicMsg.value) return; const {error} = await supabase.from('project_comments').insert({ project_id: projectId, user_id: currentUser.value.id, content: newPublicMsg.value, type: 'public' }); if(error) alert('发送失败'); else { newPublicMsg.value = ''; fetchComments('public') } }
const deleteTimeline = async(id) => { if(confirm('删?')) await supabase.from('project_timeline_v2').delete().eq('id', id); fetchTimeline() }
const deleteTask = async(id) => { if(confirm('删?')) await supabase.from('project_tasks_v2').delete().eq('id', id); fetchTasks() }
const deleteComment = async(id) => { if(confirm('删?')) { await supabase.from('project_comments').delete().eq('id', id); fetchComments('public'); fetchComments('internal') } }
const getMemberTaskCount = (uid) => tasks.value.filter(t => t.assignee_id === uid && t.status !== 'done').length
</script>

<style scoped>
.project-detail-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; background: #f0f2f5; min-height: 100vh; }
.loading-box { text-align: center; padding: 100px; color: #999; }
.header-section { margin-bottom: 20px; }
.btn-back { background: white; border: 1px solid #ddd; padding: 6px 15px; border-radius: 20px; cursor: pointer; margin-bottom: 15px; font-weight: bold; color: #555; }
.project-card-top { background: white; border-radius: 16px; overflow: hidden; display: flex; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
.cover-img { width: 360px; height: 260px; background-size: cover; background-position: center; position: relative; }
.status-badge-lg { position: absolute; top: 15px; left: 15px; padding: 6px 12px; border-radius: 6px; color: white; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); }
.status-badge-lg.recruiting { background: #39C5BB; } .status-badge-lg.paused { background: #f39c12; }
.info-area { padding: 30px; flex: 1; position: relative; }
.top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
.p-title { margin: 0; font-size: 32px; color: #333; }
.btn-manage-main { background: #2c3e50; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 10px rgba(44,62,80,0.3); transition: 0.2s; }
.btn-manage-main:hover { transform: translateY(-2px); }
.meta-data { display: flex; gap: 20px; color: #666; font-size: 14px; margin-bottom: 20px; }
.tags-area { display: flex; gap: 10px; align-items: center; }
.type-tag { background: #f3e5f5; color: #8e24aa; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.ext-link { color: #39C5BB; text-decoration: none; font-size: 13px; border: 1px solid #e0f2f1; padding: 2px 8px; border-radius: 12px; }
.nav-tabs { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px; }
.nav-tabs button { padding: 10px 20px; border: none; background: white; border-radius: 8px; font-weight: bold; color: #666; cursor: pointer; transition: 0.2s; white-space: nowrap; }
.nav-tabs button.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57,197,187,0.3); }
.tab-content-area { min-height: 400px; }
.tab-pane { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
.gallery-item { height: 150px; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; }
.gallery-item:hover { border-color: #39C5BB; }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; }
.timeline-list { max-width: 800px; }
.t-node { display: flex; gap: 15px; margin-bottom: 25px; position: relative; }
.t-line { position: absolute; left: 5px; top: 12px; bottom: -35px; width: 2px; background: #eee; }
.t-node:last-child .t-line { display: none; }
.t-dot { width: 12px; height: 12px; background: white; border: 3px solid #ccc; border-radius: 50%; z-index: 1; margin-top: 5px; cursor: pointer; }
.t-node.done .t-dot { border-color: #39C5BB; background: #39C5BB; }
.t-info { background: #f9f9f9; padding: 12px; border-radius: 8px; flex: 1; }
.t-head { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 15px; }
.t-date { font-size: 12px; color: #999; font-family: monospace; }
.t-meta { font-size: 12px; color: #aaa; }
.task-grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
.task-box { border: 1px solid #eee; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
.task-status-bar { height: 6px; width: 100%; background: #ddd; }
.task-status-bar.done { background: #39C5BB; }
.task-main { padding: 15px; flex: 1; display: flex; flex-direction: column; }
.task-head-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.task-main h4 { margin: 0; font-size: 16px; flex: 1; }
.tag-collab { font-size: 10px; background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 10px; white-space: nowrap; margin-left: 5px; }
.task-assignee { font-size: 13px; margin-bottom: 10px; flex: 1; }
.unassigned { color: #f39c12; font-style: italic; }
.multi-avatars { display: flex; flex-direction: column; gap: 5px; }
.avatar-row { display: flex; flex-wrap: wrap; gap: 5px; }
.mini-u { background: #f0f0f0; padding: 2px 6px; border-radius: 10px; font-size: 11px; }
.task-dates { font-size: 11px; color: #999; margin-bottom: 10px; }
.task-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: auto; }
.btn-claim { background: #39C5BB; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-return { background: #ff9800; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-del { border: none; background: none; cursor: pointer; }
.btn-check { border: 1px solid #ddd; background: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.team-row { display: grid; grid-template-columns: 2fr 1fr 2fr 2fr 1fr; padding: 15px; border-bottom: 1px solid #eee; align-items: center; }
.team-header-row { display: grid; grid-template-columns: 2fr 1fr 2fr 2fr 1fr; padding: 10px 15px; background: #f9f9f9; font-weight: bold; color: #666; font-size: 13px; border-radius: 8px; }
.m-role { display: flex; align-items: center; gap: 8px; }
.role-tag { padding: 2px 6px; border-radius: 4px; font-size: 11px; color: white; background: #999; }
.role-tag.owner { background: #f39c12; }
.role-tag.admin { background: #00bcd4; }
.btn-edit-role { background: none; border: 1px solid #ddd; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #888; }
.btn-edit-role:hover { background: #39C5BB; color: white; border-color: #39C5BB; }
.btn-kick { color: #ff5252; border: 1px solid #ffcdd2; background: white; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.chat-window { height: 400px; overflow-y: auto; background: #fdfdfd; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
.sys-msg-row { text-align: center; margin: 10px 0; }
.sys-pill { background: #eee; color: #666; padding: 4px 12px; border-radius: 20px; font-size: 11px; }
.chat-msg { margin-bottom: 15px; }
.chat-msg.mine { text-align: right; }
.msg-bubble { display: inline-block; padding: 8px 14px; background: white; border: 1px solid #eee; border-radius: 12px; max-width: 70%; text-align: left; }
.internal { border-left: 3px solid #39C5BB; }
.chat-msg.mine .msg-bubble { background: #e0f2f1; border-color: #b2dfdb; color: #00695c; }
.chat-input { display: flex; gap: 10px; }
.chat-input input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.chat-input button { background: #39C5BB; color: white; border: none; padding: 0 20px; border-radius: 6px; cursor: pointer; }
.full-screen { align-items: flex-start; padding-top: 50px; }
.manager-console { width: 800px; max-height: 85vh; background: white; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
.console-header { padding: 20px; background: #2c3e50; color: white; display: flex; justify-content: space-between; align-items: center; }
.console-body { padding: 30px; overflow-y: auto; flex: 1; }
.console-section { margin-bottom: 30px; border-bottom: 1px dashed #eee; padding-bottom: 20px; }
.console-section h3 { margin-top: 0; color: #333; border-left: 4px solid #39C5BB; padding-left: 10px; }
.invite-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.btn-action-sm { background: #39C5BB; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.invite-table-box { background: #f9f9f9; padding: 15px; border-radius: 8px; }
.simple-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.simple-table th { text-align: left; color: #999; padding-bottom: 8px; border-bottom: 1px solid #eee; }
.simple-table td { padding: 8px 0; border-bottom: 1px solid #eee; }
.code-font { font-family: monospace; font-weight: bold; font-size: 14px; letter-spacing: 1px; color: #333; }
.tag-green { background: #e8f5e9; color: #2e7d32; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.btn-text-danger { border: none; background: none; color: #e57373; cursor: pointer; font-size: 12px; text-decoration: underline; }
.empty-mini { text-align: center; color: #bbb; padding: 10px; font-size: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.grp.full { grid-column: span 2; }
.grp label { display: block; font-weight: bold; margin-bottom: 5px; font-size: 13px; color: #666; }
.grp input, .grp select, .grp textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
.danger-zone { border: 1px solid #ffcdd2; background: #fff5f5; padding: 20px; border-radius: 8px; }
.danger-zone h3 { border-color: #ff5252; color: #c62828; }
.danger-actions-row { display: flex; gap: 15px; margin-bottom: 10px; }
.btn-danger-lg { background: #ff5252; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; flex: 1; }
.btn-warning-lg { background: #f39c12; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; flex: 1; }
.console-footer { padding: 20px; background: #f9f9f9; display: flex; justify-content: flex-end; gap: 15px; }
.btn-save-lg { background: #39C5BB; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 25px; border-radius: 12px; width: 400px; }
.std-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 10px; box-sizing: border-box; }
.row { display: flex; gap: 10px; } .col { flex: 1; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.modal-actions button { padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; }
.modal-actions button.confirm { background: #39C5BB; color: white; border: none; }
.preset-roles { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
.role-chip { font-size: 12px; background: #f0f2f5; padding: 4px 10px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
.role-chip:hover { background: #e0f2f1; color: #00695c; }
.lock-screen { padding: 40px; text-align: center; color: #999; background: #f9f9f9; border-radius: 8px; font-size: 14px; border: 1px dashed #ddd; margin-top: 20px; }
.section-desc { font-size: 12px; color: #666; margin-bottom: 10px; }
.visibility-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fbfa; padding: 15px; border-radius: 8px; border: 1px solid #e0f2f1; }
.v-row { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: bold; color: #555; }
.v-row select { padding: 6px; border-radius: 4px; border: 1px solid #ddd; }
.upload-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.preview-grid-mini { display: flex; gap: 10px; flex-wrap: wrap; }
.pg-item { width: 60px; height: 60px; position: relative; border-radius: 4px; overflow: hidden; border: 1px solid #ddd; }
.pg-item img { width: 100%; height: 100%; object-fit: cover; }
.btn-x { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.5); color: white; border: none; width: 20px; height: 20px; cursor: pointer; font-size: 12px; line-height: 1; }
.invite-row-mini { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
.checkbox-group { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.collab-check { color: #1565c0; font-weight: bold; }
</style>