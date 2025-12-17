<template>
  <div class="dashboard-container">
    
    <div class="profile-header">
      <div class="avatar-section">
        <div class="avatar">{{ userInitial }}</div>
        <div class="info">
          <h2>{{ currentUser?.user_metadata?.username || '用户' }}</h2>
          <p class="email">{{ currentUser?.email }}</p>
          <div class="tags">
            <span class="role-badge" v-if="isAdmin">⚡ 管理员</span>
            <span class="role-badge member" v-else>☁️ 普通成员</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button v-if="isAdmin" @click="$router.push('/admin')" class="admin-btn">🎛️ 后台</button>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn" :class="{ active: currentTab === 'works' }" @click="currentTab = 'works'">
        📦 我的投稿
      </button>
      <button class="tab-btn" :class="{ active: currentTab === 'circle' }" @click="currentTab = 'circle'">
        🏯 社团中心
      </button>
    </div>

    <div v-if="currentTab === 'works'" class="tab-content">
      <div class="empty-hint">
        <p>这里是你发布的周边或活动记录</p>
        <router-link to="/submit" class="link">去发布新作品 ➔</router-link>
      </div>
    </div>

    <div v-else-if="currentTab === 'circle'" class="tab-content">
      
      <div v-if="loadingCircle" class="loading-box">
        <div class="spinner"></div>
        <p>读取数据中...</p>
      </div>

      <div v-else-if="myCircle" class="circle-dashboard">
        <div class="circle-header">
          <div class="header-left">
            <span class="badge-mine">我的社团</span>
            <h2 class="circle-name">
              {{ myCircle.name }}
              <span class="visibility-tag" :class="myCircle.is_public ? 'pub' : 'pri'">
                {{ myCircle.is_public ? '🌐 公开' : '🔒 私密' }}
              </span>
            </h2>
          </div>
          <div class="circle-actions">
            <template v-if="isOwner">
              <label class="switch-label">
                <input type="checkbox" :checked="myCircle.is_public" @change="togglePublic">
                <span class="slider"></span>
                <span class="switch-text">{{ myCircle.is_public ? '招募中' : '隐藏' }}</span>
              </label>
              <button @click="disbandCircle" class="danger-btn">💥 解散</button>
            </template>
            <button v-else @click="leaveCircle" class="danger-btn">👋 退出</button>
          </div>
        </div>

        <div class="invite-generator">
          <div class="ig-header">
            <h4>🎫 生成入社邀请函</h4>
            <span class="ig-desc">生成的链接具有时效性，防止恶意传播</span>
          </div>
          
          <div v-if="generatedLink" class="link-result">
            <div class="link-box">{{ generatedLink }}</div>
            <button @click="copyLink" class="btn-copy">复制链接</button>
            <button @click="generatedLink = ''" class="btn-close">×</button>
          </div>

          <div v-else class="ig-actions">
            <button @click="createInvite(1)" class="btn-gen">🔗 生成单次链接 (1人/24h)</button>
            <button @click="createInvite(100)" class="btn-gen sec">🔗 生成多人链接 (100人/7天)</button>
          </div>
        </div>

        <div v-if="isOwner && applications.length > 0" class="inbox-area">
          <h3>📩 待审核申请 ({{ applications.length }})</h3>
          <div class="app-list">
            <div v-for="app in applications" :key="app.id" class="app-card">
              <div class="app-header">
                <strong>{{ app.nickname }}</strong>
                <span class="app-contact">联系: {{ app.contact_info }}</span>
              </div>
              <div class="app-reason">"{{ app.reason }}"</div>
              <div class="app-actions">
                <button @click="handleApprove(app)" class="btn-agree">✅ 同意</button>
                <button @click="handleReject(app.id)" class="btn-reject">❌ 拒绝</button>
              </div>
            </div>
          </div>
        </div>

        <div class="members-area">
          <h3>👥 成员名单 ({{ members.length }})</h3>
          <div class="member-list">
            <div v-for="m in members" :key="m.id" class="member-item">
              <div class="m-left">
                <span class="role-tag" :class="getRoleStyle(m.role)">{{ m.role || '成员' }}</span>
                <span class="uid">ID: {{ m.user_id.slice(0,6) }}...</span>
              </div>
              <div v-if="isOwner && m.user_id !== currentUser.id" class="owner-tools">
                <button @click="kickMember(m.id)" class="kick-btn">踢出</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="myPendingApp" class="pending-state">
        <div class="state-icon">⏳</div>
        <h3>申请已提交</h3>
        <p>你申请加入 <strong>{{ pendingCircleName }}</strong> 的请求正在审核中。</p>
        <button @click="cancelApplication" class="btn-cancel">撤销申请</button>
      </div>

      <div v-else class="no-circle-explore">
        
        <div v-if="inviteInfo" class="target-invite-box">
          <div class="invite-header">
            <h3>💌 社团邀请函</h3>
            <p v-if="inviteCircleName">你受邀加入 <strong>{{ inviteCircleName }}</strong></p>
            <p v-else>正在验证邀请函...</p>
          </div>

          <div v-if="inviteError" class="error-msg">
            ⚠️ {{ inviteError }}
            <button @click="clearInvite" class="btn-text">关闭</button>
          </div>

          <div v-else class="form-area">
            <input v-model="applyForm.nickname" placeholder="你的昵称" />
            <input v-model="applyForm.contact" placeholder="联系方式 (QQ/微信)" />
            <textarea v-model="applyForm.reason" placeholder="申请理由 (选填)" rows="2"></textarea>
            <div class="btn-row">
              <button @click="submitApplication(inviteInfo.circle_id)" class="btn-main full-width">提交申请</button>
              <button @click="clearInvite" class="btn-text">取消</button>
            </div>
          </div>
        </div>

        <template v-else>
          <div class="explore-hero">
            <h3>✨ 还没有社团？</h3>
            <p>创建属于你的二次元社团，或者加入已有的组织！</p>
          </div>

          <div class="actions-stack">
            <div class="action-layer create-layer">
              <div class="create-box">
                <div class="cb-header">
                  <span class="cb-icon">👑</span>
                  <h4>成立新社团</h4>
                </div>
                <div class="create-form">
                  <input v-model="newCircleName" placeholder="给社团起个响亮的名字..." class="main-input" />
                  <div class="form-controls">
                    <label class="check-label">
                      <input type="checkbox" v-model="newCirclePublic"> 
                      <span>设为公开招募</span>
                    </label>
                    <button @click="createCircle" class="btn-main" :disabled="creating">
                      {{ creating ? '创建中...' : '立即成立' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="action-layer list-layer">
              <div class="layer-header">
                <h4>🌐 招募中的社团</h4>
                <span class="sub-tip">点击卡片即可申请加入</span>
              </div>
              
              <div v-if="loadingPublic" class="loading-text">加载中...</div>
              <div v-else-if="publicCircles.length === 0" class="empty-list">暂无公开社团</div>
              
              <div v-else class="circle-grid">
                <div v-for="c in publicCircles" :key="c.id" class="circle-card" @click="openApplyModal(c)">
                  <div class="card-icon">🏰</div>
                  <div class="card-info">
                    <h5>{{ c.name }}</h5>
                    <div class="card-meta">
                      <span>👤 {{ c.owner_id.slice(0,4) }}...</span>
                      <span class="join-tag">申请加入</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

    </div>

    <div v-if="showApplyModal" class="modal-overlay" @click.self="showApplyModal = false">
      <div class="modal-content">
        <h3>申请加入: {{ selectedCircle?.name }}</h3>
        <div class="form-group">
          <label>你的昵称</label>
          <input v-model="applyForm.nickname" />
        </div>
        <div class="form-group">
          <label>联系方式</label>
          <input v-model="applyForm.contact" />
        </div>
        <div class="form-group">
          <label>申请理由</label>
          <textarea v-model="applyForm.reason"></textarea>
        </div>
        <div class="modal-actions">
          <button @click="submitApplication(selectedCircle.id)" class="btn-main">发送申请</button>
          <button @click="showApplyModal = false" class="btn-flat">取消</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useRoute } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()
const route = useRoute()

// 状态
const currentUser = ref(null)
const currentTab = ref('circle')
const loadingCircle = ref(false)
const loadingPublic = ref(false)
const creating = ref(false)

// 数据
const myCircle = ref(null)
const members = ref([])
const applications = ref([])
const myPendingApp = ref(null)
const pendingCircleName = ref('')
const publicCircles = ref([])

// 邀请函相关
const generatedLink = ref('')
const inviteInfo = ref(null)      
const inviteCircleName = ref('')  
const inviteError = ref('')       

// 交互
const newCircleName = ref('')
const newCirclePublic = ref(true)
const showApplyModal = ref(false)
const selectedCircle = ref(null)
const applyForm = ref({ nickname: '', contact: '', reason: '' })

// 计算属性
const userInitial = computed(() => currentUser.value?.email?.[0].toUpperCase() || 'U')
const isAdmin = computed(() => currentUser.value?.email === 'admin@39wikis.com')
const isOwner = computed(() => myCircle.value && currentUser.value && myCircle.value.owner_id === currentUser.value.id)

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const inviteCode = route.query.invite
  
  if (!user) {
    if (inviteCode) {
      sessionStorage.setItem('pending_invite', inviteCode)
      alert('请先登录或注册账号，即可接受邀请！')
      router.push('/login')
    } else {
      router.push('/login')
    }
    return
  }
  
  currentUser.value = user
  const cachedInvite = sessionStorage.getItem('pending_invite')
  if (cachedInvite) {
    verifyInvite(cachedInvite)
    sessionStorage.removeItem('pending_invite')
  } else if (inviteCode) {
    verifyInvite(inviteCode)
  }

  await fetchAllData()
})

