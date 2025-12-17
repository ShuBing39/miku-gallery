<template>
    <div class="project-detail-container">
      <div v-if="loading" class="loading-box"><div class="spinner"></div><p>读取档案中...</p></div>
      
      <div v-else-if="project" class="project-content">
        <div class="header-section">
          <button class="btn-back" @click="$router.push('/projects')">⬅ 返回大厅</button>
          
          <div class="project-card-top">
            <div class="cover-img" :style="project.image_url ? { backgroundImage: `url(${project.image_url})` } : { backgroundColor: '#eee' }">
              <span class="status-badge-lg" :class="project.status">{{ getStatusText(project.status) }}</span>
            </div>
            
            <div class="info-area">
              <div class="top-row">
                <h1 class="p-title">{{ project.name }}</h1>
                <button v-if="isManager" @click="openManagePanel" class="btn-manage-main">⚙️ 主催管理控制台</button>
              </div>
              
              <div class="meta-data">
                <span>📅 {{ formatDate(project.start_date) }} - {{ formatDate(project.end_date) }}</span>
                <span>👤 主催: {{ project.uploader_name }}</span>
                <span>👥 成员: {{ members.length }}人</span>
                <span>🔥 浏览: {{ project.view_count || 0 }}</span>
              </div>
  
              <div class="tags-area">
                 <span class="type-tag">{{ project.project_type }}</span>
                 <a v-for="(link, i) in project.external_links" :key="i" :href="link.url" target="_blank" class="ext-link">🔗 {{ link.name }}</a>
              </div>
              
              <div v-if="inviteCode" class="invite-display">
                <span>内部邀请码: <strong class="code">{{ inviteCode }}</strong></span>
                <span class="tip">(发给协作者)</span>
                <button @click="inviteCode = null" class="close-inv">×</button>
              </div>
            </div>
          </div>
        </div>
  
        <div class="nav-tabs">
          <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">🏠 概览与相册</button>
          <button :class="{ active: currentTab === 'timeline' }" @click="currentTab = 'timeline'">⏳ 进度 ({{ timeline.length }})</button>
          <button :class="{ active: currentTab === 'tasks' }" @click="currentTab = 'tasks'">✅ 任务 ({{ tasks.length }})</button>
          <button :class="{ active: currentTab === 'team' }" @click="currentTab = 'team'">👥 团队监控 ({{ members.length }})</button>
          <button :class="{ active: currentTab === 'internal' }" @click="currentTab = 'internal'">🔒 内部讨论</button>
          <button :class="{ active: currentTab === 'public' }" @click="currentTab = 'public'">💬 游客留言</button>
        </div>
  
        <div class="tab-content-area">
          
          <div v-if="currentTab === 'overview'" class="tab-pane">
            <div class="desc-card">
              <h3>📜 详细规则</h3>
              <p>{{ project.description || '暂无详细介绍' }}</p>
            </div>
            <div class="gallery-section">
               <h3>🎨 创作展示 / 设定集</h3>
               <div v-if="project.gallery_urls && project.gallery_urls.length" class="gallery-grid">
                 <div v-for="(img, idx) in project.gallery_urls" :key="idx" class="gallery-item" @click="viewImage(img)">
                   <img :src="img" loading="lazy">
                 </div>
               </div>
               <div v-else class="empty-text">暂无展示图片，主催可在管理后台添加</div>
            </div>
          </div>
  
          <div v-if="currentTab === 'timeline'" class="tab-pane">
            <div v-if="isManager" class="mini-form">
              <input v-model="newTimeline.title" placeholder="新里程碑名称" class="std-input">
              <input type="date" v-model="newTimeline.date" class="std-input">
              <button @click="addTimeline" class="btn-mini-save">添加</button>
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
            </div>
          </div>
  
          <div v-if="currentTab === 'tasks'" class="tab-pane">
            <div v-if="isManager" class="mini-form">
              <input v-model="newTask.content" placeholder="发布新任务..." class="std-input grow">
              <button @click="showTaskModal = true" class="btn-mini-save">高级发布</button>
            </div>
            <div class="task-grid-view">
               <div v-for="task in tasks" :key="task.id" class="task-box">
                  <div class="task-status-bar" :class="task.status"></div>
                  <div class="task-main">
                    <h4>{{ task.content }}</h4>
                    <div class="task-assignee">
                      <span v-if="task.assignee">🏃 {{ task.assignee.username }}</span>
                      <span v-else class="unassigned">⏳ 待认领</span>
                    </div>
                    <div class="task-dates">{{ formatDate(task.start_at) }} - {{ formatDate(task.end_at) }}</div>
                    <div class="task-btns">
                       <button v-if="!task.assignee_id && task.is_open_claim && isMember" @click="claimTask(task)" class="btn-claim">认领</button>
                       <button v-if="isManager" @click="deleteTask(task.id)" class="btn-del">🗑️</button>
                       <button v-if="isManager || (currentUser && task.assignee_id === currentUser.id)" @click="toggleTaskStatus(task)" class="btn-check">{{ task.status === 'done' ? '重做' : '完成' }}</button>
                    </div>
                  </div>
               </div>
            </div>
          </div>
  
          <div v-if="currentTab === 'team'" class="tab-pane">
            <div class="team-list">
              <div class="team-header-row">
                <span>成员</span><span>身份</span><span>当前任务数</span><span>加入时间</span><span>操作</span>
              </div>
              <div v-for="m in members" :key="m.id" class="team-row">
                <div class="m-name">{{ m.profiles?.username || '未知用户' }}</div>
                <div class="m-role"><span class="role-tag" :class="m.role">{{ getRoleName(m.role) }}</span></div>
                <div class="m-tasks">{{ getMemberTaskCount(m.user_id) }} 个进行中</div>
                <div class="m-join">{{ formatDate(m.joined_at) }}</div>
                <div class="m-action">
                  <button v-if="isManager && m.role !== 'owner'" @click="kickMember(m)" class="btn-kick">移出</button>
                </div>
              </div>
            </div>
          </div>
  
          <div v-if="currentTab === 'internal'" class="tab-pane chat-pane">
             <div v-if="!isMember" class="lock-screen">🔒 仅限企划成员查看内部讨论与变动日志</div>
             <template v-else>
               <div class="chat-window" ref="internalChatRef">
                 <div v-for="msg in internalComments" :key="msg.id">
                   <div v-if="msg.type === 'system'" class="sys-msg-row">
                     <span class="sys-pill">📢 {{ msg.content }} <small>{{ formatTime(msg.created_at) }}</small></span>
                   </div>
                   <div v-else class="chat-msg" :class="{ mine: msg.user_id === currentUser?.id }">
                     <div class="msg-meta">{{ msg.profiles?.username }} · {{ formatTime(msg.created_at) }}</div>
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
              <h3>📝 基础信息修改</h3>
              <div class="form-grid">
                 <div class="grp"><label>标题</label><input v-model="editForm.name"></div>
                 <div class="grp"><label>状态</label>
                   <select v-model="editForm.status">
                     <option value="recruiting">招募中</option>
                     <option value="ongoing">进行中</option>
                     <option value="paused">⏸ 暂停</option>
                     <option value="ended">✅ 已完结</option>
                   </select>
                 </div>
                 <div class="grp full"><label>描述</label><textarea v-model="editForm.description" rows="3"></textarea></div>
              </div>
            </section>
  
            <section class="console-section">
              <h3>🎨 图片与外链</h3>
              <div class="form-grid">
                 <div class="grp full">
                   <label>头图 URL</label><input v-model="editForm.image_url">
                 </div>
                 <div class="grp full">
                   <label>相册展示 (一行一个URL)</label>
                   <textarea v-model="galleryText" placeholder="https://image1.png&#10;https://image2.jpg" rows="3"></textarea>
                 </div>
                 <div class="grp full">
                   <label>外部链接 (JSON格式: [{"name":"B站","url":"..."}])</label>
                   <input v-model="linkJson">
                 </div>
              </div>
            </section>
  
            <section class="console-section danger-zone">
              <h3>⚠️ 危险操作</h3>
              <div class="danger-actions">
                 <button @click="handleDeleteLogic" class="btn-danger-lg">💥 删除 / 移交企划</button>
                 <p class="danger-tip">
                   如果企划内有超过 50% 的活跃成员（已分配任务），您将无法直接删除，只能选择移交主催权限并退出。
                 </p>
              </div>
            </section>
  
            <div class="console-footer">
               <button @click="generateInvite" class="btn-action">生成邀请码</button>
               <button @click="saveSettings" class="btn-save-lg">💾 保存所有更改</button>
            </div>
          </div>
        </div>
      </div>
  
      <div v-if="showTaskModal" class="modal-overlay">
        <div class="modal-content">
          <h3>发布任务</h3>
          <input v-model="newTask.content" class="std-input" placeholder="任务内容">
          <div class="row">
             <div class="col"><label>开始</label><input type="date" v-model="newTask.start_at" class="std-input"></div>
             <div class="col"><label>结束</label><input type="date" v-model="newTask.end_at" class="std-input"></div>
          </div>
          <label><input type="checkbox" v-model="newTask.is_open_claim"> 开放认领</label>
          <div class="modal-actions">
             <button @click="showTaskModal=false">取消</button><button @click="addTask" class="confirm">发布</button>
          </div>
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
  
  // 数据
  const project = ref(null)
  const timeline = ref([])
  const tasks = ref([])
  const members = ref([])
  const internalComments = ref([])
  const publicComments = ref([])
  const currentUser = ref(null)
  
  // UI
  const loading = ref(true)
  const currentTab = ref('overview')
  const showManagePanel = ref(false)
  const showTaskModal = ref(false)
  const inviteCode = ref(null)
  
  // 表单
  const editForm = ref({})
  const galleryText = ref('')
  const linkJson = ref('[]')
  const newTimeline = ref({ title: '', date: '' })
  const newTask = ref({ content: '', start_at: '', end_at: '', is_open_claim: true })
  const newInternalMsg = ref('')
  const newPublicMsg = ref('')
  
  // 权限
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
  
  // --- Fetchers ---
  const fetchProject = async () => {
    const { data } = await supabase.from('projects').select('*, profiles(username)').eq('id', projectId).single()
    if (data) {
      project.value = { ...data, uploader_name: data.profiles?.username || '未知' }
      // 初始化编辑表单
      editForm.value = { ...data }
      galleryText.value = (data.gallery_urls || []).join('\n')
      linkJson.value = JSON.stringify(data.external_links || [])
    }
  }
  const fetchTimeline = async () => {
    const { data } = await supabase.from('project_timeline_v2').select('*, profiles:created_by(username)').eq('project_id', projectId).order('event_date')
    timeline.value = data || []
  }
  const fetchTasks = async () => {
    const { data } = await supabase.from('project_tasks_v2').select('*, assignee:assignee_id(username)').eq('project_id', projectId).order('created_at')
    tasks.value = data || []
  }
  const fetchMembers = async () => {
    const { data } = await supabase.from('project_members').select('*, profiles(username)').eq('project_id', projectId)
    members.value = data || []
  }
  const fetchComments = async (type) => {
    const { data } = await supabase.from('project_comments').select('*, profiles(username)').eq('project_id', projectId).eq('type', type).order('created_at')
    if (type === 'internal') { internalComments.value = data || [] }
    else { publicComments.value = data || [] }
  }
  
  // --- 管理逻辑 ---
  const openManagePanel = () => {
    showManagePanel.value = true
  }
  
  const saveSettings = async () => {
    try {
      const urls = galleryText.value.split('\n').filter(u => u.trim())
      const links = JSON.parse(linkJson.value)
      
      await supabase.from('projects').update({
        name: editForm.value.name,
        description: editForm.value.description,
        status: editForm.value.status,
        image_url: editForm.value.image_url,
        gallery_urls: urls,
        external_links: links
      }).eq('id', projectId)
      
      // 记录日志
      await logSystemAction('update_info', '主催更新了企划设置')
      
      alert('保存成功')
      showManagePanel.value = false
      fetchProject()
    } catch (e) {
      alert('保存失败，请检查JSON格式是否正确')
    }
  }
  
  // --- 复杂删除/移交逻辑 ---
  const handleDeleteLogic = async () => {
    // 1. 统计有任务的成员
    const activeUserIds = new Set(tasks.value.filter(t => t.status !== 'done' && t.assignee_id).map(t => t.assignee_id))
    // 排除自己
    if (currentUser.value) activeUserIds.delete(currentUser.value.id)
    
    const activeCount = activeUserIds.size
    const totalMembers = members.value.length - 1 // 排除自己
    
    // 简单的判定：如果有其他活跃成员，就不让直接删
    if (activeCount > 0) {
      const secondMember = members.value.find(m => m.user_id !== currentUser.value.id)
      if (confirm(`⚠️ 无法直接删除！\n检测到有 ${activeCount} 位成员正在执行任务。\n\n根据规则，您只能【移交并退出】。\n权限将移交给第二位成员 (${secondMember?.profiles?.username || '无'})。确认吗？`)) {
        if (secondMember) {
          // 移交逻辑
          await supabase.from('projects').update({ uploader_id: secondMember.user_id }).eq('id', projectId)
          await supabase.from('project_members').update({ role: 'owner' }).eq('user_id', secondMember.user_id).eq('project_id', projectId)
          await supabase.from('project_members').delete().eq('user_id', currentUser.value.id).eq('project_id', projectId)
          await logSystemAction('transfer', `主催移交给 ${secondMember.profiles?.username} 并退出了企划`)
          alert('已移交并退出')
          router.push('/projects')
        } else {
          alert('没有可移交的成员')
        }
      }
    } else {
      // 没有活跃成员，可以直接删
      if (confirm('确认彻底删除该企划吗？此操作无法撤销！')) {
        await supabase.from('projects').delete().eq('id', projectId)
        alert('已删除')
        router.push('/projects')
      }
    }
  }
  
  // --- 任务与成员 ---
  const addTask = async () => {
    await supabase.from('project_tasks_v2').insert({
      project_id: projectId, content: newTask.value.content,
      start_at: newTask.value.start_at || null, end_at: newTask.value.end_at || null,
      is_open_claim: newTask.value.is_open_claim, creator_id: currentUser.value.id
    })
    showTaskModal.value = false; newTask.value.content = ''; fetchTasks()
    logSystemAction('task_create', '发布了新任务')
  }
  const claimTask = async (task) => {
    if(confirm('认领此任务？(将自动加入企划成员)')) {
      await supabase.from('project_tasks_v2').update({ assignee_id: currentUser.value.id }).eq('id', task.id)
      // 触发器会自动加入成员表，但我们前端也刷新一下
      setTimeout(() => { fetchTasks(); fetchMembers() }, 500)
      logSystemAction('task_claim', `认领了任务: ${task.content}`)
    }
  }
  const getMemberTaskCount = (uid) => tasks.value.filter(t => t.assignee_id === uid && t.status !== 'done').length
  
  // --- 消息与日志 ---
  const sendInternalMsg = async () => {
    if(!newInternalMsg.value) return
    await supabase.from('project_comments').insert({ project_id: projectId, user_id: currentUser.value.id, content: newInternalMsg.value, type: 'internal' })
    newInternalMsg.value = ''; fetchComments('internal')
  }
  const sendPublicMsg = async () => {
    if(!newPublicMsg.value) return
    await supabase.from('project_comments').insert({ project_id: projectId, user_id: currentUser.value.id, content: newPublicMsg.value, type: 'public' })
    newPublicMsg.value = ''; fetchComments('public')
  }
  const logSystemAction = async (action, details) => {
    // 写入 comments 表作为系统消息显示
    await supabase.from('project_comments').insert({ project_id: projectId, content: details, type: 'system' })
    // 同时写入 logs 表 (后台记录)
    await supabase.from('project_logs').insert({ project_id: projectId, user_id: currentUser.value.id, action_type: action, details })
    fetchComments('internal')
  }
  
  // --- 工具 ---
  const generateInvite = async () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    await supabase.from('project_invites').insert({ project_id: projectId, code, created_by: currentUser.value.id })
    inviteCode.value = code
  }
  const viewImage = (url) => window.open(url, '_blank')
  const formatDate = (s) => s ? s.split('T')[0] : '待定'
  const formatTime = (s) => new Date(s).toLocaleString()
  const getStatusText = (s) => ({ recruiting:'招募中', ongoing:'进行中', paused:'暂停中', ended:'已完结' }[s] || s)
  const getRoleName = (r) => r === 'owner' ? '👑 主催' : '成员'
  const toggleTimeline = async(n) => { await supabase.from('project_timeline_v2').update({is_completed: !n.is_completed}).eq('id', n.id); fetchTimeline() }
  const deleteTimeline = async(id) => { if(confirm('删?')) await supabase.from('project_timeline_v2').delete().eq('id', id); fetchTimeline() }
  const deleteTask = async(id) => { if(confirm('删?')) await supabase.from('project_tasks_v2').delete().eq('id', id); fetchTasks() }
  const toggleTaskStatus = async(t) => { 
    const newS = t.status === 'done' ? 'todo' : 'done'
    await supabase.from('project_tasks_v2').update({ status: newS }).eq('id', t.id)
    fetchTasks() 
  }
  const kickMember = async(m) => {
    if(confirm(`踢出成员 ${m.profiles?.username}？`)) {
      await supabase.from('project_members').delete().eq('id', m.id)
      fetchMembers()
      logSystemAction('kick', `移出了成员 ${m.profiles?.username}`)
    }
  }
  const deleteComment = async(id) => { if(confirm('删?')) { await supabase.from('project_comments').delete().eq('id', id); fetchComments('public') } }
  </script>
  
  <style scoped>
  .project-detail-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; background: #f0f2f5; min-height: 100vh; }
  .loading-box { text-align: center; padding: 100px; color: #999; }
  
  /* 1. Header */
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
  .invite-display { position: absolute; bottom: 20px; right: 30px; background: #e8f5e9; padding: 8px 15px; border-radius: 8px; color: #2e7d32; border: 1px solid #c8e6c9; }
  .invite-display .code { font-family: monospace; font-size: 16px; margin: 0 5px; }
  
  /* 2. Tabs */
  .nav-tabs { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px; }
  .nav-tabs button { padding: 10px 20px; border: none; background: white; border-radius: 8px; font-weight: bold; color: #666; cursor: pointer; transition: 0.2s; }
  .nav-tabs button.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57,197,187,0.3); }
  
  /* 3. Content Area */
  .tab-content-area { min-height: 400px; }
  .tab-pane { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  
  /* Gallery */
  .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
  .gallery-item { height: 150px; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; }
  .gallery-item:hover { border-color: #39C5BB; }
  .gallery-item img { width: 100%; height: 100%; object-fit: cover; }
  
  /* Timeline */
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
  
  /* Tasks */
  .task-grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
  .task-box { border: 1px solid #eee; border-radius: 8px; overflow: hidden; display: flex; }
  .task-status-bar { width: 6px; background: #ddd; }
  .task-status-bar.done { background: #39C5BB; }
  .task-main { padding: 15px; flex: 1; }
  .task-main h4 { margin: 0 0 8px; font-size: 16px; }
  .task-assignee { font-size: 13px; margin-bottom: 5px; }
  .unassigned { color: #f39c12; font-style: italic; }
  .task-dates { font-size: 11px; color: #999; margin-bottom: 10px; }
  .task-btns { display: flex; gap: 10px; justify-content: flex-end; }
  .btn-claim { background: #39C5BB; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .btn-del { border: none; background: none; cursor: pointer; }
  .btn-check { border: 1px solid #ddd; background: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  
  /* Team */
  .team-row { display: grid; grid-template-columns: 2fr 1fr 2fr 2fr 1fr; padding: 15px; border-bottom: 1px solid #eee; align-items: center; }
  .team-header-row { display: grid; grid-template-columns: 2fr 1fr 2fr 2fr 1fr; padding: 10px 15px; background: #f9f9f9; font-weight: bold; color: #666; font-size: 13px; border-radius: 8px; }
  .role-tag { padding: 2px 6px; border-radius: 4px; font-size: 11px; color: white; background: #999; }
  .role-tag.owner { background: #f39c12; }
  .btn-kick { color: #ff5252; border: 1px solid #ffcdd2; background: white; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  
  /* Chat */
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
  
  /* Manager Console */
  .full-screen { align-items: flex-start; padding-top: 50px; }
  .manager-console { width: 800px; max-height: 85vh; background: white; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
  .console-header { padding: 20px; background: #2c3e50; color: white; display: flex; justify-content: space-between; align-items: center; }
  .console-body { padding: 30px; overflow-y: auto; flex: 1; }
  .console-section { margin-bottom: 30px; border-bottom: 1px dashed #eee; padding-bottom: 20px; }
  .console-section h3 { margin-top: 0; color: #333; border-left: 4px solid #39C5BB; padding-left: 10px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .grp.full { grid-column: span 2; }
  .grp label { display: block; font-weight: bold; margin-bottom: 5px; font-size: 13px; color: #666; }
  .grp input, .grp select, .grp textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
  .danger-zone { border: 1px solid #ffcdd2; background: #fff5f5; padding: 20px; border-radius: 8px; }
  .danger-zone h3 { border-color: #ff5252; color: #c62828; }
  .btn-danger-lg { background: #ff5252; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; }
  .console-footer { padding: 20px; background: #f9f9f9; display: flex; justify-content: flex-end; gap: 15px; }
  .btn-save-lg { background: #39C5BB; color: white; border: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; }
  
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
  .modal-content { background: white; padding: 25px; border-radius: 12px; width: 400px; }
  .std-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 10px; box-sizing: border-box; }
  .row { display: flex; gap: 10px; } .col { flex: 1; }
  </style>