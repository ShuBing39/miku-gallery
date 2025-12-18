import { supabase } from './supabase'

// 获取周边详情
export const getItemDetail = async (id) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// 获取关联评论
export const getItemComments = async (itemId) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(username, avatar_url)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(c => ({
    ...c,
    username: c.profiles?.username || '未知用户',
    avatar: c.profiles?.avatar_url
  }))
}

// 发布评论
export const postItemComment = async (itemId, userId, content) => {
  const { error } = await supabase
    .from('comments')
    .insert({ item_id: itemId, user_id: userId, content })
  
  if (error) throw error
}

// (可选) 获取同类推荐
export const getRelatedItems = async (category, currentId) => {
  const { data } = await supabase
    .from('items')
    .select('id, name, image_url')
    .eq('category', category)
    .neq('id', currentId)
    .eq('status', 'approved')
    .limit(4)
  
  return data || []
}