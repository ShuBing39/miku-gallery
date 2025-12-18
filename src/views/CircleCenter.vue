<template>
  <div class="circle-center-page">
    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>正在加载社团数据...</p>
    </div>

    <div v-else class="center-content">
      <div class="center-header">
        <button class="btn-back" @click="$router.push('/dashboard')">⬅ 返回个人中心</button>
        <h1>🏯 社团控制台</h1>
      </div>

      <div v-if="myCircle" class="circle-dashboard">
        <div class="circle-header-card">
          <div class="header-left">
            <div class="status-row">
              <span class="badge-mine">我的社团</span>
              <div v-if="isOwner" class="privacy-toggle-wrapper">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="tempIsPrivate" @change="updateCirclePrivacy">
                  <span class="toggle-slider"></span>
                </label>
                <span class="status-text" :class="{ private: tempIsPrivate }">
                  {{ tempIsPrivate ? '🔒 私密' : '🌏 公开' }}
                </span>
              </div>
              <span v-else class="status-readonly">
                {{ myCircle.is_private ? '🔒 私密社团' : '🌏 公开社团' }}
              </span>
            </div>
            <h2 class="circle-name">{{ myCircle.name }}</h2>
            <div class="my-role-badge">
              我的身份: <span :class="getRoleClass(myRole)">{{ myRole }}</span>
              <span v-if="isOwner" class="owner-star"> (团长)</span>
            </div>
          </div>
          <div class="circle-actions">
            <div v-if="isOwner" class="owner-btn-group">
              <button @click="handleOwnerExitClick" class="warning-btn">👑 移交并退出</button>
              <button @click="disbandCircle" class="danger-btn">💥 解散社团</button>
            </div>
            <button v-else @click="leaveCircle" class="danger-btn">👋 退出社团</button>
          </div>
        </div>

        <div class="circle-grid-layout">
          <div class="left-col">
            <div v-if="isOwner || myRole === '管理员'" class="panel invite-section">
              <div class="panel-header"><h4>🎫 邀请成员</h4></div>
              <div class="invite-actions">
                <button @click="generateCode(1)" class="btn-gen">生成单人码 (24h)</button>
                <button @click="generateCode(100)" class="btn-gen sec">生成多人码 (7天)</button>
              </div>
              <div v-if="inviteList.length > 0" class="invite-list">
                <div v-for="inv in inviteList" :key="inv.id" class="invite-item">
                  <div class="inv-info">
                    <span class="inv-code">{{ inv.code }}</span>
                    <span class="inv-meta">{{ inv.max_uses === 1 ? '单人' : '多人' }} · 剩余 {{ inv.max_uses - inv.used_count }}</span>
                  </div>
                  <button @click="deleteInvite(inv.id)" class="btn-del-inv">关闭</button>
                </div>
              </div>
              <div v-else class="empty-inv">暂无有效邀请码</div>
            </div>

            <div class="panel members-area">
              <div class="panel-header"><h4>👥 成员 ({{ members.length }})</h4></div>
              <div class="member-list">
                <div v-for="m in members" :key="m.id" class="member-item">
                  <div class="mem-info">
                    <span class="role-badge" :class="getRoleClass(m.role)">{{ m.role }}</span>
                    <span class="uid-name">
                      {{ m.username }} 
                      <span class="mem-uid">#{{ m.uid || '???' }}</span>
                      <span v-if="m.user_id === myCircle.owner_id">👑</span>
                    </span>
                  </div>
                  <div v-if="isOwner" class="mem-actions">
                    <button @click="openRoleModal(m)" class="icon-btn edit">✎</button>
                    <button v-if="m.user_id !== currentUser.id" @click="kickMember(m)" class="icon-btn kick">✕</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="right-col">
            <div class="panel project-section">
              <div class="panel-header with-btn">
                <h4>📋 社团企划板</h4>
                <button v-if="canManageProject" @click="goToCreateCircleProject" class="btn-add-proj">+ 发布社团企划</button>
              </div>
              <div v-if="circleProjects.length > 0" class="proj-list">
                <div v-for="p in circleProjects" :key="p.id" class="proj-item">
                  <div class="proj-left">
                    <span class="proj-tag type">{{ p.project_type || '综合' }}</span>
                    <span class="proj-tag" :class="{ external: p.allow_external }">{{ p.allow_external ? '招募中' : '内部' }}</span>
                    <span class="proj-name">{{ p.name }}</span>
                  </div>
                  <div class="proj-right">
                    <button class="btn-view" @click="$router.push(`/project/${p.id}`)">查看</button>
                    <button v-if="canManageProject" class="btn-del-mini" @click="deleteProject(p.id, p.name)">🗑️</button>
                  </div>
                </div>
              </div>
              <div v-else class="empty-proj">暂无进行中的企划</div>
            </div>
            
            <div class="panel message-board">
              <div class="panel-header"><h4>💬 社团留言板</h4></div>
              <div class="msg-list" ref="msgListRef">
                <div v-for="msg in messages" :key="msg.id">
                  <div v-if="msg.type === 'system'" class="system-msg-row">
                    <div class="system-msg-pill">
                      <span class="sys-icon">📢</span>
                      <span class="sys-text">{{ msg.content }}</span>
                      <span class="sys-time">{{ formatSmartTime(msg.created_at) }}</span>
                    </div>
                  </div>
                  <div v-else class="msg-bubble" :class="{ mine: msg.user_id === currentUser.id }">
                    <div class="msg-meta">
                      <span class="msg-user">{{ msg.username }}</span>
                      <span class="msg-time">{{ formatFullTime(msg.created_at) }}</span>
                    </div>
                    <div class="msg-content">{{ msg.content }}</div>
                  </div>
                </div>
              </div>
              <div class="msg-input-area">
                <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="说点什么..." />
                <button @click="sendMessage">发送</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="no-circle-view">
        <div class="action-grid">
          <div class="join-card">
            <h3>🤝 邀请码加入</h3>
            <div class="join-input-group">
              <input v-model="inputCode" placeholder="输入6位邀请码" maxlength="6" />
              <button @click="handleJoinByCode" class="btn-join" :disabled="joining">加入</button>
            </div>
          </div>
          <div class="create-card">
            <h3>👑 创建新社团</h3>
            <div class="create-form-column">
              <input v-model="newCircleName" placeholder="社团名称..." />
              <div class="switch-row mini">
                <label class="switch-label">
                  <input type="checkbox" v-model="newCirclePrivate">
                  <span class="checkbox-box"></span>
                  <span class="label-text">{{ newCirclePrivate ? '私密' : '公开' }}</span>
                </label>
                <button @click="createCircle" class="btn-create">成立</button>
              </div>
            </div>
          </div>
        </div>
        <div class="public-hall-section">
          <h3 class="hall-title">🌏 公开社团大厅</h3>
          <div v-if="publicCircles.length > 0" class="public-grid">
            <div v-for="circle in publicCircles" :key="circle.id" class="public-card">
              <div class="pc-info">
                <h4>{{ circle.name }}</h4>
                <span class="pc-id">ID: {{ circle.id }}</span>
              </div>
              <button @click="joinPublicCircle(circle.id, circle.name)" class="btn-quick-join">申请加入 ➔</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showRoleModal" class="modal-overlay">
      <div class="modal-content">
        <h3>🏷️ 分配职务</h3>
        <div class="tags-grid">
          <button v-for="role in ROLE_OPTIONS" :key="role" class="tag-option" 
            :class="{ selected: selectedRole === role, 'disabled-tag': role === '主催' && hasOtherLeader }" 
            @click="selectRoleSafe(role)">
            {{ role }}
          </button>
        </div>
        <p v-if="hasOtherLeader" class="error-tip">⚠️ 只能有一位主催</p>
        <div class="modal-actions">
          <button @click="showRoleModal = false">取消</button>
          <button class="confirm" @click="updateMemberRole">确认</button>
        </div>
      </div>
    </div>

    <div v-if="showTransferModal" class="modal-overlay">
      <div class="modal-content">
        <h3>👑 选择继承人</h3>
        <div class="admin-list">
          <div v-for="admin in adminCandidates" :key="admin.id" class="admin-option" 
            :class="{ selected: selectedSuccessor?.id === admin.id }" 
            @click="selectedSuccessor = admin">
            <span class="role-badge r-admin">管理员</span>
            <span>{{ admin.username }}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="showTransferModal = false">取消</button>
          <button class="confirm warning" :disabled="!selectedSuccessor" @click="confirmTransferAndLeave">移交并退出</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { supabase } from '../services/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const ROLE_OPTIONS = ['主催', '团长', '管理员', '画师', '财务', '外勤', 'P主', '调音', '作词', '混音', 'PV', '萌新', '学生']

