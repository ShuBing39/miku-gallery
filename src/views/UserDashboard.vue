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
          <button v-if="isAdmin" @click="$router.push('/admin')" class="admin-btn">🎛️ 进入后台</button>
          <button @click="handleLogout" class="logout-btn">退出登录</button>
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
          (这里是你之前发的“我的投稿”列表，为了代码简洁暂时略过显示，逻辑保持不变)
          <br>
          <router-link to="/submit" class="link">去发布新作品 ➔</router-link>
        </div>
      </div>
  
      <div v-else-if="currentTab === 'circle'" class="tab-content">
        
        <div v-if="loadingCircle" class="loading-box">⏳ 读取社团数据...</div>
  
        <div v-else-if="myCircle" class="circle-dashboard">
          <div class="circle-header">
            <div>
              <span class="badge-mine">我的社团</span>
              <h2 class="circle-name">
                {{ myCircle.name }}
                <span class="visibility-tag" :class="myCircle.is_public ? 'pub' : 'pri'">
                  {{ myCircle.is_public ? '🌐 公开' : '🔒 私密' }}
                </span>
              </h2>
            </div>
            <div class="circle-actions">
              <label v-if="isOwner" class="switch-label">
                <input type="checkbox" :checked="myCircle.is_public" @change="togglePublic">
                <span class="slider"></span>
                <span class="switch-text">{{ myCircle.is_public ? '设为隐藏' : '设为公开' }}</span>
              </label>
              
              <button v-if="isOwner" @click="disbandCircle" class="danger-btn">💥 解散</button>
              <button v-else @click="leaveCircle" class="danger-btn">👋 退出</button>
            </div>
          </div>
  
          <div class="invite-bar">
            <span>🔑 内部邀请码: </span>
            <code class="code">{{ myCircle.invite_code }}</code>
            <button @click="copyCode" class="copy-small">复制</button>
            <span class="tip">凭借此码可直接加入</span>
          </div>
  
          <div class="members-area">
            <h3>👥 成员名单 ({{ members.length }})</h3>
            <div class="member-list">
              <div v-for="m in members" :key="m.id" class="member-item">
                <span class="role-tag" :class="getRoleStyle(m.role)">{{ m.role }}</span>
                <span class="uid">用户 {{ m.user_id.slice(0,4) }}...</span>
                <div v-if="isOwner && m.user_id !== currentUser.id" class="owner-tools">
                  <button @click="kickMember(m.id)" class="kick-btn">踢出</button>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <div v-else class="no-circle-explore">
          <div class="explore-hero">
            <h3>你还没有加入任何社团</h3>
            <p>社团是同好交流的小天地，你可以选择：</p>
          </div>
  
          <div class="actions-row">
            <div class="action-column">
              <div class="card-box create-box">
                <h4>👑 成立新社团</h4>
                <input v-model="newCircleName" placeholder="起个响亮的名字" />
                <div class="row">
                  <label><input type="checkbox" v-model="newCirclePublic"> 设为公开社团</label>
                  <button @click="createCircle" class="btn-main">立即成立</button>
                </div>
              </div>
              
              <div class="card-box join-box">
                <h4>🤝 邀请码加入</h4>
                <div class="row">
                  <input v-model="joinCode" placeholder="输入邀请码" />
                  <button @click="joinByCode" class="btn-sub">加入</button>
                </div>
              </div>
            </div>
  
            <div class="public-list-column">
              <h4>🌐 活跃的公开社团</h4>
              <div v-if="publicCircles.length === 0" class="empty-list">暂无公开社团</div>
              <div v-else class="circle-grid">
                <div v-for="c in publicCircles" :key="c.id" class="pub-circle-card">
                  <div class="pc-info">
                    <h5>{{ c.name }}</h5>
                    <span class="pc-meta">由 {{ c.owner_id.slice(0,4) }}... 创建</span>
                  </div>
                  <button @click="fillCode(c.invite_code)" class="btn-join-pub">获取邀请码</button>
                </div>
              </div>
            </div>
          </div>
        </div>
  
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { createClient } from '@supabase/supabase-js'
  import { useRouter } from 'vue-router'
  
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  const router = useRouter()
  
  const currentUser = ref(null)
  const currentTab = ref('works') // 'works' | 'circle'
  const loadingCircle = ref(false)
  
  // 用户信息
  const userInitial = computed(() => currentUser.value?.email?.[0].toUpperCase() || 'U')
  const isAdmin = computed(() => currentUser.value?.user_metadata?.username === 'admin' || currentUser.value?.email === '你的管理员邮箱@qq.com') // 记得填真实的
  
  // 社团数据
  const myCircle = ref(null)
  const members = ref([])
  const publicCircles = ref([])
  
  // 表单
  const newCircleName = ref('')
  const newCirclePublic = ref(true)
  const joinCode = ref('')
  
  const isOwner = computed(() => myCircle.value && currentUser.value && myCircle.value.owner_id === currentUser.value.id)
  
  onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    currentUser.value = user
    
    // 预加载社团信息
    fetchCircleData()
  })
  
  // --- 社团核心逻辑 ---
  
  const fetchCircleData = async () => {
    loadingCircle.value = true
    // 1. 查我的社团
    const { data: memberRef } = await supabase.from('circle_members').select('circle_id').eq('user_id', currentUser.value.id).single()
    
    if (memberRef) {
      const { data: circle } = await supabase.from('circles').select('*').eq('id', memberRef.circle_id).single()
      myCircle.value = circle
      fetchMembers(circle.id)
    } else {
      myCircle.value = null
      // 2. 如果没社团，查公开列表
      fetchPublicCircles()
    }
    loadingCircle.value = false
  }
  
  const fetchMembers = async (cid) => {
    const { data } = await supabase.from('circle_members').select('*').eq('circle_id', cid)
    members.value = data
  }
  
  const fetchPublicCircles = async () => {
    const { data } = await supabase.from('circles').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(10)
    publicCircles.value = data || []
  }
  
  // 创建
  const createCircle = async () => {
    if (!newCircleName.value) return alert('请输入名称')
    const { data: c, error } = await supabase.from('circles').insert([{ 
      name: newCircleName.value, 
      owner_id: currentUser.value.id,
      is_public: newCirclePublic.value
    }]).select().single()
    
    if (error) return alert(error.message)
    
    // 自动加入
    await supabase.from('circle_members').insert([{ circle_id: c.id, user_id: currentUser.value.id, role: '主催' }])
    alert('成立成功！')
    fetchCircleData()
  }
  
  // 加入
  const joinByCode = async () => {
    if (!joinCode.value) return alert('请输入邀请码')
    
    // 先找社团ID
    const { data: c } = await supabase.from('circles').select('id').eq('invite_code', joinCode.value).single()
    if (!c) return alert('邀请码无效')
    
    const { error } = await supabase.from('circle_members').insert([{ circle_id: c.id, user_id: currentUser.value.id }])
    if (error) return alert('加入失败: ' + error.message)
    
    alert('加入成功！')
    fetchCircleData()
  }
  
  // 切换公开状态
  const togglePublic = async () => {
    const newVal = !myCircle.value.is_public
    await supabase.from('circles').update({ is_public: newVal }).eq('id', myCircle.value.id)
    myCircle.value.is_public = newVal
  }
  
  // 退出/解散/踢人 (简化版)
  const leaveCircle = async () => {
    if(confirm('确定退出?')) {
      await supabase.from('circle_members').delete().eq('user_id', currentUser.value.id).eq('circle_id', myCircle.value.id)
      fetchCircleData()
    }
  }
  const disbandCircle = async () => {
    if(prompt('输入社团名确认解散') === myCircle.value.name) {
      await supabase.from('circles').delete().eq('id', myCircle.value.id)
      fetchCircleData()
    }
  }
  const kickMember = async (mid) => {
    if(confirm('踢出?')) {
      await supabase.from('circle_members').delete().eq('id', mid)
      fetchMembers(myCircle.value.id)
    }
  }
  
  // 辅助
  const copyCode = () => { navigator.clipboard.writeText(myCircle.value.invite_code); alert('已复制') }
  const fillCode = (code) => { joinCode.value = code; alert('邀请码已填入左侧，点击“加入”即可！') }
  const getRoleStyle = (r) => r === '主催' ? 'role-leader' : 'role-mem'
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  </script>
  
  <style scoped>
  .dashboard-container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
  
  /* 头部卡片 */
  .profile-header { background: white; padding: 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 30px; }
  .avatar-section { display: flex; gap: 20px; align-items: center; }
  .avatar { width: 80px; height: 80px; background: #39C5BB; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; }
  .info h2 { margin: 0 0 5px 0; color: #333; }
  .email { margin: 0 0 10px 0; color: #999; }
  .role-badge { background: #ff9800; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  .role-badge.member { background: #e0f2f1; color: #00695c; }
  .header-actions button { margin-left: 10px; padding: 8px 15px; border-radius: 6px; cursor: pointer; border: none; }
  .admin-btn { background: #333; color: white; }
  .logout-btn { background: #ffebee; color: #c62828; }
  
  /* 标签页 */
  .tabs { display: flex; border-bottom: 2px solid #eee; margin-bottom: 20px; }
  .tab-btn { padding: 10px 20px; background: none; border: none; font-size: 16px; color: #999; cursor: pointer; border-bottom: 3px solid transparent; transition: 0.3s; }
  .tab-btn.active { color: #39C5BB; border-bottom-color: #39C5BB; font-weight: bold; }
  
  /* 社团内容区 */
  .loading-box { text-align: center; padding: 40px; color: #999; }
  
  /* A. 看板模式 */
  .circle-dashboard { background: white; border-radius: 12px; padding: 25px; border: 1px solid #eee; }
  .circle-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 15px; }
  .badge-mine { background: #39C5BB; color: white; font-size: 10px; padding: 2px 5px; border-radius: 3px; }
  .circle-name { margin: 5px 0 0 0; display: flex; align-items: center; gap: 10px; }
  .visibility-tag { font-size: 12px; padding: 2px 6px; border-radius: 4px; border: 1px solid #eee; font-weight: normal; }
  .visibility-tag.pub { background: #e3f2fd; color: #1565c0; }
  .visibility-tag.pri { background: #fff3e0; color: #ef6c00; }
  
  .circle-actions { display: flex; gap: 10px; align-items: center; }
  .switch-label { display: flex; align-items: center; cursor: pointer; font-size: 12px; color: #666; gap: 5px; }
  .danger-btn { background: #fff; border: 1px solid #ff4d4f; color: #ff4d4f; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  
  .invite-bar { background: #fafafa; padding: 10px; border-radius: 6px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #555; margin-bottom: 20px; }
  .code { background: #eee; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; }
  .copy-small { border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 4px; font-size: 10px; padding: 2px 5px; }
  .tip { color: #aaa; font-size: 11px; margin-left: auto; }
  
  .member-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
  .member-item { background: #f9f9f9; padding: 10px; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .role-tag { font-size: 10px; padding: 1px 4px; border-radius: 3px; color: white; }
  .role-leader { background: #f44336; }
  .role-mem { background: #999; }
  .owner-tools { margin-left: auto; }
  .kick-btn { font-size: 10px; color: red; background: none; border: 1px solid red; border-radius: 3px; cursor: pointer; }
  
  /* B. 探索模式 */
  .no-circle-explore { background: #f0f9f9; padding: 20px; border-radius: 12px; }
  .explore-hero { text-align: center; margin-bottom: 20px; }
  .explore-hero h3 { margin: 0; color: #00695c; }
  
  .actions-row { display: flex; gap: 20px; flex-wrap: wrap; }
  .action-column { flex: 1; min-width: 250px; display: flex; flex-direction: column; gap: 15px; }
  .public-list-column { flex: 1; min-width: 250px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e0f2f1; }
  
  .card-box { background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
  .card-box h4 { margin: 0 0 10px 0; color: #333; }
  .card-box input { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #eee; border-radius: 4px; margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; align-items: center; }
  .btn-main { background: #39C5BB; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
  .btn-sub { background: #ff9800; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
  
  .empty-list { color: #999; font-style: italic; text-align: center; padding: 20px; }
  .circle-grid { display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto; }
  .pub-circle-card { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px; }
  .pc-info h5 { margin: 0; font-size: 14px; }
  .pc-meta { font-size: 11px; color: #999; }
  .btn-join-pub { font-size: 11px; color: #39C5BB; background: none; border: 1px solid #39C5BB; padding: 2px 6px; border-radius: 4px; cursor: pointer; }
  .btn-join-pub:hover { background: #39C5BB; color: white; }
  </style>