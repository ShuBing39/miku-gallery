<template>
  <div class="project-detail-container">
    <div v-if="projectStore.loading" class="loading-box"><div class="spinner"></div><p>读取档案中...</p></div>
    
    <div v-else-if="project" class="project-content">
      <ProjectHeader 
        :project="project" 
        :is-manager="projectStore.isManager" 
        :member-count="members.length" 
        @open-console="openManagePanel"
      />
      
      <div class="project-id-bar"><span>🔢 企划ID: #{{ project.uid }}</span></div>

      <div class="nav-tabs">
        <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">🏠 概览</button>
        <button :class="{ active: currentTab === 'timeline' }" @click="currentTab = 'timeline'">⏳ 进度</button>
        <button :class="{ active: currentTab === 'tasks' }" @click="currentTab = 'tasks'">✅ 任务</button>
        <button :class="{ active: currentTab === 'team' }" @click="currentTab = 'team'">👥 团队</button>
        <button :class="{ active: currentTab === 'guest' }" @click="currentTab = 'guest'">💬 讨论</button>
        <button :class="{ active: currentTab === 'internal' }" @click="currentTab = 'internal'">🔒 内部</button>
      </div>

      <div class="tab-content-area">
        <div v-if="currentTab === 'overview'" class="tab-pane-transparent">
          <div class="overview-grid">
            <div class="desc-card hover-card">
              <div class="card-title">📜 企划介绍</div>
              <div class="card-body-text" style="white-space: pre-wrap;">{{ project.description || '暂无详细介绍' }}</div>
            </div>
            <div class="gallery-section hover-card">
              <div class="card-title">🎨 图片展示</div>
              <div v-if="project.gallery_urls && project.gallery_urls.length" class="gallery-grid">
                <div v-for="(img, idx) in project.gallery_urls" :key="idx" class="gallery-item"><img :src="img"></div>
              </div>
              <div v-else class="empty-text">暂无图片</div>
            </div>
          </div>
        </div>

        <TimelineTab v-if="currentTab === 'timeline'" :timeline="projectStore.timeline" :is-manager="projectStore.isManager" :locked="!canViewExternal" @add="addTimeline" @delete="deleteTimeline" />
        <TasksTab v-if="currentTab === 'tasks'" :tasks="projectStore.tasks" :is-manager="projectStore.isManager" :is-member="projectStore.isMember" :current-user="userStore.user" :locked="!canViewExternal" @open-modal="showTaskModal = true" @claim="handleClaimTask" @return="handleReturnTask" @toggle="toggleTaskStatus" @delete="handleDeleteTask" />
        <TeamTab v-if="currentTab === 'team'" :members="projectStore.members" :tasks="projectStore.tasks" :is-manager="projectStore.isManager" :current-user="userStore.user" :locked="!canViewExternal" @edit="openRoleModal" @kick="kickMember" />
        
        <div v-if="currentTab === 'guest'" class="tab-pane chat-pane">
           <div v-if="!project.guest_board_enabled" class="lock-screen">⛔ 讨论区已关闭</div>
           <template v-else>
             <div class="chat-window"><div v-for="msg in projectStore.publicComments" :key="msg.id" class="chat-msg"><div class="msg-meta">{{ msg.profiles?.username || '游客' }} <span class="time">{{ formatDate(msg.created_at) }}</span></div><div class="msg-bubble">{{ msg.content }}</div></div></div>
             <div class="chat-input"><input v-model="newPublicMsg" placeholder="留言..." @keyup.enter="sendPublicMsg"><button @click="sendPublicMsg">发送</button></div>
           </template>
        </div>
        <div v-if="currentTab === 'internal'" class="tab-pane chat-pane">
           <div v-if="!projectStore.isMember" class="lock-screen">🔒 仅限成员查看</div>
           <template v-else>
             <div class="chat-window" ref="internalChatRef"><div v-for="msg in projectStore.internalComments" :key="msg.id"><div v-if="msg.type === 'system'" class="sys-msg">📢 {{ msg.content }}</div><div v-else class="chat-msg" :class="{ mine: msg.user_id === userStore.user?.id }"><div class="msg-meta">{{ msg.profiles?.username }}</div><div class="msg-bubble internal">{{ msg.content }}</div></div></div></div>
             <div class="chat-input"><input v-model="newInternalMsg" placeholder="内部讨论..." @keyup.enter="sendInternalMsg"><button @click="sendInternalMsg">发送</button></div>
           </template>
        </div>
      </div>
    </div>

    <div v-if="showManagePanel" class="modal-overlay full-screen">
      <div class="manager-console">
        <div class="console-header">
          <h2>🛠️ 企划控制台</h2>
          <button @click="showManagePanel = false" class="btn-close-console">✕ 关闭</button>
        </div>
        <div class="console-body">
          <div class="console-section" v-if="projectStore.isOwner">
            <h3>👥 身份与分组管理</h3>
            <p class="tiny-tip">输入成员名称进行搜索，然后修改其组别或头衔。</p>
            <div class="member-manager-list">
              <div v-for="m in members" :key="m.user_id" class="console-member-row">
                <span class="cm-name">{{ m.profiles?.username }}</span>
                <div class="cm-actions">
                  <input v-model="m.tempGroup" :placeholder="m.group_name || '分组'" class="mini-input" @change="updateGroup(m)">
                  <select v-model="m.tempRole" class="mini-select" @change="updateRole(m)">
                    <option value="主催">主催 (慎选)</option>
                    <option value="副主催">副主催</option>
                    <option value="成员">成员</option>
                    <option value="特邀">特邀</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="console-section">
            <h3>📝 基本信息</h3>
            <div class="form-row"><label>企划名称 (不可修)</label><input :value="project.name" class="std-input disabled" disabled></div>
            <div class="form-row"><label>企划介绍</label><textarea v-model="editForm.description" rows="5" class="std-input"></textarea></div>
          </div>

          <div class="console-section danger-zone">
            <h3>⚙️ 高级操作</h3>
            <div class="action-grid">
               <button v-if="projectStore.isOwner" @click="showTransferModal=true" class="btn-transfer">👑 转让主催权限</button>
               <button v-if="projectStore.isOwner" @click="handleDeleteProject" class="btn-delete">💥 删除企划</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showTaskModal" class="modal-overlay"><div class="modal-content"><h3>发布任务</h3><textarea v-model="newTask.content" class="std-input" placeholder="任务内容"></textarea><div class="form-row"><label>优先级</label><select v-model="newTask.priority" class="std-input"><option value="low">💤 低</option><option value="medium">🔹 普通</option><option value="high">🔥 高</option></select></div><div class="modal-actions"><button @click="showTaskModal=false">取消</button><button @click="handleAddTask" class="confirm">发布</button></div></div></div>
    <div v-if="showTransferModal" class="modal-overlay"><div class="modal-content"><h3>👑 转让企划</h3><p>选择新主催(建议选择副主催)，您将变为成员。</p><select v-model="transferTargetId" class="std-input"><option disabled value="">请选择继承人</option><option v-for="m in members.filter(m => m.user_id !== userStore.user?.id)" :key="m.user_id" :value="m.user_id">{{ m.profiles?.username }}</option></select><div class="modal-actions"><button @click="showTransferModal=false">取消</button><button @click="confirmTransfer" class="confirm warning">确认转让</button></div></div></div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// ✅ 修正路径引用：全部改为 ../../