const loading = ref(true)
const joining = ref(false)
const currentUser = ref(null)
const myCircle = ref(null)
const members = ref([])
const publicCircles = ref([])
const messages = ref([])
const circleProjects = ref([])
const inviteList = ref([])

const inputCode = ref('')
const newCircleName = ref('')
const newCirclePrivate = ref(false)
const tempIsPrivate = ref(false)
const newMessage = ref('')
const msgListRef = ref(null)

const showRoleModal = ref(false)
const targetMember = ref(null)
const selectedRole = ref('')
const showTransferModal = ref(false)
const adminCandidates = ref([])
const selectedSuccessor = ref(null)

const isOwner = computed(() => myCircle.value && currentUser.value && myCircle.value.owner_id === currentUser.value.id)
const myRole = computed(() => { if (!currentUser.value) return ''; const me = members.value.find(m => m.user_id === currentUser.value.id); return me ? me.role : '成员' })
const canManageProject = computed(() => isOwner.value || myRole.value === '主催')
const hasOtherLeader = computed(() => members.value.some(m => m.role === '主催' && m.id !== targetMember.value?.id))

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.replace('/login'); return }
  currentUser.value = user
  await fetchAllData()
})

const fetchAllData = async () => {
  loading.value = true
  try {
    const { data: mem } = await supabase.from('circle_members').select('circle_id').eq('user_id', currentUser.value.id).maybeSingle()
    if (mem) {
      const { data: circle } = await supabase.from('circles').select('*').eq('id', mem.circle_id).single()
      myCircle.value = circle
      tempIsPrivate.value = circle.is_private
      await fetchMembers(circle.id)
      await fetchMessages(circle.id)
      await fetchProjects(circle.id)
      await fetchInviteCodes(circle.id)
    } else {
      myCircle.value = null
      await fetchPublicCircles()
    }
  } catch (e) { console.error(e) } 
  finally { loading.value = false }
}

