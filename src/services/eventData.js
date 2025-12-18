import { supabase } from './supabase'
import { OFFICIAL_EVENT_CATEGORIES } from '../constants'

// 获取活动列表
export const getEvents = async (category = '全部') => {
  let query = supabase
    .from('items')
    .select('*')
    .in('category', OFFICIAL_EVENT_CATEGORIES) // 只查官方活动分类
    .eq('status', 'approved')
    .order('release_date', { ascending: false })

  if (category !== '全部') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}