const createInvite = async (type) => {
  if (!myCircle.value) return
  const now = new Date()
  let expiresAt = new Date()
  let maxUses = 1
  if (type === 1) { expiresAt.setHours(now.getHours() + 24); maxUses = 1 } 
  else { expiresAt.setDate(now.getDate() + 7); maxUses = 100 }

  const { data, error } = await supabase.from('circle_invites').insert([{
    circle_id: myCircle.value.id, created_by: currentUser.value.id, expires_at: expiresAt.toISOString(), max_uses: maxUses
  }]).select().single()

  if (error) return alert('生成失败: ' + error.message)
  generatedLink.value = `https://39wikis.com/dashboard?invite=${data.id}`
}

const verifyInvite = async (inviteId) => {
  inviteError.value = ''; inviteInfo.value = null
  const { data: invite, error } = await supabase.from('circle_invites').select('*, circles(name)').eq('id', inviteId).single()
  if (error || !invite) { inviteError.value = '该链接无效或不存在'; inviteInfo.value = { dummy: true }; return }
  if (new Date() > new Date(invite.expires_at)) { inviteError.value = '该邀请链接已过期失效'; inviteInfo.value = { dummy: true }; return }
  if (invite.used_count >= invite.max_uses) { inviteError.value = '该链接的使用次数已耗尽'; inviteInfo.value = { dummy: true }; return }
  inviteInfo.value = invite; inviteCircleName.value = invite.circles?.name
}

