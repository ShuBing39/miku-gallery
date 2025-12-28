import { supabase } from './supabase'

// 提交周边/作品
export const submitWork = async (payload) => {
  // payload 里通常已经包含 user_id (由 SubmitWork.vue 传入)
  const { error } = await supabase
    .from('items')
    .insert([{ ...payload, status: 'pending' }])
  
  if (error) throw error
}

// 发布企划
export const submitProject = async (payload) => {
  console.log('正在创建企划...', payload)

  // 1. 构造标准化的 payload
  // 确保使用 user_id，移除过时的 uploader_id
  const projectData = {
    ...payload,
    user_id: payload.user_id || payload.uploader_id, 
    recruit_status: 'recruiting'
  }
  // 清理旧字段，防止数据库报错
  delete projectData.uploader_id 

  // 2. 插入企划
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert([projectData])
    .select()
    .single()
  
  if (projectError) throw projectError
  if (!project) throw new Error('企划创建失败，未返回数据')

  console.log('企划创建成功，ID:', project.id)

  // 3. 将创建者加入成员表 (统一使用 user_id)
  const { error: memberError } = await supabase
    .from('project_members')
    .insert([{
      project_id: project.id,
      user_id: projectData.user_id, // ✅ 标准化
      role: '主催',
      is_approved: true
    }])

  if (memberError) {
    console.error('⚠️ 警告：企划创建成功，但自动加入团队失败。', memberError)
  }
  
  return project
}