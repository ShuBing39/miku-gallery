<template>
  <div class="dashboard-container">
    
    <div v-if="loading" class="full-screen-loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <template v-else>
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar">{{ userInitial }}</div>
          <div class="info">
            <h2>{{ currentUser?.user_metadata?.username || '用户' }}</h2>
            <p class="email">{{ currentUser?.email }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button @click="handleLogout" class="logout-btn">退出登录</button>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn" :class="{ active: currentTab === 'works' }" @click="currentTab = 'works'">📦 我的投稿</button>
        <button class="tab-btn" :class="{ active: currentTab === 'circle' }" @click="currentTab = 'circle'">🏯 社团中心</button>
      </div>

      <div v-if="currentTab === 'works'" class="tab-content">
        <div class="empty-hint">
          <p>这里是你的投稿记录</p>
          <router-link to="/submit" class="link">去发布新作品 ➔</router-link>
        </div>
      </div>

      <div v-else class="tab-content">
        
        <div v-if="myCircle" class="circle-dashboard">
          <div class="circle-header">
            <div class="header-left">
              <div class="status-row">
                <span class="badge-mine">我的社团</span>
                
                <div v-if="isOwner" class="privacy-toggle-wrapper">
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="tempIsPrivate" @change="updateCirclePrivacy">
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="status-text" :class="{ private: tempIsPrivate }">
                    {{ tempIsPrivate ? '🔒 私密 (仅邀请)' : '🌏 公开 (大厅可见)' }}
                  </span>
                </div>
                <span v-else class="status-readonly">
                  {{ myCircle.is_private ? '🔒 私密社团' : '🌏 公开社团' }}
                </span>

              </div>
              <h2 class="circle-name">{{ myCircle.name }}</h2>
            </div>
            
            <div class="circle-actions">
              <button v-if="isOwner" @click="disbandCircle" class="danger-btn">💥 解散</button>
              <button v-else @click="leaveCircle" class="danger-btn">👋 退出</button>
            </div>
          </div>

          <div v-if="isOwner" class="invite-section">
            <div class="is-header">
              <h4>🎫 邀请成员</h4>
              <p>生成具有时效性的短码，发送给朋友即可直接加入。</p>
            </div>

            <div v-if="activeCode" class="active-code-box">
              <div class="code-display">{{ activeCode.code }}</div>
              <div class="code-meta">
                <span>剩余次数: {{ activeCode.max_uses - activeCode.used_count }}</span>
                <span>有效期至: {{ formatDate(activeCode.expires_at) }}</span>
              </div>
              <button @click="activeCode = null" class="btn-close">关闭</button>
            </div>

            <div v-else class="generate-actions">
              <button @click="generateCode(1)" class="btn-gen">生成单人码 (24小时有效)</button>
              <button @click="generateCode(100)" class="btn-gen sec">生成多人码 (7天有效)</button>
            </div>
          </div>

          <div class="members-area">
            <h3>👥 成员 ({{ members.length }})</h3>
            <div class="member-list">
              <div v-for="m in members" :key="m.id" class="member-item">
                <span class="role-tag" :class="m.role === '主催' ? 'role-leader' : 'role-mem'">{{ m.role }}</span>
                <span class="uid">ID: {{ m.user_id.slice(0,6) }}</span>
                <button v-if="isOwner && m.user_id !== currentUser.id" @click="kickMember(m.id)" class="kick-btn">踢出</button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="no-circle-view">
          
          <div class="join-card">
            <h3>🤝 加入社团</h3>
            <p>输入团长分享的 6 位邀请码</p>
            <div class="join-input-group">
              <input v-model="inputCode" placeholder="例如: A8K29B" maxlength="6" />
              <button @click="handleJoinByCode" class="btn-join" :disabled="joining">
                {{ joining ? '加入中...' : '立即加入' }}
              </button>
            </div>
          </div>

          <div class="divider">或者</div>

          <div class="create-card">
            <h3>👑 创建新社团</h3>
            <div class="create-form-column">
              <input v-model="newCircleName" placeholder="给社团起个名字..." class="full-input" />
              
              <div class="switch-row">
                <label class="switch-label">
                  <input type="checkbox" v-model="newCirclePrivate">
                  <span class="checkbox-box"></span>
                  <span class="label-text">{{ newCirclePrivate ? '🔒 私密社团 (大厅不可见)' : '🌏 公开社团 (大厅可见)' }}</span>
                </label>
              </div>

              <button @click="createCircle" class="btn-create">立即成立</button>
            </div>
          </div>

        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const router = useRouter()

const loading = ref(true)
const joining = ref(false)
const currentUser = ref(null)
const currentTab = ref('circle')

const myCircle = ref(null)
const members = ref([])
const activeCode = ref(null)

const inputCode = ref('')
const newCircleName = ref('')
const newCirclePrivate = ref(false)
const tempIsPrivate = ref(false) // 用于绑定已存在社团的开关状态

const userInitial = computed(() => currentUser.value?.email?.[0]?.toUpperCase() || 'U')
const isOwner = computed(() => myCircle.value && currentUser.value && myCircle.value.owner_id === currentUser.value.id)

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
      tempIsPrivate.value = circle.is_private // ✅ 同步状态到开关
      await fetchMembers(circle.id)
    } else {
      myCircle.value = null
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchMembers = async (cid) => {
  const { data } = await supabase.from('circle_members').select('*').eq('circle_id', cid)
  members.value = data || []
}

// ✨✨✨ 新增：更新社团隐私状态 ✨✨✨
const updateCirclePrivacy = async () => {
  if (!myCircle.value) return
  const newState = tempIsPrivate.value
  
  const { error } = await supabase
    .from('circles')
    .update({ is_private: newState })
    .eq('id', myCircle.value.id)

  if (error) {
    alert('修改失败: ' + error.message)
    tempIsPrivate.value = !newState // 回滚开关
  } else {
    // 成功提示 (可选)
    // console.log('Privacy updated')
  }
}

// 邀请码
const generateCode = async (maxUses) => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const now = new Date()
  const expiresAt = new Date(now)
  if (maxUses === 1) expiresAt.setHours(now.getHours() + 24)
  else expiresAt.setDate(now.getDate() + 7)

  const { data, error } = await supabase.from('circle_invites').insert([{
    circle_id: myCircle.value.id,
    created_by: currentUser.value.id,
    code: code,
    expires_at: expiresAt.toISOString(),
    max_uses: maxUses
  }]).select().single()

  if (error) return alert('生成失败: ' + error.message)
  activeCode.value = data
}