import { useUserStore } from '../../stores/userStore'
import { useProjectStore } from '../../stores/projectStore'
import * as api from '../../services/projectData' 
import ProjectHeader from '../../components/project/ProjectHeader.vue'
import TimelineTab from '../../components/project/TimelineTab.vue'
import TasksTab from '../../components/project/TasksTab.vue'
import TeamTab from '../../components/project/TeamTab.vue'

const route = useRoute(); const router = useRouter(); const userStore = useUserStore(); const projectStore = useProjectStore()
const projectId = route.params.id; const currentTab = ref('overview')
const project = computed(() => projectStore.project); const members = computed(() => projectStore.members)
const showManagePanel = ref(false); const showTaskModal = ref(false); const showTransferModal = ref(false); const internalChatRef = ref(null)
const editForm = reactive({ description: '', recruit_status: '', allow_external: false, guest_board_enabled: true })
const newTask = ref({ content: '', priority: 'medium' }); const newInternalMsg = ref(''); const newPublicMsg = ref(''); const transferTargetId = ref('')
const canViewExternal = computed(() => projectStore.isMember || project.value?.allow_external)

onMounted(async () => {
  if (!userStore.user) await userStore.initialize()
  await projectStore.initProject(projectId)
  if (project.value) Object.assign(editForm, { description: project.value.description, recruit_status: project.value.recruit_status, allow_external: project.value.allow_external, guest_board_enabled: project.value.guest_board_enabled })
})

