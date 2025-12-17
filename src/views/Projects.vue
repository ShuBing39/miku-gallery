<template>
    <div class="projects-container">
      <button class="back-home-btn" @click="$router.push('/')">⬅ 返回首页</button>
  
      <div class="header-section">
        <h1 class="main-title">🤝 企划大厅</h1>
        <p class="sub-title">加入同人创作，为爱发电</p>
        
        <button class="create-project-btn" @click="$router.push('/submit-project')">
          ➕ 发起新企划
        </button>
      </div>
  
      <div class="private-access-bar">
        <input v-model="inviteCodeInput" placeholder="输入邀请码..." maxlength="6" />
        <button @click="handleManualSearch">🔍 查找企划</button>
      </div>
  
      <div class="projects-grid">
        <div v-for="item in projects" :key="item.id" class="project-card" @click="openLink(item)">
          <div class="img-wrapper">
            <img :src="item.image_url" referrerpolicy="no-referrer" @error="handleImgError" />
            <div class="status-overlay" :class="getTimeStatus(item).class">{{ getTimeStatus(item).text }}</div>
            <div v-if="item.is_private" class="private-badge">🔒 私密</div>
          </div>
          <div class="info-content">
            <h3 class="title">{{ item.name }}</h3>
            <div class="meta-row">
              <span class="author">发起: {{ item.author }}</span>
            </div>
            <div class="time-info" v-if="item.end_date">
              <div class="progress-bar"><div class="progress-fill" :style="{ width: calcProgress(item) + '%' }"></div></div>
              <div class="dates"><span>截止: {{ formatDate(item.end_date) }}</span></div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="projects.length === 0 && !loading" class="empty-state">暂无公开企划</div>
  
      </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { createClient } from '@supabase/supabase-js'
  import { useRoute, useRouter } from 'vue-router'
  
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  const route = useRoute()
  const router = useRouter()
  
  const projects = ref([])
  const loading = ref(true)
  const inviteCodeInput = ref('')
  
  onMounted(async () => {
    await fetchProjects()
    if (route.query.code) {
      inviteCodeInput.value = route.query.code
      handleManualSearch()
      router.replace('/projects')
    }
  })
  
  const fetchProjects = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('category', '同人企划')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
  
    if (data) {
      projects.value = data.filter(p => !p.is_private || (p.is_private && p.end_date && p.end_date < today))
    }
    loading.value = false
  }
  
  const handleManualSearch = async () => {
    if(!inviteCodeInput.value) return alert('请输入邀请码')
    const { data: inv } = await supabase.from('project_invites').select('project_id').eq('code', inviteCodeInput.value.toUpperCase()).single()
    if (!inv) return alert('无效的邀请码')
    
    const { data: p } = await supabase.from('items').select('*').eq('id', inv.project_id).single()
    if (p) {
      const exists = projects.value.find(x => x.id === p.id)
      if (!exists) { projects.value.unshift(p); alert(`解锁企划：${p.name}`) } 
      else alert('已在列表中')
    }
  }
  
  // 辅助函数
  const getTimeStatus = (item) => {
    if (!item.end_date) return { text: '长期', class: 'long' }
    const today = new Date().toISOString().split('T')[0]
    return today > item.end_date ? { text: '已结束', class: 'ended' } : { text: '进行中', class: 'active' }
  }
  const calcProgress = (item) => {
    if(!item.start_date || !item.end_date) return 0
    const total = new Date(item.end_date) - new Date(item.start_date)
    const pass = new Date() - new Date(item.start_date)
    return Math.min(Math.max((pass/total)*100, 0), 100)
  }
  const formatDate = (d) => d ? d.replace(/-/g, '/') : ''
  const openLink = () => {}
  const handleImgError = (e) => { e.target.src = 'https://via.placeholder.com/300x200?text=Project' }
  </script>
  
  <style scoped>
  /* 保持 Projects.vue 原有的展示样式，只是去掉了 Modal 相关的 CSS */
  .projects-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: sans-serif; position: relative; }
  .back-home-btn { position: absolute; top: 20px; left: 0; background: white; border: 1px solid #ddd; padding: 6px 12px; border-radius: 20px; cursor: pointer; color: #666; font-weight: bold; }
  
  .header-section { text-align: center; margin: 40px 0 30px 0; position: relative; }
  .main-title { color: #2c3e50; margin: 0; font-size: 2.2rem; }
  .sub-title { color: #888; margin-top: 5px; }
  
  /* 发起按钮样式 */
  .create-project-btn { background: linear-gradient(135deg, #39C5BB, #26a69a); color: white; border: none; padding: 12px 30px; border-radius: 30px; font-weight: bold; cursor: pointer; margin-top: 15px; box-shadow: 0 4px 15px rgba(57, 197, 187, 0.3); transition: 0.2s; font-size: 16px; }
  .create-project-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(57, 197, 187, 0.4); }
  
  .private-access-bar { display: flex; justify-content: center; gap: 10px; margin-bottom: 40px; }
  .private-access-bar input { padding: 10px; width: 200px; border: 2px solid #ddd; border-radius: 25px; text-align: center; font-weight: bold; outline: none; }
  .private-access-bar input:focus { border-color: #39C5BB; }
  .private-access-bar button { background: #333; color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; }
  
  /* Grid & Cards */
  .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
  .project-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer; transition: 0.3s; border: 1px solid #eee; display: flex; flex-direction: column; }
  .project-card:hover { transform: translateY(-5px); border-color: #39C5BB; }
  .img-wrapper { height: 160px; position: relative; background: #f5f5f5; }
  .img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
  .status-overlay { position: absolute; top: 10px; right: 10px; padding: 4px 10px; border-radius: 20px; color: white; font-size: 12px; font-weight: bold; }
  .status-overlay.active { background: #ff5722; }
  .status-overlay.ended { background: #9e9e9e; }
  .status-overlay.long { background: #4caf50; }
  .private-badge { position: absolute; top: 10px; left: 10px; background: #333; color: gold; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
  .info-content { padding: 15px; flex: 1; display: flex; flex-direction: column; }
  .title { margin: 0 0 10px 0; font-size: 16px; color: #333; }
  .author { font-size: 12px; color: #888; margin-bottom: 10px; }
  .time-info { margin-top: auto; }
  .progress-bar { height: 6px; background: #eee; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
  .progress-fill { height: 100%; background: #39C5BB; }
  .dates { font-size: 11px; color: #999; text-align: right; }
  .empty-state { text-align: center; padding: 50px; color: #aaa; }
  </style>