<template>
  <div class="projects-hall">
    <div class="hall-header">
      <h1>🤝 企划大厅</h1>
      <p>加入同人创作，为爱发电</p>
      
      <div class="actions">
        <div class="search-bar">
          <input v-model="searchText" placeholder="搜索企划..." @keyup.enter="fetchProjects" />
          <button @click="fetchProjects">🔍</button>
        </div>
        
        <div class="join-code-bar">
          <input v-model="inviteCode" placeholder="输入企划邀请码" maxlength="8" />
          <button @click="handleJoinProjectByCode">加入</button>
        </div>

        <button class="btn-create" @click="handleCreateClick">+ 发起新企划</button>
      </div>
    </div>

    <div v-if="loading" class="loading-box">
      <div class="spinner"></div>
      <p>正在加载企划...</p>
    </div>

    <div v-else-if="projects.length > 0" class="projects-grid">
      <div 
        v-for="p in projects" 
        :key="p.id" 
        class="project-card" 
        @click="goToDetail(p.id)"
      >
        <div class="card-cover" :style="p.image_url ? { backgroundImage: `url(${p.image_url})` } : { backgroundColor: '#ddd' }">
          <span class="status-tag" :class="p.recruit_status">
            {{ getStatusText(p.recruit_status) }}
          </span>
          <div class="view-count-badge">
            🔥 {{ p.view_count || 0 }}
          </div>
        </div>
        
        <div class="card-body">
          <div class="card-tags">
            <span class="type-tag">{{ p.project_type || '综合' }}</span>
          </div>
          <h3 class="card-title">{{ p.name }}</h3>
          <p class="card-desc">{{ p.description ? p.description.slice(0, 40) + '...' : '暂无描述' }}</p>
          
          <div class="card-footer">
            <span class="author">
              👤 {{ p.uploader_name || '未知' }}
            </span>
            <span class="time">{{ formatDate(p.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>🍃 暂时没有符合条件的企划</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()
const projects = ref([])
const loading = ref(true)
const searchText = ref('')
const inviteCode = ref('') 

onMounted(() => {
  fetchProjects()
})

const handleCreateClick = () => {
  router.push('/submit-project')
}

const handleJoinProjectByCode = async () => {
  if (!inviteCode.value) return alert('请输入邀请码')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return router.push('/login')

  const { data, error } = await supabase.rpc('join_project_by_invite_code', {
    p_code: inviteCode.value.trim(),
    p_user_id: user.id
  })

  if (error) {
    alert('加入失败：' + error.message)
  } else if (data.success) {
    // 🔥 新增：加入成功后，插入一条系统通知
    const userName = user.user_metadata.username || '新成员'
    await supabase.from('project_comments').insert({
      project_id: data.project_id,
      content: `🎉 ${userName} 通过邀请码加入了团队！`,
      type: 'system',
      user_id: user.id
    })

    alert('成功加入企划！')
    router.push(`/project/${data.project_id}`)
  } else {
    alert('邀请码无效或已过期')
  }
}

// 手动分步获取数据，避开 201/400 错误
const fetchProjects = async () => {
  loading.value = true
  projects.value = []

  try {
    let query = supabase
      .from('projects')
      .select('*')
      .eq('allow_external', true) 
      .order('created_at', { ascending: false })

    if (searchText.value) {
      query = query.ilike('name', `%${searchText.value}%`)
    }

    const { data: projectList, error: projError } = await query
    if (projError) throw projError

    if (!projectList || projectList.length === 0) {
      loading.value = false
      return
    }

    const userIds = [...new Set(projectList.map(p => p.uploader_id).filter(Boolean))]

    let profilesMap = {}
    if (userIds.length > 0) {
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)
      
      if (!profError && profiles) {
        profiles.forEach(p => {
          profilesMap[p.id] = p.username
        })
      }
    }

    projects.value = projectList.map(p => ({
      ...p,
      uploader_name: profilesMap[p.uploader_id] || '未知用户'
    }))

  } catch (err) {
    console.error('加载企划失败:', err)
  } finally {
    loading.value = false
  }
}

const goToDetail = async (id) => {
  await supabase.rpc('increment_project_view', { row_id: id })
  router.push(`/project/${id}`)
}

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}-${d.getDate()}`
}

const getStatusText = (s) => {
  if (s === 'recruiting') return '招募中'
  if (s === 'ongoing') return '进行中'
  return '已结束'
}
</script>

<style scoped>
/* 样式保持不变 */
.projects-hall { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
.hall-header { text-align: center; margin-bottom: 40px; padding: 40px 0; background: linear-gradient(to right, #e0f7fa, #f3e5f5); border-radius: 16px; }
.hall-header h1 { margin: 0 0 10px; color: #333; font-size: 32px; }
.hall-header p { color: #666; margin-bottom: 25px; }
.actions { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
.search-bar { display: flex; background: white; padding: 5px; border-radius: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.search-bar input { border: none; padding: 10px 15px; outline: none; width: 200px; font-size: 14px; }
.search-bar button { border: none; background: none; cursor: pointer; padding: 0 15px; font-size: 18px; }
.join-code-bar { display: flex; background: white; padding: 5px; border-radius: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e0f7fa; }
.join-code-bar input { border: none; padding: 10px 15px; outline: none; width: 120px; font-size: 14px; }
.join-code-bar button { background: #ff9800; color: white; border: none; border-radius: 20px; padding: 0 15px; font-weight: bold; cursor: pointer; }
.btn-create { background: #39C5BB; color: white; border: none; padding: 10px 25px; border-radius: 30px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); transition: 0.2s; }
.btn-create:hover { transform: translateY(-2px); }
.loading-box { text-align: center; padding: 50px; color: #999; }
.spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #39C5BB; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
.project-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer; transition: 0.3s; border: 1px solid #f0f0f0; }
.project-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
.card-cover { height: 160px; background-size: cover; background-position: center; position: relative; }
.status-tag { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.status-tag.recruiting { background: #39C5BB; }
.status-tag.ended { background: #999; }
.view-count-badge { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; gap: 4px; }
.card-body { padding: 15px; }
.card-tags { margin-bottom: 8px; }
.type-tag { font-size: 11px; background: #f3e5f5; color: #8e24aa; padding: 2px 6px; border-radius: 3px; }
.card-title { margin: 0 0 8px; font-size: 18px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-desc { font-size: 13px; color: #888; margin: 0 0 15px; height: 38px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.card-footer { display: flex; justify-content: space-between; font-size: 12px; color: #aaa; border-top: 1px solid #f5f5f5; padding-top: 10px; }
.empty-state { text-align: center; padding: 50px; color: #999; }
</style>