const handleJoinByCode = async () => {
  if (!inputCode.value || inputCode.value.length < 4) return alert('请输入正确的邀请码')
  joining.value = true
  try {
    const { data, error } = await supabase.rpc('use_invite_code', {
      input_code: inputCode.value.toUpperCase().trim(),
      input_user_id: currentUser.value.id
    })
    if (error) throw error
    if (data.success) {
      alert('🎉 加入成功！')
      inputCode.value = ''
      await fetchAllData()
    } else {
      alert('加入失败: ' + data.message)
    }
  } catch (e) {
    alert('系统错误: ' + e.message)
  } finally {
    joining.value = false
  }
}

const createCircle = async () => {
  if (!newCircleName.value) return alert('请输入名称')
  const { data: c, error } = await supabase.from('circles').insert([{ 
    name: newCircleName.value, 
    owner_id: currentUser.value.id, 
    is_private: newCirclePrivate.value 
  }]).select().single()
  
  if (error) return alert(error.message)
  
  await supabase.from('circle_members').insert([{ circle_id: c.id, user_id: currentUser.value.id, role: '主催' }])
  newCircleName.value = ''
  newCirclePrivate.value = false
  await fetchAllData()
}

const kickMember = async (mid) => { if(confirm('踢出？')) { await supabase.from('circle_members').delete().eq('id', mid); fetchMembers(myCircle.value.id) } }
const leaveCircle = async () => { if(confirm('退出？')) { await supabase.from('circle_members').delete().eq('user_id', currentUser.value.id).eq('circle_id', myCircle.value.id); myCircle.value = null; await fetchAllData() } }
const disbandCircle = async () => { if(confirm('确认解散？')) { await supabase.from('circles').delete().eq('id', myCircle.value.id); myCircle.value = null; await fetchAllData() } }
const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
const formatDate = (iso) => new Date(iso).toLocaleString()
</script>