const goToCreateCircleProject = () => {
  if (myCircle.value) {
    router.push(`/submit-project?circle_id=${myCircle.value.id}`)
  }
}

// 🔥 修复：获取成员时，同时获取 profiles 里的 uid
const fetchMembers = async (cid) => { 
  const { data } = await supabase
    .from('circle_members')
    .select('*, profiles(username, uid)')
    .eq('circle_id', cid)
  
  if (data) {
    members.value = data.map(m => ({ 
      ...m, 
      username: m.profiles?.username || `用户 ${m.user_id.slice(0,4)}`,
      uid: m.profiles?.uid
    })) 
  }
}

const fetchMessages = async (cid) => { const { data } = await supabase.from('circle_messages').select('*, profiles(username)').eq('circle_id', cid).order('created_at', { ascending: true }); if (data) { messages.value = data.map(m => ({ ...m, username: m.profiles?.username || '系统' })); scrollToBottom() } }
const fetchPublicCircles = async () => { const { data } = await supabase.from('circles').select('*').eq('is_private', false).order('created_at', { ascending: false }); publicCircles.value = data || [] }
const fetchProjects = async (cid) => { const { data } = await supabase.from('projects').select('*').eq('circle_id', cid).order('created_at', { ascending: false }); circleProjects.value = data || [] }
const fetchInviteCodes = async (cid) => { const { data } = await supabase.from('circle_invites').select('*').eq('circle_id', cid).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }); inviteList.value = data || [] }

