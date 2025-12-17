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

        <div class="invite-bar">
          <div class="invite-info">
            <span class="icon">🔗</span>
            <span class="label">社团链接:</span>
            <code class="code text-ellipsis">{{ shareLink }}</code>
          </div>
          <button @click="copyLink" class="copy-small">复制链接</button>
          <span class="tip">发送给其他人，对方点击即可申请加入</span>
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
        <p class="sub-tip">请耐心等待管理员通过，或关注你的联系方式。</p>
        <button @click="cancelApplication" class="btn-cancel">撤销申请</button>
      </div>

      <div v-else class="no-circle-explore">
        
        <div v-if="targetCircleId" class="target-invite-box">
          <div class="invite-header">
            <h3>💌 你收到了社团邀请</h3>
            <p>你正在申请加入 ID 为 <code>{{ targetCircleId.slice(0,8) }}...</code> 的社团</p>
          </div>
          <div class="form-area">
            <input v-model="applyForm.nickname" placeholder="你的昵称 (入社后显示)" />
            <input v-model="applyForm.contact" placeholder="联系方式 (QQ/微信/手机，仅管理可见)" />
            <textarea v-model="applyForm.reason" placeholder="申请理由 (我是谁，我想做什么...)" rows="2"></textarea>
            <div class="btn-row">
              <button @click="submitApplication(targetCircleId)" class="btn-main full-width">提交申请</button>
              <button @click="clearTarget" class="btn-text">取消</button>
            </div>
          </div>
        </div>

        <template v-else>
          <div class="explore-hero">
            <h3>✨ 还没有社团？</h3>
            <p>创建属于你的二次元社团，或者加入已有的组织！</p>
          </div>

          <div class="actions-row">
            <div class="action-column">
              <div class="card-box create-box">
                <h4>👑 成立新社团</h4>
                <input v-model="newCircleName" placeholder="社团名称" />
                <div class="row">
                  <label class="check-label">
                    <input type="checkbox" v-model="newCirclePublic"> 公开招募
                  </label>
                  <button @click="createCircle" class="btn-main" :disabled="creating">
                    {{ creating ? '创建中...' : '立即成立' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="public-list-column">
              <h4>🌐 招募中的社团</h4>
              <div v-if="loadingPublic" class="loading-text">加载中...</div>
              <div v-else-if="publicCircles.length === 0" class="empty-list">暂无公开社团</div>
              <div v-else class="circle-grid">
                <div v-for="c in publicCircles" :key="c.id" class="pub-circle-card">
                  <div class="pc-info">
                    <h5>{{ c.name }}</h5>
                    <span class="pc-meta">由 {{ c.owner_id.slice(0,4) }}... 创建</span>
                  </div>
                  <button @click="openApplyModal(c)" class="btn-apply">申请加入</button>
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
          <input v-model="applyForm.nickname" placeholder="例如：MikuFan01" />
        </div>
        <div class="form-group">
          <label>联系方式</label>
          <input v-model="applyForm.contact" placeholder="QQ / 微信 / 邮箱" />
        </div>
        <div class="form-group">
          <label>申请理由</label>
          <textarea v-model="applyForm.reason" placeholder="简述你的来意..."></textarea>
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
import { ref, onMounted, computed, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useRoute } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()
const route = useRoute() // 用于获取URL参数

// 状态
const currentUser = ref(null)
const currentTab = ref('circle')
const loadingCircle = ref(false)
const loadingPublic = ref(false)
const creating = ref(false)

// 数据
const myCircle = ref(null)
const members = ref([])
const applications = ref([]) // 我收到的申请(我是团长)
const myPendingApp = ref(null) // 我发出的申请(我是路人)
const pendingCircleName = ref('')
const publicCircles = ref([])

// 交互
const newCircleName = ref('')
const newCirclePublic = ref(true)
const targetCircleId = ref(null) // 来自URL分享的社团ID
const showApplyModal = ref(false)
const selectedCircle = ref(null)
const applyForm = ref({ nickname: '', contact: '', reason: '' })

// 计算属性
const userInitial = computed(() => currentUser.value?.email?.[0].toUpperCase() || 'U')
const isAdmin = computed(() => currentUser.value?.email === 'admin@39wikis.com') // 请修改为真实管理员邮箱
const isOwner = computed(() => myCircle.value && currentUser.value && myCircle.value.owner_id === currentUser.value.id)
const shareLink = computed(() => myCircle.value ? `https://39wikis.com/dashboard?cid=${myCircle.value.id}` : '')

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/login'); return }
  currentUser.value = user
  
  // 检查URL是否有分享链接参数 cid
  if (route.query.cid) {
    targetCircleId.value = route.query.cid
  }

  await fetchAllData()
})

