<template>
  <div class="project-detail-container">
    <div v-if="loading" class="loading-box"><div class="spinner"></div><p>读取档案中...</p></div>
    
    <div v-else-if="project" class="project-content">
      <ProjectHeader 
        :project="project" 
        :is-manager="isManager" 
        :member-count="members.length" 
        @open-console="openManagePanel"
      />

      <div class="nav-tabs">
        <button :class="{ active: currentTab === 'overview' }" @click="currentTab = 'overview'">🏠 概览</button>
        <button :class="{ active: currentTab === 'timeline' }" @click="currentTab = 'timeline'">⏳ 进度</button>
        <button :class="{ active: currentTab === 'tasks' }" @click="currentTab = 'tasks'">✅ 任务</button>
        <button :class="{ active: currentTab === 'team' }" @click="currentTab = 'team'">👥 团队</button>
        <button :class="{ active: currentTab === 'internal' }" @click="currentTab = 'internal'">🔒 内部</button>
      </div>

      <div class="tab-content-area">
        <div v-if="currentTab === 'overview'" class="tab-pane">
          <div class="desc-card"><h3>📜 企划介绍</h3><p style="white-space: pre-wrap;">{{ project.description || '暂无详细介绍' }}</p></div>
          <div class="gallery-section"><h3>🎨 展示</h3><div v-if="project.gallery_urls && project.gallery_urls.length" class="gallery-grid"><div v-for="(img, idx) in project.gallery_urls" :key="idx" class="gallery-item"><img :src="img"></div></div><div v-else class="empty-text">暂无图片</div></div>
        </div>

        <TimelineTab 
          v-if="currentTab === 'timeline'" 
          :timeline="timeline" 
          :is-manager="isManager" 
          :locked="!canView('timeline')"
          @add="addTimeline"
          @delete="deleteTimeline"
        />

        <TasksTab 
          v-if="currentTab === 'tasks'" 
          :tasks="tasks" 
          :is-manager="isManager" 
          :is-member="isMember"
          :current-user="currentUser"
          :locked="!canView('tasks')"
          @open-modal="showTaskModal = true"
          @claim="claimTask"
          @return="returnTask"
          @toggle="toggleTaskStatus"
          @delete="deleteTask"
        />

        <TeamTab 
          v-if="currentTab === 'team'" 
          :members="members" 
          :tasks="tasks"
          :is-manager="isManager"
          :current-user="currentUser"
          :locked="!canView('team')"
          @edit="openRoleModal"
          @kick="kickMember"
        />

        <div v-if="currentTab === 'internal'" class="tab-pane chat-pane">
           <div v-if="!isMember" class="lock-screen">🔒 仅限成员查看</div>
           <template v-else>
             <div class="chat-window">
               <div v-for="msg in internalComments" :key="msg.id" class="chat-msg">
                 <div class="msg-meta">{{ msg.profiles?.username }}</div>
                 <div class="msg-bubble">{{ msg.content }}</div>
               </div>
             </div>
             <div class="chat-input"><input v-model="newInternalMsg" placeholder="说点什么..." @keyup.enter="sendInternalMsg"><button @click="sendInternalMsg">发送</button></div>
           </template>
        </div>
      </div>
    </div>

    <div v-if="showManagePanel" class="modal-overlay full-screen">
      <div class="manager-console">
        <div class="console-header"><h2>🛠️ 管理控制台 (开发中...)</h2><button @click="showManagePanel = false">关闭</button></div>
        <div class="console-body">由于篇幅限制，这里建议后续单独拆分为 ProjectManager.vue</div>
      </div>
    </div>

    <div v-if="showTaskModal" class="modal-overlay">
      <div class="modal-content">
        <h3>发布任务</h3>
        <input v-model="newTask.content" class="std-input" placeholder="任务内容">
        <div class="modal-actions"><button @click="showTaskModal=false">取消</button><button @click="addTask" class="confirm">发布</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import * as api from '../services/projectData' // 引入 Service

// 引入子组件
import ProjectHeader from '../components/project/ProjectHeader.vue'
import TimelineTab from '../components/project/TimelineTab.vue'
import TasksTab from '../components/project/TasksTab.vue'
import TeamTab from '../components/project/TeamTab.vue'

const route = useRoute()
const userStore = useUserStore()
const projectId = route.params.id

// 数据
const project = ref(null)
const timeline = ref([])
const tasks = ref([])
const members = ref([])
const internalComments = ref([])
const loading = ref(true)
const currentTab = ref('overview')

// UI 状态
const showManagePanel = ref(false)
const showTaskModal = ref(false)
const newTask = ref({ content: '' })
const newInternalMsg = ref('')

const currentUser = computed(() => userStore.user)
const isManager = computed(() => currentUser.value && project.value && currentUser.value.id === project.value.uploader_id)
const isMember = computed(() => { if (!currentUser.value) return false; return members.value.some(m => m.user_id === currentUser.value.id) || isManager.value })

onMounted(async () => {
  await initData()
})

const initData = async () => {
  loading.value = true
  try {
    project.value = await api.getProjectDetail(projectId)
    if (project.value) {
      const [t, k, m, c] = await Promise.all([
        api.getProjectTimeline(projectId),
        api.getProjectTasks(projectId),
        api.getProjectMembers(projectId),
        api.getProjectComments(projectId, 'internal')
      ])
      timeline.value = t
      tasks.value = k
      members.value = m
      internalComments.value = c
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const canView = (section) => { if (isMember.value || isManager.value) return true; const setting = project.value?.visibility_settings?.[section] || 'public'; return setting === 'public' }
const openManagePanel = () => { showManagePanel.value = true }

// 业务逻辑 (调用 Service)
const addTimeline = async (payload) => {
  await api.addTimelineNode({ project_id: projectId, title: payload.title, event_date: payload.date || new Date(), created_by: currentUser.value.id })
  timeline.value = await api.getProjectTimeline(projectId)
}
const deleteTimeline = async (id) => { if(confirm('删?')) { /* call api */ timeline.value = await api.getProjectTimeline(projectId) } } // 简化演示

const addTask = async () => {
  await api.addTaskNode({ project_id: projectId, content: newTask.value.content, creator_id: currentUser.value.id })
  showTaskModal.value = false
  tasks.value = await api.getProjectTasks(projectId)
}
// ... 其他 claimTask, returnTask 等逻辑同理，调用 api.xxx 然后刷新数据 ...
</script>

<style scoped>
.project-detail-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; background: #f0f2f5; min-height: 100vh; }
.nav-tabs { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; }
.nav-tabs button { padding: 10px 20px; border: none; background: white; border-radius: 8px; font-weight: bold; color: #666; cursor: pointer; }
.nav-tabs button.active { background: #39C5BB; color: white; }
.tab-pane { background: white; border-radius: 12px; padding: 30px; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 25px; border-radius: 12px; width: 400px; }
.loading-box { text-align: center; padding: 50px; color: #999; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
.gallery-item img { width: 100%; height: 150px; object-fit: cover; border-radius: 8px; }
.std-input { width: 100%; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; }
</style>