const fetchAllData = async () => {
  loadingCircle.value = true
  const { data: mem } = await supabase.from('circle_members').select('circle_id').eq('user_id', currentUser.value.id).maybeSingle()
  if (mem) {
    inviteInfo.value = null
    const { data: circle } = await supabase.from('circles').select('*').eq('id', mem.circle_id).single()
    myCircle.value = circle
    await fetchMembers(circle.id)
    if (circle.owner_id === currentUser.value.id) await fetchApplications(circle.id)
  } else {
    const { data: pending } = await supabase.from('circle_applications').select('*, circles(name)').eq('user_id', currentUser.value.id).eq('status', 'pending').maybeSingle()
    if (pending) { myPendingApp.value = pending; pendingCircleName.value = pending.circles?.name || '未知社团'; inviteInfo.value = null } 
    else { await fetchPublicCircles() }
  }
  loadingCircle.value = false
}

const fetchMembers = async (cid) => { const { data } = await supabase.from('circle_members').select('*').eq('circle_id', cid); members.value = data || [] }
const fetchApplications = async (cid) => { const { data } = await supabase.from('circle_applications').select('*').eq('circle_id', cid).eq('status', 'pending'); applications.value = data || [] }
const fetchPublicCircles = async () => {
  loadingPublic.value = true
  const { data } = await supabase.from('circles').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(20) // 增加获取数量，填充网格
  publicCircles.value = data || []
  loadingPublic.value = false
}

const createCircle = async () => {
  if (!newCircleName.value) return alert('请输入名称')
  creating.value = true
  try {
    const { data: c, error } = await supabase.from('circles').insert([{ name: newCircleName.value, owner_id: currentUser.value.id, is_public: newCirclePublic.value }]).select().single()
    if (error) throw error
    await supabase.from('circle_members').insert([{ circle_id: c.id, user_id: currentUser.value.id, role: '主催' }])
    await fetchAllData()
  } catch (e) { alert('创建失败: ' + e.message) } finally { creating.value = false }
}