const openManagePanel = () => { showManagePanel.value = true }
const saveProjectSettings = async () => { await api.updateProjectInfo(projectId, editForm); alert('✅ 设置已保存'); showManagePanel.value = false; projectStore.initProject(projectId) }
const confirmTransfer = async () => { if (!transferTargetId.value || !confirm('确认转让？')) return; const target = members.value.find(m => m.user_id === transferTargetId.value); await api.transferProject(projectId, userStore.user.id, transferTargetId.value, target.profiles.username); alert('✅ 转让成功'); showTransferModal.value = false; showManagePanel.value = false; projectStore.initProject(projectId) }
const handleDeleteProject = async () => { if (!confirm('【高危】确定删除？')) return; await api.deleteProject(projectId); router.replace('/projects') }
const handleAddTask = async () => { if(!newTask.value.content) return; await api.addTaskNode({ project_id: projectId, content: newTask.value.content, creator_id: userStore.user.id, priority: newTask.value.priority }); showTaskModal.value = false; newTask.value.content = ''; projectStore.refreshTasksData() }
// ... (Claim, Return, Toggle, Delete Task logic same as before, verify against projectData.js exports) ...
const handleClaimTask = async (t) => { try { await api.claimTask(t.id, userStore.user.id, projectId, t.priority); projectStore.refreshTasksData() } catch(e){ alert(e.message) } }
const handleReturnTask = async (t) => { await api.returnTask(t.id); projectStore.refreshTasksData() }
const toggleTaskStatus = async (t) => { await api.updateTaskStatus(t.id, t.status==='done'?'todo':'done'); projectStore.refreshTasksData() }
const handleDeleteTask = async (id) => { if(confirm('删?')) { await api.deleteTask(id); projectStore.refreshTasksData() } }

const addTimeline = async (p) => { await api.addTimelineNode({ project_id: projectId, title: p.title, event_date: p.date, todo_text: p.todo_text, doing_text: p.doing_text, done_text: p.done_text, estimated_finish_date: p.estimated_finish_date }); projectStore.refreshTimelineData() }
const deleteTimeline = async (id) => { if(confirm('删?')) { await api.deleteTimelineNode(id); projectStore.refreshTimelineData() } }
const openRoleModal = async (m) => { const r = prompt('新身份:', m.role); if (r) { await api.updateMemberRole(projectId, m.user_id, r); projectStore.refreshMembersData() } }
const kickMember = async (m) => { if(confirm('踢出?')) { await api.removeProjectMember(projectId, m.user_id, m.profiles?.username); projectStore.refreshMembersData() } }
const sendInternalMsg = async () => { if(!newInternalMsg.value) return; await api.sendProjectMessage(projectId, userStore.user.id, newInternalMsg.value, 'internal'); newInternalMsg.value = ''; projectStore.refreshComments() }
const sendPublicMsg = async () => { if(!userStore.user) return alert('请先登录'); if(!newPublicMsg.value) return; await api.sendProjectMessage(projectId, userStore.user.id, newPublicMsg.value, 'public'); newPublicMsg.value = ''; projectStore.refreshComments() }
const formatDate = (iso) => new Date(iso).toLocaleDateString()

