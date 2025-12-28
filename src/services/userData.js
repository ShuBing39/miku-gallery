import { supabase } from './supabase'

// 1. 获取“我”上传的所有返图
// 功能：查询 user_images 表，并手动关联 items 表获取周边详情
export const getMyImages = async (userId) => {
  try {
    // 第一步：查询图片记录
    // ✅ [统一修改] 数据库字段已标准化为 user_id
    const { data: images, error } = await supabase
      .from('user_images') 
      .select('*')
      .eq('user_id', userId) 
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('获取图片列表失败:', error.message)
      return []
    }

    if (!images || images.length === 0) return []

    // 第二步：收集所有关联的 item_id (去重)
    const itemIds = [...new Set(images.map(img => img.item_id).filter(id => id))]
    
    // 如果没有任何关联周边，直接返回图片数据
    if (itemIds.length === 0) return images

    // 第三步：去 items 表查询周边详情 (手动联表，避开外键报错)
    const { data: items } = await supabase
      .from('items')
      .select('id, name, image_url')
      .in('id', itemIds)

    // 第四步：数据组装
    // 创建查找表 { item_id: itemData }
    const itemMap = {}
    if (items) {
      items.forEach(item => { itemMap[item.id] = item })
    }

    // 将 item 信息拼接到 image 对象中
    return images.map(img => ({
      ...img,
      items: itemMap[img.item_id] || null // 即使找不到周边也不报错，只显示 null
    }))

  } catch (err) {
    console.error('getMyImages Exception:', err)
    return []
  }
}

// 2. 获取“我”提交的百科纠错记录
// 功能：查询 wiki_revisions 表，并手动关联 items 表
export const getMyWikiRevisions = async (userId) => {
  try {
    // 第一步：查询纠错记录
    // ✅ [统一修改] 数据库字段已标准化为 user_id
    const { data: revisions, error } = await supabase
      .from('wiki_revisions')
      .select('*')
      .eq('user_id', userId) 
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('获取纠错记录失败:', error.message)
      return []
    }

    if (!revisions || revisions.length === 0) return []

    // 第二步：收集关联的 item_id
    const itemIds = [...new Set(revisions.map(rev => rev.item_id).filter(id => id))]
    
    if (itemIds.length === 0) return revisions

    // 第三步：查询 items 详情
    const { data: items } = await supabase
      .from('items')
      .select('id, name, image_url')
      .in('id', itemIds)

    // 第四步：数据组装
    const itemMap = {}
    if (items) {
      items.forEach(item => { itemMap[item.id] = item })
    }

    return revisions.map(rev => ({
      ...rev,
      items: itemMap[rev.item_id] || null
    }))

  } catch (e) {
    console.error('WikiRevisions Exception:', e)
    return []
  }
}

// 3. 更新个人资料
// 功能：更新 profiles 表，使用 upsert 兼容新用户
export const updateProfile = async (userId, updates) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({ 
      id: userId, 
      ...updates,
      updated_at: new Date()
    })
  
  if (error) throw error
  return true
}