const fetchAllData = async () => {
  loadingCircle.value = true
  
  // 1. 检查我是否已经是成员
  const { data: mem } = await supabase.from('circle_members')
    .select('circle_id').eq('user_id', currentUser.value.id).maybeSingle()
  
  if (mem) {
    // 已加入社团 -> 获取详情
    const { data: circle } = await supabase.from('circles').select('*').eq('id', mem.circle_id).single()
    myCircle.value = circle
    // 清除URL参数带来的干扰，因为已经有社团了
    targetCircleId.value = null 
    
    await fetchMembers(circle.id)
    if (circle.owner_id === currentUser.value.id) {
      await fetchApplications(circle.id) // 团长获取待审核列表
    }
  } else {
    // 未加入 -> 检查是否有待审核的申请
    const { data: pending } = await supabase.from('circle_applications')
      .select('*, circles(name)')
      .eq('user_id', currentUser.value.id)
      .eq('status', 'pending')
      .maybeSingle()
    
    if (pending) {
      myPendingApp.value = pending
      pendingCircleName.value = pending.circles?.name || '未知社团'
    } else {
      // 既没社团也没申请 -> 加载公开列表
      await fetchPublicCircles()
    }
  }
  loadingCircle.value = false
}

// --- 读取数据 ---
const fetchMembers = async (cid) => {
  const { data } = await supabase.from('circle_members').select('*').eq('circle_id', cid)
  members.value = data || []
}

const fetchApplications = async (cid) => {
  const { data } = await supabase.from('circle_applications')
    .select('*')
    .eq('circle_id', cid)
    .eq('status', 'pending')
  applications.value = data || []
}

const fetchPublicCircles = async () => {
  loadingPublic.value = true
  const { data } = await supabase.from('circles')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(8)
  publicCircles.value = data || []
  loadingPublic.value = false
}

// --- 核心操作 ---

// 创建社团
const createCircle = async () => {
  if (!newCircleName.value) return alert('请输入名称')
  creating.value = true
  try {
    // 创建社团 (不再需要 invite_code)
    const { data: c, error } = await supabase.from('circles')
      .insert([{ name: newCircleName.value, owner_id: currentUser.value.id, is_public: newCirclePublic.value }])
      .select().single()
    if (error) throw error

    // 自动成为成员
    await supabase.from('circle_members').insert([{ circle_id: c.id, user_id: currentUser.value.id, role: '主催' }])
    
    // 刷新
    await fetchAllData()
  } catch (e) {
    alert('创建失败: ' + e.message)
  } finally {
    creating.value = false
  }
}

// 提交申请 (通用逻辑)
const submitApplication = async (cid) => {
  if (!applyForm.value.nickname || !applyForm.value.contact || !applyForm.value.reason) {
    return alert('请填写完整的申请信息')
  }

  const { error } = await supabase.from('circle_applications').insert([{
    circle_id: cid,
    user_id: currentUser.value.id,
    nickname: applyForm.value.nickname,
    contact_info: applyForm.value.contact,
    reason: applyForm.value.reason
  }])

  if (error) {
    if (error.code === '23505') alert('你已经申请过该社团，请勿重复提交')
    else alert('申请失败: ' + error.message)
  } else {
    alert('申请已发送！请等待管理员审核。')
    showApplyModal.value = false
    targetCircleId.value = null // 清除URL状态
    await fetchAllData()
  }
}

