import { supabase } from './supabase'

// 提交周边/作品
export const submitWork = async (payload) => {
  const { error } = await supabase
    .from('items')
    .insert([{ ...payload, status: 'pending' }])
  
  if (error) throw error
}

// 发布企划 (核心修复：显式添加成员)
export const submitProject = async (payload) => {
  console.log('正在创建企划...', payload)

  // 1. 插入企划并立即获取返回数据 (select().single())
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert([{ 
      ...payload, 
      recruit_status: 'recruiting' 
    }])
    .select() // 必须加上这个才能拿到新生成的 ID
    .single()
  
  if (projectError) throw projectError
  if (!project) throw new Error('企划创建失败，未返回数据')

  console.log('企划创建成功，ID:', project.id)

  // 2. 【关键修复】显式将创建者加入成员表
  // 不再依赖数据库触发器，前端直接写入，确保万无一失
  const { error: memberError } = await supabase
    .from('project_members')
    .insert([{
      project_id: project.id,
      user_id: payload.uploader_id,
      role: '主催',
      is_approved: true // 默认已通过
    }])

  if (memberError) {
    console.error('⚠️ 警告：企划创建成功，但自动加入团队失败。', memberError)
    // 这里不抛出错误，因为企划已经创建了。
    // 如果失败（例如RLS权限问题），用户可以在详情页通过我们之前加的“一键修复”按钮来补救。
  } else {
    console.log('已成功将创建者添加为主催')
  }
  
  return project
}