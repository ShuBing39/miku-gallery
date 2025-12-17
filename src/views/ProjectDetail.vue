<template>
  <div class="project-container">
    
    <div v-if="loading" class="loading-screen">
      <div class="spinner"></div>
      <p>正在读取企划档案...</p>
    </div>

    <template v-else-if="project">
      <div class="project-header">
        <div class="header-content">
          <button @click="$router.push('/projects')" class="back-btn">⬅ 返回大厅</button>
          <div class="title-row">
            <h1 class="project-title">{{ project.name }}</h1>
            <span class="status-badge" :class="project.status">{{ project.status === 'approved' ? '进行中' : '筹备中' }}</span>
          </div>
          <div class="meta-row">
            <span>📅 创建于 {{ formatDate(project.created_at) }}</span>
            <span>👤 发起人ID: {{ project.user_id ? project.user_id.slice(0,6) : '未知' }}</span>
            <span class="category-tag">{{ project.category }}</span>
          </div>
        </div>
        <div class="header-bg" :style="{ backgroundImage: `url(${project.image_url})` }"></div>
      </div>

      <div class="main-grid">
        
        <div class="col-left card">
          <div class="card-header">
            <h3>⏳ 进度时间轴</h3>
            <button v-if="isOwner" @click="addTimelineEvent" class="icon-btn">+</button>
          </div>
          <div class="timeline-box">
            <div v-if="timeline.length === 0" class="empty-text">暂无里程碑</div>
            <div v-else class="timeline-list">
              <div v-for="t in timeline" :key="t.id" class="timeline-item" :class="{ 'completed': t.is_completed }">
                <div class="t-date">{{ t.event_date }}</div>
                <div class="t-dot" @click="toggleTimeline(t)"></div>
                <div class="t-content">
                  <strong>{{ t.title }}</strong>
                  <p v-if="t.description">{{ t.description }}</p>
                </div>
                <button v-if="isOwner" @click="deleteTimeline(t.id)" class="del-btn-mini">×</button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-center card">
          <div class="card-header">
            <h3>✅ 任务清单</h3>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: taskProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ taskProgress }}%</span>
          </div>
          
          <div class="task-input-area" v-if="isOwner">
            <input v-model="newTaskInput" placeholder="添加新任务 (回车提交)" @keyup.enter="submitTask" />
          </div>

          <div class="task-list">
            <div v-if="tasks.length === 0" class="empty-text">暂无任务，快去规划吧！</div>
            <div v-for="task in tasks" :key="task.id" class="task-item">
              <label class="checkbox-label">
                <input type="checkbox" :checked="task.is_done" @change="toggleTask(task)" :disabled="!isOwner">
                <span class="checkmark"></span>
                <span class="task-text" :class="{ done: task.is_done }">{{ task.title }}</span>
              </label>
              <button v-if="isOwner" @click="deleteTask(task.id)" class="del-btn-mini">🗑️</button>
            </div>
          </div>
        </div>

        <div class="col-right card">
          <div class="card-header">
            <h3>💬 讨论区</h3>
          </div>
          
          <div class="chat-window" ref="chatWindow">
            <div v-if="comments.length === 0" class="empty-text">还没有人发言，坐沙发！</div>
            <div v-for="c in comments" :key="c.id" class="chat-bubble" :class="{ 'mine': c.user_id === currentUser?.id }">
              <div class="chat-meta">
                <span class="chat-user">用户 {{ c.user_id.slice(0,4) }}</span>
                <span class="chat-time">{{ formatTimeShort(c.created_at) }}</span>
              </div>
              <div class="chat-content">{{ c.content }}</div>
            </div>
          </div>

          <div class="chat-input-area">
            <input v-model="newComment" placeholder="说点什么..." @keyup.enter="sendComment" />
            <button @click="sendComment" :disabled="!newComment">发送</button>
          </div>
        </div>

      </div>
    </template>

    <div v-else class="not-found">
      <h2>404</h2>
      <p>未找到该企划信息 (ID: {{ $route.params.id }})</p>
      <button @click="$router.push('/')">返回首页</button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useRoute, useRouter } from 'vue-router'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const currentUser = ref(null)
const project = ref(null)

const timeline = ref([])
const tasks = ref([])
const comments = ref([])

const newTaskInput = ref('')
const newComment = ref('')
const chatWindow = ref(null)