const generateCode = async (maxUses) => { const code = Math.random().toString(36).substring(2, 8).toUpperCase(); const expiresAt = new Date(Date.now() + (maxUses===1?86400000:604800000)).toISOString(); await supabase.from('circle_invites').insert([{ circle_id: myCircle.value.id, created_by: currentUser.value.id, code, expires_at: expiresAt, max_uses: maxUses }]); await fetchInviteCodes(myCircle.value.id) }
const deleteInvite = async (id) => { if(confirm('确定关闭此邀请码？')) { await supabase.from('circle_invites').delete().eq('id', id); await fetchInviteCodes(myCircle.value.id) } }
const deleteProject = async (id, name) => { if(confirm(`确认删除企划 [${name}] 吗？`)) { await supabase.from('projects').delete().eq('id', id); await sendSystemMessage(`删除了企划：${name}`); fetchProjects(myCircle.value.id) } }
const sendSystemMessage = async (text) => { if (!myCircle.value) return; await supabase.from('circle_messages').insert({ circle_id: myCircle.value.id, user_id: currentUser.value.id, content: text, type: 'system' }) }
const sendMessage = async () => { if (!newMessage.value.trim()) return; const content = newMessage.value; newMessage.value = ''; await supabase.from('circle_messages').insert({ circle_id: myCircle.value.id, user_id: currentUser.value.id, content: content, type: 'chat' }); await fetchMessages(myCircle.value.id) }
const scrollToBottom = () => { nextTick(() => { if (msgListRef.value) msgListRef.value.scrollTop = msgListRef.value.scrollHeight }) }

const openRoleModal = (member) => { targetMember.value = member; selectedRole.value = member.role; showRoleModal.value = true }
const selectRoleSafe = (role) => { if (role === '主催' && hasOtherLeader.value) return; selectedRole.value = role }
const updateMemberRole = async () => { if (!targetMember.value) return; await supabase.from('circle_members').update({ role: selectedRole.value }).eq('id', targetMember.value.id); await sendSystemMessage(`${targetMember.value.username} 的身份变更为 [${selectedRole.value}]`); targetMember.value.role = selectedRole.value; showRoleModal.value = false }
const kickMember = async (member) => { if(confirm(`踢出 ${member.username}？`)) { await sendSystemMessage(`${member.username} 被移出了社团`); await supabase.from('circle_members').delete().eq('id', member.id); await fetchMembers(myCircle.value.id) } }
const leaveCircle = async () => { if(confirm('确认退出？')) { await sendSystemMessage(`${currentUser.value.user_metadata.username} 退出社团`); await supabase.from('circle_members').delete().eq('user_id', currentUser.value.id).eq('circle_id', myCircle.value.id); myCircle.value = null; await fetchAllData() } }

const joinPublicCircle = async (cid, cname) => { if(confirm(`加入 ${cname}？`)) { await supabase.from('circle_members').insert({ circle_id: cid, user_id: currentUser.value.id, role: '萌新' }); await fetchAllData() } }
const handleJoinByCode = async () => { if (inputCode.value.length < 4) return; joining.value = true; const { data } = await supabase.rpc('use_invite_code', { input_code: inputCode.value.toUpperCase().trim(), input_user_id: currentUser.value.id }); if (data?.success) await fetchAllData(); else alert('加入失败或无效的邀请码'); joining.value = false }
const updateCirclePrivacy = async () => { const { error } = await supabase.from('circles').update({ is_private: tempIsPrivate.value }).eq('id', myCircle.value.id); if (error) tempIsPrivate.value = !tempIsPrivate.value }
const createCircle = async () => { const { data: c, error } = await supabase.from('circles').insert([{ name: newCircleName.value, owner_id: currentUser.value.id, is_private: newCirclePrivate.value }]).select().single(); if (!error) { await supabase.from('circle_members').insert([{ circle_id: c.id, user_id: currentUser.value.id, role: '团长' }]); await fetchAllData() } }
const disbandCircle = async () => { if(confirm('确认解散？')) { await supabase.from('circles').delete().eq('id', myCircle.value.id); myCircle.value = null; await fetchAllData() } }