<style scoped>
.dashboard-container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.full-screen-loading { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 999; }
.spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top: 4px solid #39C5BB; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.profile-header { background: white; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px; }
.avatar-section { display: flex; gap: 15px; align-items: center; }
.avatar { width: 50px; height: 50px; background: #39C5BB; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
.logout-btn { background: #fee; color: #e33; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }

.tabs { display: flex; gap: 15px; border-bottom: 1px solid #eee; margin-bottom: 20px; }
.tab-btn { background: none; border: none; padding: 10px; font-size: 16px; color: #888; cursor: pointer; border-bottom: 3px solid transparent; }
.tab-btn.active { color: #39C5BB; border-bottom-color: #39C5BB; font-weight: bold; }

.empty-hint { text-align: center; padding: 40px; background: #f9f9f9; border-radius: 8px; color: #888; }
.link { color: #39C5BB; font-weight: bold; text-decoration: none; }

.circle-dashboard { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
.circle-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eee; }

/* 头部状态行样式 */
.header-left { display: flex; flex-direction: column; gap: 8px; }
.status-row { display: flex; align-items: center; gap: 10px; }
.badge-mine { background: #39C5BB; color: white; font-size: 12px; padding: 2px 6px; border-radius: 4px; }
.circle-name { margin: 0; font-size: 24px; }
.danger-btn { background: white; border: 1px solid #ff7675; color: #ff7675; padding: 5px 10px; border-radius: 4px; cursor: pointer; }

/* 开关样式 */
.privacy-toggle-wrapper { display: flex; align-items: center; gap: 8px; }
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
.toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .toggle-slider { background-color: #39C5BB; }
input:checked + .toggle-slider:before { transform: translateX(16px); }
.status-text { font-size: 12px; color: #2e7d32; font-weight: bold; }
.status-text.private { color: #c62828; }
.status-readonly { font-size: 12px; color: #666; background: #eee; padding: 2px 6px; border-radius: 4px; }

/* 邀请码区域 */
.invite-section { background: #f0f9f9; padding: 20px; border-radius: 8px; border: 1px dashed #b2dfdb; margin-bottom: 25px; }
.is-header h4 { margin: 0 0 5px; color: #00695c; }
.is-header p { margin: 0 0 15px; font-size: 13px; color: #666; }
.active-code-box { text-align: center; }
.code-display { font-size: 32px; font-family: monospace; font-weight: bold; color: #333; letter-spacing: 5px; margin: 10px 0; background: white; padding: 10px; border-radius: 8px; display: inline-block; border: 2px solid #39C5BB; }
.code-meta { font-size: 12px; color: #666; display: flex; gap: 15px; justify-content: center; margin-bottom: 10px; }
.btn-close { background: none; border: underline; cursor: pointer; color: #888; border: none; font-size: 12px; }
.generate-actions { display: flex; gap: 10px; }
.btn-gen { background: #39C5BB; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; flex: 1; }
.btn-gen.sec { background: #607d8b; }

.member-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.member-item { background: #f9f9f9; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.role-tag { padding: 2px 5px; border-radius: 3px; color: white; font-size: 11px; }
.role-leader { background: #f39c12; }
.role-mem { background: #bdc3c7; }
.uid { color: #999; font-family: monospace; }
.kick-btn { border: 1px solid red; background: none; color: red; border-radius: 3px; cursor: pointer; font-size: 10px; }

.no-circle-view { max-width: 500px; margin: 30px auto; display: flex; flex-direction: column; gap: 30px; }
.join-card, .create-card { background: white; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.join-input-group { display: flex; gap: 10px; margin-top: 15px; }
input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; }

/* 创建部分的开关样式 */
.create-form-column { display: flex; flex-direction: column; gap: 15px; margin-top: 15px; }
.full-input { width: 100%; box-sizing: border-box; }
.switch-row { display: flex; justify-content: center; margin-bottom: 5px; }
.switch-label { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.switch-label input { display: none; }
.checkbox-box { width: 18px; height: 18px; border: 2px solid #ddd; border-radius: 4px; position: relative; transition: 0.2s; }
.switch-label input:checked + .checkbox-box { background: #39C5BB; border-color: #39C5BB; }
.switch-label input:checked + .checkbox-box::after { content: '✔'; color: white; font-size: 12px; position: absolute; top: -1px; left: 3px; }
.label-text { font-size: 14px; color: #666; }

.btn-join { background: #39C5BB; color: white; border: none; padding: 0 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-create { background: #333; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; width: 100%; font-weight: bold; transition: 0.2s; }
.btn-create:hover { background: #555; }
.divider { text-align: center; color: #ccc; font-size: 14px; display: flex; align-items: center; gap: 10px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #eee; }
</style>