const isOwner = computed(() => project.value && currentUser.value && project.value.user_id === currentUser.value.id)
const taskProgress = computed(() => {
  if (tasks.value.length === 0) return 0
  const doneCount = tasks.value.filter(t => t.is_done).length
  return Math.round((doneCount / tasks.value.length) * 100)
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
  
  const projectId = route.params.id
  if (projectId) {
    await fetchProjectData(projectId)
  } else {
    loading.value = false
  }
})

// --- 数据读取 (安全版) ---
const fetchProjectData = async (id) => {
  loading.value = true
  
  // 1. 基础查询 (不带联表，防止报错)
  const { data: proj, error } = await supabase.from('items').select('*').eq('id', id).single()
  
  if (error || !proj) {
    console.error("Fetch Project Error:", error)
    loading.value = false
    return
  }
  
  project.value = proj

  // 2. 独立加载各模块 (防止一个挂掉影响全部)
  try { await fetchTimeline(id) } catch(e) { console.error(e) }
  try { await fetchTasks(id) } catch(e) { console.error(e) }
  try { await fetchComments(id) } catch(e) { console.error(e) }
  
  loading.value = false
}

const fetchTimeline = async (pid) => {
  const { data } = await supabase.from('project_timeline').select('*').eq('project_id', pid).order('event_date', { ascending: true })
  timeline.value = data || []
}

const fetchTasks = async (pid) => {
  const { data } = await supabase.from('project_tasks').select('*').eq('project_id', pid).order('created_at', { ascending: true })
  tasks.value = data || []
}

const fetchComments = async (pid) => {
  const { data } = await supabase.from('project_comments').select('*').eq('project_id', pid).order('created_at', { ascending: true })
  comments.value = data || []
  scrollToBottom()
}

// --- 交互 ---
const submitTask = async () => {
  if (!newTaskInput.value) return
  const { error } = await supabase.from('project_tasks').insert([{ project_id: project.value.id, title: newTaskInput.value }])
  if (!error) { newTaskInput.value = ''; fetchTasks(project.value.id) } else alert(error.message)
}
const toggleTask = async (task) => {
  if (!isOwner.value) return alert('只有发起人可以修改')
  task.is_done = !task.is_done
  await supabase.from('project_tasks').update({ is_done: task.is_done }).eq('id', task.id)
}
const deleteTask = async (tid) => {
  if (!confirm('删除?')) return
  await supabase.from('project_tasks').delete().eq('id', tid)
  fetchTasks(project.value.id)
}

const addTimelineEvent = async () => {
  const title = prompt("标题:")
  if (!title) return
  const date = prompt("日期 (YYYY-MM-DD):", new Date().toISOString().split('T')[0])
  await supabase.from('project_timeline').insert([{ project_id: project.value.id, title, event_date: date }])
  fetchTimeline(project.value.id)
}
const toggleTimeline = async (t) => {
  if (!isOwner.value) return
  t.is_completed = !t.is_completed
  await supabase.from('project_timeline').update({ is_completed: t.is_completed }).eq('id', t.id)
}
const deleteTimeline = async (tid) => {
  if (confirm('删除?')) { await supabase.from('project_timeline').delete().eq('id', tid); fetchTimeline(project.value.id) }
}

const sendComment = async () => {
  if (!currentUser.value) return alert('请登录')
  if (!newComment.value) return
  const { error } = await supabase.from('project_comments').insert([{ project_id: project.value.id, user_id: currentUser.value.id, content: newComment.value }])
  if (!error) { newComment.value = ''; fetchComments(project.value.id) } else alert(error.message)
}

