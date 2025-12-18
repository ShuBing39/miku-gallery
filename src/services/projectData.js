import { supabase } from './supabase'

// 获取项目详情 (带发布者名)
export const getProjectDetail = async (id) => {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
  if (error) throw error
  
  if (data.uploader_id) {
    const { data: u } = await supabase.from('profiles').select('username').eq('id', data.uploader_id).single()
    data.uploader_name = u?.username || '未知'
  }
  return data
}

// 获取关联数据 (时间轴、任务、成员、评论)
// helper: 自动映射用户信息
const _mapProfiles = async (items, idField) => {
  if (!items || items.length === 0) return []
  const ids = [...new Set(items.map(i => i[idField]).filter(Boolean))]
  if (ids.length === 0) return items
  
  const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ids)
  const userMap = {}
  profiles?.forEach(p => userMap[p.id] = p)
  
  return items.map(item => ({
    ...item,
    profiles: userMap[item[idField]] || { username: '未知' }
  }))
}

export const getProjectTimeline = async (projectId) => {
  const { data } = await supabase.from('project_timeline_v2')
    .select('*').eq('project_id', projectId).order('event_date')
  return _mapProfiles(data, 'created_by')
}

export const getProjectMembers = async (projectId) => {
  const { data } = await supabase.from('project_members')
    .select('*').eq('project_id', projectId)
  return _mapProfiles(data, 'user_id')
}

export const getProjectComments = async (projectId, type) => {
  let query = supabase.from('project_comments').select('*').eq('project_id', projectId).order('created_at')
  if (type === 'internal') query = query.in('type', ['internal', 'system'])
  else query = query.eq('type', type)
  
  const { data } = await query
  return _mapProfiles(data, 'user_id')
}

export const getProjectTasks = async (projectId) => {
  const { data: tasks } = await supabase.from('project_tasks_v2')
    .select('*').eq('project_id', projectId).order('created_at')
  if (!tasks) return []

  // 1. 映射负责人(单人)
  let result = await _mapProfiles(tasks, 'assignee_id', 'assignee') // 注意这里mapProfiles需要微调支持targetField，或者我们在组件里处理
  // 为了简单，我们复用上面的 _mapProfiles 逻辑，它默认映射到 profiles 字段。
  // 我们手动处理一下单人负责人显示逻辑
  
  // 2. 处理多人认领
  const multiTaskIds = tasks.filter(t => t.is_collaborative).map(t => t.id)
  if (multiTaskIds.length > 0) {
    const { data: claims } = await supabase.from('project_task_claims').select('*').in('task_id', multiTaskIds)
    // 获取 claim 用户的 profile
    const claimUserIds = [...new Set(claims?.map(c => c.user_id) || [])]
    if (claimUserIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', claimUserIds)
      const userMap = {}
      profiles?.forEach(p => userMap[p.id] = p)
      
      result = result.map(t => {
        if (t.is_collaborative) {
          const myClaims = claims.filter(c => c.task_id === t.id)
          t.claimants = myClaims.map(c => userMap[c.user_id]).filter(Boolean)
        }
        return t
      })
    }
  }
  
  // 补充单人负责人的 username (因为 _mapProfiles 把他放到了 profiles 字段)
  result.forEach(t => {
    if (t.profiles) t.assignee = t.profiles
  })
  
  return result
}

// 写入操作
export const addTimelineNode = async (payload) => {
  return supabase.from('project_timeline_v2').insert(payload)
}

export const addTaskNode = async (payload) => {
  return supabase.from('project_tasks_v2').insert(payload)
}

export const updateProjectInfo = async (id, payload) => {
  return supabase.from('projects').update(payload).eq('id', id)
}

// 系统日志
export const logSystemAction = async (projectId, userId, content) => {
  await supabase.from('project_comments').insert({
    project_id: projectId,
    user_id: userId,
    content,
    type: 'system'
  })
}