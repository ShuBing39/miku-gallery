import { supabase } from '../supabase'

// 1. 获取周边列表 (支持搜索和筛选)
export const getItems = async (filters = {}) => {
  let query = supabase.from('items').select('*').eq('status', 'approved')
  
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.search) query = query.ilike('name', `%${filters.search}%`)
  
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return []
  return data
}

// 2. ✅ 核心修复：获取周边详情 (包含官方图 + 用户返图)
// 这里的名字必须叫 getItemById，因为 ItemDetail.vue 里用的是这个名字
export const getItemById = async (id) => {
  // A. 获取基本信息
  const { data: item, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) return null

  // B. 获取官方多图
  const { data: officialImages } = await supabase
    .from('item_images')
    .select('*')
    .eq('item_id', id)

  // C. 获取用户返图 (只看审核通过的)
  const { data: userImages } = await supabase
    .from('item_user_images')
    .select('*, profiles:user_id(username, avatar_url)')
    .eq('item_id', id)
    .eq('status', 'approved')
    .order('likes_count', { ascending: false })

  // 返回组合好的数据
  return { 
    ...item, 
    images: officialImages || [], 
    user_images: userImages || [] 
  }
}

// 3. ✅ 核心修复：上传用户返图 (买家秀)
export const uploadUserImage = async (itemId, file, userId, caption) => {
  // A. 上传图片到 Storage
  const fileName = `user_uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('item-images') // 确保 Supabase Storage 有这个 bucket
    .upload(fileName, file)

  if (uploadError) throw uploadError

  // B. 获取公开链接
  const { data: { publicUrl } } = supabase.storage
    .from('item-images')
    .getPublicUrl(fileName)

  // C. 写入数据库
  const { error: dbError } = await supabase
    .from('item_user_images')
    .insert([{
      item_id: itemId,
      user_id: userId,
      image_url: publicUrl,
      caption: caption,
      status: 'pending' // 默认待审核
    }])

  if (dbError) throw dbError
  return true
}

// 4. 获取关联评论 (保留原功能)
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

// 5. 发布评论 (保留原功能)
export const postItemComment = async (itemId, userId, content) => {
  const { error } = await supabase
    .from('comments')
    .insert({ item_id: itemId, user_id: userId, content })
  
  if (error) throw error
}

// 6. 兼容旧代码别名 (防止其他地方报错)
export const getItemDetail = getItemById;