// 处理审核: 同意
const handleApprove = async (app) => {
  // 1. 插入成员表
  const { error: insertErr } = await supabase.from('circle_members').insert([{
    circle_id: app.circle_id,
    user_id: app.user_id,
    role: '成员'
  }])
  
  if (insertErr) return alert('加入成员表失败: ' + insertErr.message)

  // 2. 更新申请状态为 approved
  await supabase.from('circle_applications').update({ status: 'approved' }).eq('id', app.id)
  
  // 3. 刷新列表
  await fetchMembers(myCircle.value.id)
  await fetchApplications(myCircle.value.id)
}

// 处理审核: 拒绝
const handleReject = async (appId) => {
  if (!confirm('确定拒绝该申请吗？')) return
  await supabase.from('circle_applications').update({ status: 'rejected' }).eq('id', appId)
  await fetchApplications(myCircle.value.id)
}

// 撤销我的申请
const cancelApplication = async () => {
  if (!confirm('确定撤销申请吗？')) return
  await supabase.from('circle_applications').delete().eq('id', myPendingApp.value.id)
  myPendingApp.value = null
  await fetchAllData()
}

// 打开弹窗
const openApplyModal = (circle) => {
  selectedCircle.value = circle
  showApplyModal.value = true
}

// 清除URL目标
const clearTarget = () => {
  targetCircleId.value = null
  // 移除URL参数但不刷新页面
  router.replace({ query: null })
}

// 辅助功能
const copyLink = () => {
  navigator.clipboard.writeText(shareLink.value)
  alert('链接已复制：' + shareLink.value)
}
const togglePublic = async () => {
  const newVal = !myCircle.value.is_public
  await supabase.from('circles').update({ is_public: newVal }).eq('id', myCircle.value.id)
  myCircle.value.is_public = newVal
}
const kickMember = async (mid) => {
  if (confirm('踢出该成员？')) {
    await supabase.from('circle_members').delete().eq('id', mid)
    fetchMembers(myCircle.value.id)
  }
}
const leaveCircle = async () => {
  if (confirm('确定退出社团？')) {
    await supabase.from('circle_members').delete().eq('user_id', currentUser.value.id).eq('circle_id', myCircle.value.id)
    myCircle.value = null
    fetchAllData()
  }
}
const disbandCircle = async () => {
  if (prompt(`确认解散？请输入社团名 "${myCircle.value.name}"`) === myCircle.value.name) {
    await supabase.from('circle_members').delete().eq('circle_id', myCircle.value.id) // 级联删除通常更安全，这里手动删保险
    await supabase.from('circles').delete().eq('id', myCircle.value.id)
    myCircle.value = null
    fetchAllData()
  }
}
const getRoleStyle = (r) => r === '主催' ? 'role-leader' : 'role-mem'
const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
</script>

<style scoped>
.dashboard-container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; color: #333; }