const handleOwnerExitClick = async () => { const existingLeader = members.value.find(m => m.role === '主催' && m.user_id !== currentUser.value.id); if (existingLeader) { if(confirm(`移交给主催 [${existingLeader.username}]？`)) await executeTransfer(existingLeader); return } const admins = members.value.filter(m => m.role === '管理员' && m.user_id !== currentUser.value.id); if (admins.length === 0) return alert('无继承人'); if (admins.length === 1) { if(confirm(`移交给管理员 [${admins[0].username}]？`)) await executeTransfer(admins[0]) } else { adminCandidates.value = admins; selectedSuccessor.value = null; showTransferModal.value = true } }
const confirmTransferAndLeave = async () => { if (!selectedSuccessor.value) return; if(confirm(`确认移交？`)) { await executeTransfer(selectedSuccessor.value); showTransferModal.value = false } }
const executeTransfer = async (successor) => { loading.value = true; const { error } = await supabase.rpc('transfer_circle_owner_and_leave', { p_circle_id: myCircle.value.id, p_old_owner_id: currentUser.value.id, p_new_owner_id: successor.user_id, p_new_owner_name: successor.username }); if (!error) { alert('✅ 已移交并退出'); router.push('/dashboard') } else { alert('失败'); loading.value = false } }

const formatDate = (iso) => new Date(iso).toLocaleDateString()
const formatFullTime = (iso) => { if (!iso) return ''; const date = new Date(iso); return `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}` }
const formatSmartTime = (iso) => formatFullTime(iso)
const getRoleClass = (role) => { if (role === '主催') return 'r-leader'; if (role === '团长') return 'r-owner'; if (role === '管理员') return 'r-admin'; if (['画师', 'P主', '调音', '混音', '作词', 'PV'].includes(role)) return 'r-pro'; return 'r-common' }
</script>