// Identity Console Logic
const updateGroup = async (m) => { if(m.tempGroup) { await api.updateMemberGroup(projectId, m.user_id, m.tempGroup); projectStore.refreshMembersData() } }
const updateRole = async (m) => { if(m.tempRole) { await api.updateMemberRole(projectId, m.user_id, m.tempRole); projectStore.refreshMembersData() } }
</script>

<style scoped>
/* 修复1：概览分栏 */
.tab-pane-transparent { padding: 0; background: transparent; }
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 768px) { .overview-grid { grid-template-columns: 1fr; } }
.hover-card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); transition: 0.3s; border: 1px solid #f0f0f0; }
.hover-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
.card-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; color: #333; }
.card-body-text { font-size: 14px; color: #555; line-height: 1.6; }

/* 修复7：关闭按钮 */
.btn-close-console { background: #ff4d4f; color: white; border: none; padding: 6px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-close-console:hover { background: #ff7875; transform: scale(1.05); }

/* 身份管理列表 */
.member-manager-list { max-height: 200px; overflow-y: auto; background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 10px; }
.console-member-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
.cm-name { font-weight: bold; font-size: 14px; }
.cm-actions { display: flex; gap: 5px; }
.mini-input, .mini-select { padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; width: 80px; }

/* General */
.project-detail-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; background: #f0f2f5; min-height: 100vh; }
.project-id-bar { text-align: right; color: #888; font-size: 12px; margin-top: -15px; margin-bottom: 10px; font-family: monospace; }
.nav-tabs { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; }
.nav-tabs button { padding: 10px 20px; border: none; background: white; border-radius: 8px; font-weight: bold; color: #666; cursor: pointer; white-space: nowrap; transition: 0.2s; }
.nav-tabs button.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }
.tab-pane { background: white; border-radius: 12px; padding: 30px; min-height: 300px; }
.manager-console { background: white; width: 90%; max-width: 800px; height: 85vh; overflow-y: auto; border-radius: 16px; padding: 30px; display: flex; flex-direction: column; }
.console-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
.console-section { margin-bottom: 30px; }
.console-section h3 { border-left: 4px solid #39C5BB; padding-left: 10px; margin-bottom: 15px; font-size: 16px; }
.std-input { width: 100%; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; border-radius: 6px; box-sizing: border-box; }
.std-input.disabled { background: #f5f5f5; color: #999; cursor: not-allowed; }
.btn-save { background: #39C5BB; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; width: 100%; font-size: 15px; margin-top: 10px; }
.action-grid { display: flex; gap: 10px; }
.btn-transfer { background: #ff9800; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; flex: 1; }
.btn-delete { background: #f44336; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; flex: 1; }
.chat-window { height: 350px; overflow-y: auto; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 10px; }
.chat-msg { margin-bottom: 10px; }
.chat-msg.mine { text-align: right; }
.msg-meta { font-size: 12px; color: #999; margin-bottom: 2px; }
.msg-bubble { display: inline-block; padding: 8px 12px; border-radius: 8px; background: white; border: 1px solid #ddd; max-width: 80%; text-align: left; }
.chat-msg.mine .msg-bubble { background: #e0f7fa; border-color: #b2dfdb; }
.msg-bubble.internal { border-left: 3px solid #39C5BB; }
.sys-msg { text-align: center; font-size: 12px; color: #999; margin: 10px 0; background: #eee; padding: 2px 10px; border-radius: 10px; display: inline-block; width: 100%; box-sizing: border-box; }
.chat-input { display: flex; gap: 10px; }
.chat-input input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; outline: none; }
.chat-input button { background: #39C5BB; color: white; border: none; padding: 0 20px; border-radius: 6px; cursor: pointer; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 25px; border-radius: 12px; width: 400px; max-height: 90vh; overflow-y: auto; }
.loading-box { text-align: center; padding: 50px; color: #999; }
.empty-text { text-align: center; padding: 30px; color: #ccc; border: 1px dashed #eee; border-radius: 8px; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
.gallery-item img { width: 100%; height: 150px; object-fit: cover; border-radius: 8px; cursor: zoom-in; transition: 0.2s; }
.gallery-item img:hover { transform: scale(1.03); }
</style>