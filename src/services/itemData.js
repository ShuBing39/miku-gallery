import { supabase } from '../supabase'

// 获取周边详情 (现在会读取中文名、人民币价、描述等新字段)
export const getItemDetail = async (id) => {
  const { data, error } = await supabase
    .from('items')
    .select(`
      *,
      item_images (image_url)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// 🔥 新增：更新商品信息 (用于百科编辑)
export const updateItem = async (id, updates) => {
  const { error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
  
  if (error) throw error
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

// 获取同类推荐 (可选)
export const getRelatedItems = async (category, currentId) => {
  const { data } = await supabase
    .from('items')
    .select('id, name, name_cn, image_url, price_cny')
    .eq('category', category)
    .neq('id', currentId) // 排除自己
    .eq('status', 'approved')
    .limit(4)
  
  return data || []
}