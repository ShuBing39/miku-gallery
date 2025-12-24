import { supabase } from '../supabase'

// 1. 获取活动列表 (无删减版)
export const getEvents = async () => {
  try {
    let query = supabase
      .from('events')
      .select('*')
      // ✅ 排序改为倒序：2026年的在最上面，2024年的沉底，方便查看最新情报
      .order('start_date', { ascending: false })
      // ❌ 删除过滤器：不再隐藏任何过期活动
      // .gte('end_date', ...) 

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('获取活动失败:', error.message)
    return []
  }
}

// 2. 获取单个活动详情
export const getEventById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('获取详情失败:', error.message)
    return null
  }
}

// 3. 更新活动信息
export const updateEvent = async (id, updates) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw error
  return data
}