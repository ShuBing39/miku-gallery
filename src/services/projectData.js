import { supabase } from './supabase'

// ---------------------------------------------------------
// 1. 核心查询：获取项目详情 (保留了你原本的发布者关联逻辑)
// ---------------------------------------------------------
export const getProjectDetail = async (id) => {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
  if (error) throw error
  
  if (data.uploader_id) {
    const { data: u } = await supabase.from('profiles').select('username').eq('id', data.uploader_id).single()
    data.uploader_name = u?.username || '未知'
  }
  return data
}

// 【修复补丁】别名兼容：防止组件调用 getProjectById 报错
export const getProjectById = getProjectDetail;


// ---------------------------------------------------------
// 2. 核心查询：获取项目列表 (保留了你原本的搜索和用户映射逻辑)
// ---------------------------------------------------------
export const getProjectsList = async (search = '') => {
  let query = supabase
    .from('projects')
    .select('*')
    .eq('allow_external', true)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0) return []

  // 补全发布者名称
  const userIds = [...new Set(data.map(p => p.uploader_id).filter(Boolean))]
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)
    
    const map = {}
    profiles?.forEach(p => map[p.id] = p.username)
    
    return data.map(p => ({
      ...p,
      uploader_name: map[p.uploader_id] || '未知用户'
    }))
  }

  return data
}

// 【修复补丁】新增：获取推荐/精选企划 (解决 Projects.vue 报错)
// 逻辑：获取浏览量最高的 3 个正在招募的企划
export const getPromotedProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('recruit_status', 'recruiting')
    .order('view_count', { ascending: false })
    .limit(3)
  
  if (error) {
    console.error('获取推荐企划失败:', error)
    return []
  }
  return data || []
}


// ---------------------------------------------------------
// 3. 关联数据获取 (时间轴、成员、评论、任务)
// ---------------------------------------------------------

// Helper: 自动映射用户信息
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
  let result = await _mapProfiles(tasks, 'assignee_id')
  
  // 2. 处理多人认领
  const multiTaskIds = tasks.filter(t => t.is_collaborative).map(t => t.id)
  if (multiTaskIds.length > 0) {
    const { data: claims } = await supabase.from('project_task_claims').select('*').in('task_id', multiTaskIds)
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
  
  // 补充单人负责人的 username
  result.forEach(t => {
    if (t.profiles) t.assignee = t.profiles
  })
  
  return result
}


// ---------------------------------------------------------
// 4. 写入与交互操作
// ---------------------------------------------------------

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

// 通过邀请码加入
export const joinProjectByCode = async (inviteCode, userId, userName) => {
  const { data, error } = await supabase.rpc('join_project_by_invite_code', {
    p_code: inviteCode,
    p_user_id: userId
  })

  if (error) throw error
  
  if (data.success) {
    await supabase.from('project_comments').insert({
      project_id: data.project_id,
      content: `🎉 ${userName} 通过邀请码加入了团队！`,
      type: 'system',
      user_id: userId
    })
    return data.project_id
  } else {
    throw new Error('邀请码无效或已过期')
  }
}

// 增加浏览量
export const incrementView = async (id) => {
  await supabase.rpc('increment_project_view', { row_id: id })
}