const submitApplication = async (cid) => {
  if (!applyForm.value.nickname || !applyForm.value.contact) return alert('请填写完整信息')
  const { error } = await supabase.from('circle_applications').insert([{
    circle_id: cid, user_id: currentUser.value.id, nickname: applyForm.value.nickname, contact_info: applyForm.value.contact, reason: applyForm.value.reason || '通过邀请链接申请'
  }])
  if (error) { if (error.code === '23505') alert('请勿重复申请'); else alert('申请失败: ' + error.message); return }
  if (inviteInfo.value && inviteInfo.value.id) { await supabase.from('circle_invites').update({ used_count: inviteInfo.value.used_count + 1 }).eq('id', inviteInfo.value.id) }
  alert('申请已发送！'); showApplyModal.value = false; inviteInfo.value = null; await fetchAllData()
}

const handleApprove = async (app) => {
  const { error } = await supabase.from('circle_members').insert([{ circle_id: app.circle_id, user_id: app.user_id, role: '成员' }])
  if (error) return alert(error.message)
  await supabase.from('circle_applications').update({ status: 'approved' }).eq('id', app.id)
  fetchMembers(myCircle.value.id); fetchApplications(myCircle.value.id)
}

const handleReject = async (appId) => { if (!confirm('拒绝该申请？')) return; await supabase.from('circle_applications').update({ status: 'rejected' }).eq('id', appId); fetchApplications(myCircle.value.id) }
const cancelApplication = async () => { if (!confirm('撤销申请？')) return; await supabase.from('circle_applications').delete().eq('id', myPendingApp.value.id); myPendingApp.value = null; fetchAllData() }
const openApplyModal = (circle) => { selectedCircle.value = circle; showApplyModal.value = true }
const clearInvite = () => { inviteInfo.value = null; router.replace({ query: null }) }
const copyLink = () => { navigator.clipboard.writeText(generatedLink.value); alert('链接已复制') }
const togglePublic = async () => { const v = !myCircle.value.is_public; await supabase.from('circles').update({ is_public: v }).eq('id', myCircle.value.id); myCircle.value.is_public = v }
const kickMember = async (mid) => { if(confirm('踢出？')) { await supabase.from('circle_members').delete().eq('id', mid); fetchMembers(myCircle.value.id) } }
const leaveCircle = async () => { if(confirm('退出？')) { await supabase.from('circle_members').delete().eq('user_id', currentUser.value.id).eq('circle_id', myCircle.value.id); myCircle.value = null; fetchAllData() } }
const disbandCircle = async () => { if(confirm('确认解散？')) { await supabase.from('circles').delete().eq('id', myCircle.value.id); myCircle.value = null; fetchAllData() } }
const getRoleStyle = (r) => r === '主催' ? 'role-leader' : 'role-mem'
const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
</script>

<style scoped>
.dashboard-container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }

