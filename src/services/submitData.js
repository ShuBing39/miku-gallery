import { supabase } from './supabase'

// 提交周边/作品
export const submitWork = async (payload) => {
  // payload 包含: name, category, author, price, release_date, image_url, description, user_id
  const { error } = await supabase
    .from('items')
    .insert([{
      ...payload,
      status: 'pending' // 默认待审核
    }])
  
  if (error) throw error
}

// 发布企划
export const submitProject = async (payload) => {
  // payload 包含: name, type, start_date, end_date, description, image_url, uploader_id, allow_external ...
  const { error } = await supabase
    .from('projects')
    .insert([{
      ...payload,
      recruit_status: 'recruiting' // 默认招募中
    }])
  
  if (error) throw error
}