/* 头部 */
.profile-header { background: white; padding: 30px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-bottom: 20px; }
.avatar-section { display: flex; gap: 20px; align-items: center; }
.avatar { width: 70px; height: 70px; background: linear-gradient(135deg, #39C5BB, #2a9d8f); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; }
.info h2 { margin: 0; font-size: 22px; }
.email { color: #888; margin: 5px 0 10px; font-size: 14px; }
.header-actions button { margin-left: 10px; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; }
.admin-btn { background: #333; color: white; }
.logout-btn { background: #fee; color: #e33; }

/* Tabs */
.tabs { display: flex; gap: 20px; border-bottom: 1px solid #eee; margin-bottom: 20px; }
.tab-btn { padding: 10px 5px; background: none; border: none; font-size: 16px; color: #999; cursor: pointer; border-bottom: 3px solid transparent; }
.tab-btn.active { color: #39C5BB; border-bottom-color: #39C5BB; font-weight: bold; }

/* 社团主看板 */
.circle-dashboard { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 15px rgba(0,0,0,0.04); }
.circle-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px; }
.badge-mine { background: #39C5BB; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.circle-name { margin: 8px 0 0; display: flex; gap: 10px; align-items: center; }
.visibility-tag { font-size: 12px; padding: 2px 8px; border-radius: 4px; font-weight: normal; }
.visibility-tag.pub { background: #e3f2fd; color: #1976d2; }
.visibility-tag.pri { background: #fff3e0; color: #f57c00; }
.circle-actions { display: flex; gap: 10px; align-items: center; }
.switch-label { display: flex; gap: 5px; font-size: 13px; color: #666; cursor: pointer; align-items: center; }
.danger-btn { background: white; border: 1px solid #ff7675; color: #ff7675; padding: 5px 10px; border-radius: 4px; cursor: pointer; }

/* 链接分享栏 */
.invite-bar { background: #f8f9fa; padding: 12px; border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #555; margin-bottom: 25px; border: 1px dashed #ccc; }
.invite-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.code { background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #333; }
.text-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }
.copy-small { border: 1px solid #39C5BB; color: #39C5BB; background: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; flex-shrink: 0; }
.tip { color: #999; font-size: 12px; margin-left: auto; display: none; } 
@media (min-width: 600px) { .tip { display: block; } }

/* 审核收件箱 */
.inbox-area { margin-bottom: 30px; border: 1px solid #e0f2f1; background: #f0f9f9; padding: 15px; border-radius: 8px; }
.app-list { display: flex; flex-direction: column; gap: 10px; }
.app-card { background: white; padding: 10px 15px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; gap: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); }
.app-header strong { font-size: 14px; }
.app-contact { font-size: 12px; color: #666; margin-left: 8px; background: #eee; padding: 2px 4px; border-radius: 4px; }
.app-reason { font-size: 13px; color: #555; flex: 1; margin: 0 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.app-actions button { padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; margin-left: 5px; font-size: 12px; }
.btn-agree { background: #e0f2f1; color: #00695c; }
.btn-reject { background: #ffebee; color: #c62828; }

/* 成员列表 */
.member-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.member-item { background: #f9f9f9; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
.role-tag { font-size: 10px; padding: 2px 5px; border-radius: 3px; color: white; margin-right: 5px; }
.role-leader { background: #f39c12; }
.role-mem { background: #bdc3c7; }
.uid { font-size: 12px; color: #888; font-family: monospace; }
.kick-btn { font-size: 10px; color: red; border: 1px solid red; background: none; border-radius: 3px; cursor: pointer; }

/* 等待审核状态 */
.pending-state { text-align: center; padding: 50px; background: #fff8e1; border-radius: 12px; }
.state-icon { font-size: 40px; margin-bottom: 10px; }
.btn-cancel { margin-top: 20px; padding: 8px 20px; background: white; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; }

/* 探索/邀请界面 */
.no-circle-explore { background: #f5f7fa; padding: 20px; border-radius: 12px; }
.target-invite-box { background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.target-invite-box input, .target-invite-box textarea { width: 100%; box-sizing: border-box; margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 6px; }
.btn-row { display: flex; flex-direction: column; gap: 10px; }
.full-width { width: 100%; padding: 10px; }
.btn-text { background: none; border: none; color: #999; cursor: pointer; }

.explore-hero { text-align: center; margin-bottom: 30px; }
.actions-row { display: flex; gap: 20px; flex-wrap: wrap; }
.action-column { flex: 1; min-width: 280px; }
.card-box { background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
.card-box h4 { margin: 0 0 15px; color: #333; }
.card-box input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; box-sizing: border-box; }
.btn-main { background: #39C5BB; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
.btn-apply { border: 1px solid #39C5BB; color: #39C5BB; background: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-apply:hover { background: #39C5BB; color: white; }

.pub-circle-card { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 10px 0; }
.pc-info h5 { margin: 0 0 5px; }
.pc-meta { font-size: 12px; color: #999; }

/* 弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; padding: 25px; border-radius: 12px; width: 400px; max-width: 90%; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-size: 14px; font-weight: bold; }
.form-group input, .form-group textarea { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-flat { background: none; border: none; color: #666; cursor: pointer; }
</style>