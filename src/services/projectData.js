import { supabase } from './supabase'

// ---------------------------------------------------------
// 1. 核心查询：获取项目详情
// ---------------------------------------------------------
export const getProjectDetail = async (id) => {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
  if (error) throw error
  
  if (data.user_id) {
    const { data: u } = await supabase.from('profiles').select('username').eq('id', data.user_id).single()
    data.uploader_name = u?.username || '未知'
  }
  return data
}

// 别名兼容
export const getProjectById = getProjectDetail;

// ---------------------------------------------------------
// 2. 核心查询：获取列表 (已做严格物理隔离)
// ---------------------------------------------------------

// 🎨 场景 A：企划大厅 (仅显示创作企划)
// 过滤条件：linked_item_id 必须为空 (即没有关联商品)
export const getProjectsList = async (search = '') => {
  let query = supabase
    .from('projects')
    .select('*')
    .eq('allow_external', true)
    .is('linked_item_id', null) // 🔥 关键修复：排除团购
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0) return []

  const userIds = [...new Set(data.map(p => p.user_id).filter(Boolean))]
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)
    
    const map = {}
    profiles?.forEach(p => map[p.id] = p.username)
    
    return data.map(p => ({
      ...p,
      uploader_name: map[p.user_id] || '未知用户'
    }))
  }

  return data
}

// 🎨 场景 A+：企划大厅的推荐位 (仅推荐创作企划)
export const getPromotedProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('recruit_status', 'recruiting')
    .is('linked_item_id', null) // 🔥 关键修复：排除团购
    .order('view_count', { ascending: false })
    .limit(3)
  
  if (error) {
    console.error('获取推荐企划失败:', error)
    return []
  }
  return data || []
}

// 🛍️ 场景 B：拼团大厅 (仅显示团购车队)
// 过滤条件：linked_item_id 不为空 (即关联了商品或占位符)
export const getGroupBuyList = async (search = '') => {
  let query = supabase
    .from('projects')
    .select('*')
    .not('linked_item_id', 'is', null) // 🔥 关键修复：只取团购
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) throw error
  
  // 同样补全团长名字
  if (!data || data.length === 0) return []
  const userIds = [...new Set(data.map(p => p.user_id).filter(Boolean))]
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds)
    const map = {}
    profiles?.forEach(p => map[p.id] = p.username)
    return data.map(p => ({ ...p, uploader_name: map[p.user_id] || '神秘团长' }))
  }

  return data
}

// ---------------------------------------------------------
// 3. 关联数据获取 (保持不变)
// ---------------------------------------------------------

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
  const { data } = await supabase.from('project_timeline_v2').select('*').eq('project_id', projectId).order('event_date')
  return _mapProfiles(data, 'created_by')
}

export const getProjectMembers = async (projectId) => {
  const { data } = await supabase.from('project_members').select('*').eq('project_id', projectId)
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
  const { data: tasks } = await supabase.from('project_tasks_v2').select('*').eq('project_id', projectId).order('created_at')
  if (!tasks) return []

  let result = await _mapProfiles(tasks, 'assignee_id')
  
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
  result.forEach(t => { if (t.profiles) t.assignee = t.profiles })
  return result
}

// ---------------------------------------------------------
// 4. 写入与交互操作 (新增 createProject)
// ---------------------------------------------------------

export const addTimelineNode = async (payload) => { return supabase.from('project_timeline_v2').insert(payload) }
export const addTaskNode = async (payload) => { return supabase.from('project_tasks_v2').insert(payload) }
export const updateProjectInfo = async (id, payload) => { return supabase.from('projects').update(payload).eq('id', id) }

export const logSystemAction = async (projectId, userId, content) => {
  await supabase.from('project_comments').insert({ project_id: projectId, user_id: userId, content, type: 'system' })
}

export const joinProjectByCode = async (inviteCode, userId, userName) => {
  const { data, error } = await supabase.rpc('join_project_by_invite_code', { p_code: inviteCode, p_user_id: userId })
  if (error) throw error
  if (data.success) {
    await supabase.from('project_comments').insert({ project_id: data.project_id, content: `🎉 ${userName} 通过邀请码加入了团队！`, type: 'system', user_id: userId })
    return data.project_id
  } else { throw new Error('邀请码无效或已过期') }
}

export const incrementView = async (id) => { await supabase.rpc('increment_project_view', { row_id: id }) }

// 🔥 通用创建项目 (企划 & 团购共用，但会通过 linked_item_id 区分)
export const createProject = async (payload) => {
  const { data: project, error } = await supabase.from('projects').insert(payload).select().single()
  if (error) throw error

  // 自动将创建者设为 Owner
  if (project && payload.user_id) {
    await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: payload.user_id,
      role: '主催', // 团购模式下这个Role不显示，但底层权限逻辑需要
      is_approved: true
    })
  }
  return project
}