<style scoped>
/* 样式保留 */
.circle-center-page { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.center-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.btn-back { background: none; border: 1px solid #ddd; padding: 5px 15px; border-radius: 20px; cursor: pointer; color: #666; transition: 0.2s; }
.btn-back:hover { border-color: #39C5BB; color: #39C5BB; }
.loading-box { text-align: center; padding: 50px; }
.spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #39C5BB; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.circle-dashboard { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.circle-header-card { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.header-left { display: flex; flex-direction: column; gap: 5px; }
.status-row { display: flex; align-items: center; gap: 10px; }
.badge-mine { background: #39C5BB; color: white; font-size: 12px; padding: 2px 6px; border-radius: 4px; }
.my-role-badge { font-size: 13px; color: #555; background: #f0f0f0; display: inline-block; padding: 4px 8px; border-radius: 4px; margin-top: 5px; }
.owner-star { color: #f39c12; font-weight: bold; }
.circle-name { margin: 5px 0 0; font-size: 24px; }
.owner-btn-group { display: flex; gap: 10px; }
.danger-btn { background: white; border: 1px solid #ff7675; color: #ff7675; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
.warning-btn { background: #fff3e0; border: 1px solid #ffb74d; color: #f57c00; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; }

.circle-grid-layout { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
.panel { background: #f9f9f9; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px; overflow: hidden; }
.panel-header { padding: 10px 15px; background: #f0f2f5; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.with-btn button { font-size: 12px; padding: 4px 10px; cursor: pointer; }

.members-area { max-height: 400px; overflow-y: auto; }
.member-list { padding: 10px; }
.member-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee; }
.mem-info { display: flex; align-items: center; gap: 8px; }
.role-badge { font-size: 10px; padding: 2px 5px; border-radius: 3px; color: white; }
.r-owner { background: #d35400; } .r-leader { background: #f39c12; } .r-admin { background: #00bcd4; } .r-pro { background: #9c27b0; } .r-common { background: #bdc3c7; }
.uid-name { font-size: 13px; color: #333; display: flex; align-items: center; gap: 4px; }
.mem-uid { font-size: 11px; color: #888; font-family: monospace; }

.icon-btn { border: none; background: none; cursor: pointer; font-size: 14px; padding: 0 4px; }

.message-board { display: flex; flex-direction: column; height: 500px; }
.msg-list { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 12px; }
.system-msg-row { display: flex; justify-content: center; margin: 8px 0; }
.system-msg-pill { background: #f0f2f5; color: #666; padding: 4px 12px; border-radius: 20px; font-size: 11px; display: flex; align-items: center; gap: 8px; border: 1px solid #e0e0e0; }
.msg-bubble { max-width: 80%; padding: 10px 14px; border-radius: 12px; background: white; border: 1px solid #eee; align-self: flex-start; }
.msg-bubble.mine { align-self: flex-end; background: #e0f7fa; border-color: #b2dfdb; }
.msg-meta { font-size: 10px; color: #999; margin-bottom: 6px; display: flex; justify-content: space-between; gap: 15px; }
.msg-input-area { padding: 10px; border-top: 1px solid #ddd; display: flex; gap: 10px; }
.msg-input-area input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.msg-input-area button { background: #39C5BB; color: white; border: none; padding: 0 15px; border-radius: 6px; cursor: pointer; }

.btn-add-proj { background: #39C5BB; color: white; border: none; border-radius: 4px; }
.proj-list { padding: 10px; }
.proj-item { background: white; border: 1px solid #eee; padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
.proj-left { display: flex; gap: 10px; align-items: center; }
.proj-tag { font-size: 10px; background: #eee; padding: 2px 5px; border-radius: 3px; }
.proj-tag.type { background: #e0f2f1; color: #00695c; font-weight: bold; }
.proj-tag.external { background: #e3f2fd; color: #1565c0; }
.btn-view { font-size: 12px; border: 1px solid #39C5BB; color: #39C5BB; background: white; padding: 2px 8px; border-radius: 10px; cursor: pointer; }
.btn-del-mini { background: none; border: none; font-size: 12px; cursor: pointer; opacity: 0.6; }

.invite-section { background: #fff; padding: 0; }
.invite-actions { padding: 15px; display: flex; gap: 10px; border-bottom: 1px solid #f0f0f0; }
.invite-list { max-height: 200px; overflow-y: auto; }
.invite-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid #f9f9f9; }
.inv-code { font-family: monospace; font-weight: bold; font-size: 16px; color: #333; }
.inv-meta { font-size: 11px; color: #999; margin-left: 10px; }
.btn-del-inv { font-size: 11px; color: #ff6b6b; border: 1px solid #ffcdd2; background: white; padding: 2px 6px; border-radius: 4px; cursor: pointer; }
.empty-inv { text-align: center; color: #ccc; padding: 20px; font-size: 12px; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 25px; border-radius: 12px; width: 350px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
.tags-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 15px 0; }
.tag-option { padding: 6px 12px; border: 1px solid #ddd; background: white; border-radius: 15px; cursor: pointer; font-size: 12px; transition: 0.2s; }
.tag-option.selected { background: #39C5BB; color: white; border-color: #39C5BB; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.admin-list { margin: 15px 0; max-height: 200px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; }
.admin-option { padding: 10px; display: flex; align-items: center; gap: 10px; cursor: pointer; border-bottom: 1px solid #f9f9f9; }
.btn-gen { background: #39C5BB; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; flex: 1; }
.no-circle-view { max-width: 600px; margin: 0 auto; }
.action-grid { display: flex; gap: 15px; margin-bottom: 20px; }
.join-card, .create-card { flex: 1; background: white; padding: 20px; border-radius: 12px; border: 1px solid #eee; }
.join-input-group, .switch-row.mini { display: flex; gap: 5px; margin-top: 10px; }
.public-hall-section { border-top: 1px dashed #eee; padding-top: 20px; }
.public-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.public-card { background: white; border: 1px solid #eee; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
.btn-quick-join { background: #e0f2f1; color: #00695c; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
.toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .toggle-slider { background-color: #39C5BB; }
input:checked + .toggle-slider:before { transform: translateX(16px); }
.status-text { font-size: 12px; color: #2e7d32; font-weight: bold; margin-left: 5px; }
.status-text.private { color: #c62828; }
.status-readonly { font-size: 12px; color: #666; background: #eee; padding: 2px 6px; border-radius: 4px; }
</style>