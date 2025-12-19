import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '../services/projectData'
import { useUserStore } from './userStore'

export const useProjectStore = defineStore('project', () => {
  const userStore = useUserStore()
  
  // --- State (数据状态) ---
  const project = ref(null)
  const members = ref([])
  const tasks = ref([])
  const timeline = ref([])
  const internalComments = ref([])
  const publicComments = ref([])
  const loading = ref(false)

  // --- Getters (计算属性/权限) ---
  
  // 当前用户在团队中的角色 (没加入则是 undefined)
  const myRole = computed(() => {
    if (!userStore.user) return null
    const member = members.value.find(m => m.user_id === userStore.user.id)
    return member ? member.role : null
  })

  // 是否是团队成员
  const isMember = computed(() => !!myRole.value)

  // 是否有管理权限 (主催 或 管理员)
  const isManager = computed(() => ['主催', '管理员'].includes(myRole.value))

  // 是否是主催 (最高权限，如转让、删除)
  const isOwner = computed(() => myRole.value === '主催')

  // --- Actions (业务逻辑) ---

  // 初始化加载所有数据
  const initProject = async (projectId) => {
    loading.value = true
    try {
      // 并行加载基础信息
      const [pData, mData, tData, tlData] = await Promise.all([
        api.getProjectDetail(projectId),
        api.getProjectMembers(projectId),
        api.getProjectTasks(projectId),
        api.getProjectTimeline(projectId)
      ])
      
      project.value = pData
      members.value = mData
      tasks.value = tData
      timeline.value = tlData

      // 加载留言 (根据权限决定加载哪些)
      await refreshComments()
      
    } catch (e) {
      console.error("加载企划失败:", e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 刷新评论区
  const refreshComments = async () => {
    if (!project.value) return
    
    // 游客板总是加载
    if (project.value.guest_board_enabled) {
      publicComments.value = await api.getProjectComments(project.value.id, 'public')
    }

    // 内部板只有成员加载
    if (isMember.value) {
      const internal = await api.getProjectComments(project.value.id, 'internal')
      const system = await api.getProjectComments(project.value.id, 'system')
      // 合并并按时间排序
      internalComments.value = [...internal, ...system].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }
  }

  // 刷新单一模块 (用于操作后的局部更新)
  const refreshTasksData = async () => { tasks.value = await api.getProjectTasks(project.value.id) }
  const refreshMembersData = async () => { members.value = await api.getProjectMembers(project.value.id) }
  const refreshTimelineData = async () => { timeline.value = await api.getProjectTimeline(project.value.id) }

  return {
    project, members, tasks, timeline, internalComments, publicComments, loading,
    myRole, isMember, isManager, isOwner,
    initProject, refreshComments, refreshTasksData, refreshMembersData, refreshTimelineData
  }
})