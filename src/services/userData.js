import { supabase } from './supabase'

// 1. 获取“我”上传的所有返图 (含审核状态)
export const getMyImages = async (userId) => {
  const { data, error } = await supabase
    .from('item_user_images')
    .select(`
      *,
      items:item_id (name, image_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取我的图片失败:', error)
    return []
  }
  return data || []
}

// 2. 获取“我”提交的百科纠错记录
export const getMyWikiRevisions = async (userId) => {
  const { data, error } = await supabase
    .from('wiki_revisions')
    .select(`
      *,
      items:item_id (name, image_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取我的纠错失败:', error)
    return []
  }
  return data || []
}

// 3. 更新个人资料 (改昵称/头像)
export const updateProfile = async (userId, updates) => {
  const { error } = await supabase
    .from('profiles') // 假设您的用户表叫 profiles
    .update(updates)
    .eq('id', userId)
  
  if (error) throw error
  return true
}