const scrollToBottom = () => { nextTick(() => { if (chatWindow.value) chatWindow.value.scrollTop = chatWindow.value.scrollHeight }) }
const formatDate = (iso) => iso ? iso.split('T')[0] : ''
const formatTimeShort = (iso) => { const d = new Date(iso); return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}` }
</script>

<style scoped>
.project-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; color: #333; }
.project-header { position: relative; background: #fff; padding: 30px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; }
.header-bg { position: absolute; top: 0; right: 0; width: 50%; height: 100%; background-size: cover; opacity: 0.15; pointer-events: none; }
.header-content { position: relative; z-index: 2; }
.back-btn { background: none; border: 1px solid #ccc; padding: 5px 10px; border-radius: 4px; cursor: pointer; color: #666; margin-bottom: 10px; }
.title-row { display: flex; align-items: center; gap: 15px; margin-bottom: 10px; }
.project-title { margin: 0; font-size: 28px; color: #2c3e50; }
.status-badge { padding: 4px 8px; background: #e0f2f1; color: #00695c; border-radius: 4px; font-size: 12px; font-weight: bold; }
.meta-row { display: flex; gap: 15px; font-size: 13px; color: #7f8c8d; align-items: center; }
.category-tag { background: #f3e5f5; color: #7b1fa2; padding: 2px 6px; border-radius: 3px; }

.main-grid { display: grid; grid-template-columns: 300px 1fr 300px; gap: 20px; }
@media (max-width: 900px) { .main-grid { grid-template-columns: 1fr; } }

.card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; display: flex; flex-direction: column; height: 600px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f5f5f5; padding-bottom: 10px; }
.card-header h3 { margin: 0; font-size: 16px; color: #333; border-left: 4px solid #39C5BB; padding-left: 8px; }
.icon-btn { background: #39C5BB; color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; line-height: 1; }

.timeline-box { flex: 1; overflow-y: auto; padding-right: 5px; }
.timeline-item { display: flex; gap: 10px; margin-bottom: 15px; position: relative; }
.timeline-item::before { content: ''; position: absolute; left: 84px; top: 20px; bottom: -20px; width: 2px; background: #eee; }
.timeline-item:last-child::before { display: none; }
.t-date { width: 70px; font-size: 12px; color: #999; text-align: right; padding-top: 2px; }
.t-dot { width: 10px; height: 10px; background: #ddd; border-radius: 50%; margin-top: 4px; z-index: 2; cursor: pointer; transition: 0.3s; }
.timeline-item.completed .t-dot { background: #39C5BB; box-shadow: 0 0 0 3px #e0f2f1; }
.t-content { flex: 1; background: #f9f9f9; padding: 8px; border-radius: 6px; font-size: 13px; }
.t-content strong { display: block; margin-bottom: 2px; color: #333; }
.t-content p { margin: 0; color: #666; font-size: 12px; }
.del-btn-mini { border: none; background: none; color: #ccc; cursor: pointer; font-size: 16px; padding: 0 5px; }
.del-btn-mini:hover { color: red; }

.progress-bar { width: 100px; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; margin: 0 10px; }
.progress-fill { height: 100%; background: #39C5BB; transition: 0.3s; }
.progress-text { font-size: 12px; color: #39C5BB; font-weight: bold; }
.task-input-area { margin-bottom: 15px; }
.task-input-area input { width: 100%; padding: 10px; border: 1px solid #eee; border-radius: 6px; box-sizing: border-box; }
.task-list { flex: 1; overflow-y: auto; }
.task-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f9f9f9; }
.checkbox-label { display: flex; align-items: center; cursor: pointer; position: relative; padding-left: 25px; user-select: none; }
.checkbox-label input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
.checkmark { position: absolute; top: 0; left: 0; height: 18px; width: 18px; background-color: #eee; border-radius: 4px; }
.checkbox-label:hover input ~ .checkmark { background-color: #ccc; }
.checkbox-label input:checked ~ .checkmark { background-color: #39C5BB; }
.checkmark:after { content: ""; position: absolute; display: none; }
.checkbox-label input:checked ~ .checkmark:after { display: block; }
.checkbox-label .checkmark:after { left: 6px; top: 2px; width: 4px; height: 9px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.task-text { font-size: 14px; color: #333; transition: 0.2s; }
.task-text.done { text-decoration: line-through; color: #aaa; }

.chat-window { flex: 1; overflow-y: auto; padding: 10px; background: #fdfdfd; border-radius: 6px; border: 1px solid #f5f5f5; margin-bottom: 10px; }
.chat-bubble { margin-bottom: 15px; max-width: 90%; }
.chat-bubble.mine { margin-left: auto; text-align: right; }
.chat-meta { font-size: 11px; color: #aaa; margin-bottom: 2px; }
.chat-user { font-weight: bold; color: #555; margin-right: 5px; }
.chat-content { display: inline-block; background: #f0f2f5; padding: 8px 12px; border-radius: 12px; font-size: 13px; color: #333; text-align: left; }
.chat-bubble.mine .chat-content { background: #39C5BB; color: white; border-radius: 12px 12px 0 12px; }
.chat-input-area { display: flex; gap: 5px; }
.chat-input-area input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.chat-input-area button { background: #39C5BB; color: white; border: none; padding: 0 15px; border-radius: 4px; cursor: pointer; }
.chat-input-area button:disabled { background: #ccc; }

.empty-text { text-align: center; color: #ccc; padding: 20px; font-size: 13px; }
.loading-screen, .not-found { text-align: center; padding: 50px; }
.spinner { width: 30px; height: 30px; border: 3px solid #eee; border-top-color: #39C5BB; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>