/* 头部样式 */
.profile-header { background: white; padding: 25px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; }
.avatar-section { display: flex; gap: 15px; align-items: center; }
.avatar { width: 60px; height: 60px; background: #39C5BB; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
.info h2 { margin: 0; font-size: 20px; }
.email { color: #888; margin: 5px 0 8px; font-size: 13px; }
.role-badge { background: #f39c12; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.role-badge.member { background: #eee; color: #666; }
.header-actions button { margin-left: 10px; padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; }
.admin-btn { background: #333; color: white; }
.logout-btn { background: #fee; color: #e33; }

/* Tabs */
.tabs { display: flex; gap: 20px; border-bottom: 1px solid #eee; margin-bottom: 20px; }
.tab-btn { padding: 10px 5px; background: none; border: none; font-size: 16px; color: #999; cursor: pointer; border-bottom: 3px solid transparent; }
.tab-btn.active { color: #39C5BB; border-bottom-color: #39C5BB; font-weight: bold; }

/* 社团看板 */
.circle-dashboard { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
.circle-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
.badge-mine { background: #39C5BB; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.circle-name { margin: 5px 0 0; display: flex; gap: 10px; align-items: center; }
.visibility-tag { font-size: 12px; padding: 2px 6px; border-radius: 4px; border: 1px solid #eee; font-weight: normal; }
.visibility-tag.pub { color: #1976d2; background: #e3f2fd; }
.visibility-tag.pri { color: #f57c00; background: #fff3e0; }
.circle-actions { display: flex; gap: 10px; align-items: center; }
.switch-label { display: flex; gap: 5px; font-size: 13px; cursor: pointer; align-items: center; color: #666; }
.danger-btn { background: white; border: 1px solid #ff7675; color: #ff7675; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }

/* 邀请生成器 & 收件箱 & 成员列表 (复用旧样式，保持一致性) */
.invite-generator { background: #f8f9fa; border: 1px dashed #ccc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
.ig-header h4 { margin: 0 0 5px; font-size: 14px; }
.ig-desc { font-size: 12px; color: #888; }
.ig-actions { margin-top: 10px; display: flex; gap: 10px; }
.btn-gen { background: #39C5BB; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-gen.sec { background: #607d8b; }
.link-result { margin-top: 10px; display: flex; gap: 10px; align-items: center; }
.link-box { background: white; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; flex: 1; font-family: monospace; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-copy { background: #39C5BB; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #999; }

.inbox-area { background: #f0f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0f2f1; }
.app-list { display: flex; flex-direction: column; gap: 8px; }
.app-card { background: white; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
.app-header strong { font-size: 14px; }
.app-contact { font-size: 12px; color: #666; background: #eee; padding: 2px 4px; border-radius: 4px; margin-left: 5px; }
.app-reason { font-size: 12px; color: #555; flex: 1; margin: 0 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.app-actions button { padding: 4px 8px; margin-left: 5px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-agree { background: #e0f2f1; color: #00695c; }
.btn-reject { background: #ffebee; color: #c62828; }

.member-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.member-item { background: #f9f9f9; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
.role-tag { font-size: 10px; padding: 2px 5px; border-radius: 3px; color: white; margin-right: 5px; }
.role-leader { background: #f39c12; }
.role-mem { background: #bdc3c7; }
.uid { font-size: 11px; color: #999; font-family: monospace; }
.kick-btn { font-size: 10px; color: red; background: none; border: 1px solid red; border-radius: 3px; cursor: pointer; }

/* 邀请界面 & 探索 (新版布局核心CSS) */
.no-circle-explore { background: #f5f7fa; padding: 20px; border-radius: 12px; }
.target-invite-box { background: white; max-width: 400px; margin: 0 auto; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
.error-msg { color: #c62828; background: #ffebee; padding: 10px; border-radius: 6px; margin: 10px 0; font-size: 13px; }
.form-area input, .form-area textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #eee; border-radius: 6px; box-sizing: border-box; }
.btn-row { display: flex; flex-direction: column; gap: 8px; }
.full-width { width: 100%; padding: 10px; }
.btn-text { background: none; border: none; color: #999; cursor: pointer; font-size: 12px; }

.explore-hero { text-align: center; margin-bottom: 30px; }
.explore-hero h3 { margin: 0; color: #2c3e50; }
.explore-hero p { margin: 5px 0 0; color: #7f8c8d; font-size: 14px; }

/* 垂直分层布局 */
.actions-stack { display: flex; flex-direction: column; gap: 30px; }
.action-layer { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }

/* 上层：创建社团 */
.create-box { max-width: 600px; margin: 0 auto; }
.cb-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
.cb-icon { font-size: 24px; }
.cb-header h4 { margin: 0; font-size: 18px; color: #333; }
.create-form { display: flex; flex-direction: column; gap: 15px; }
.main-input { font-size: 16px; padding: 12px; border: 2px solid #eee; border-radius: 8px; width: 100%; box-sizing: border-box; transition: 0.3s; }
.main-input:focus { border-color: #39C5BB; outline: none; }
.form-controls { display: flex; justify-content: space-between; align-items: center; }
.check-label { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #666; cursor: pointer; }
.btn-main { background: #39C5BB; color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; transition: 0.2s; }
.btn-main:hover { background: #26a69a; transform: translateY(-1px); }
.btn-main:disabled { background: #b2dfdb; cursor: not-allowed; }

/* 下层：网格列表 */
.layer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.layer-header h4 { margin: 0; font-size: 16px; color: #333; border-left: 4px solid #39C5BB; padding-left: 10px; }
.sub-tip { font-size: 12px; color: #999; }

.circle-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
.circle-card { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 15px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: 0.2s; }
.circle-card:hover { border-color: #39C5BB; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(57, 197, 187, 0.15); }
.card-icon { width: 40px; height: 40px; background: #e0f2f1; color: #00695c; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.card-info { flex: 1; }
.card-info h5 { margin: 0 0 5px; font-size: 15px; color: #2c3e50; }
.card-meta { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #999; }
.join-tag { color: #39C5BB; font-weight: bold; background: #e0f2f1; padding: 2px 6px; border-radius: 4px; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-content { background: white; padding: 25px; border-radius: 12px; width: 350px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; font-weight: bold; margin-bottom: 5px; }
.form-group input, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-flat { background: none; border: none; color: #666; cursor: pointer; }
</style>