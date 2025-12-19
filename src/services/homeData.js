import { supabase } from './supabase'
import { OFFICIAL_EVENT_CATEGORIES } from '../constants'

// 获取轮播图
export const getBanners = async () => {
  const { data, error } = await supabase
    .from('home_banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: false })
  
  if (error) throw error
  return data || []
}

// 获取最新周边 (排除活动/企划)
export const getLatestGoods = async () => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .not('category', 'in', `(${OFFICIAL_EVENT_CATEGORIES.map(c=>`"${c}"`).join(',')}, "同人企划", "企划")`)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(6) // 稍微多取一点

  if (error) throw error
  return data || []
}

// 🔥 新增：只获取官方活动 (不含企划)
export const getOfficialEvents = async () => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .in('category', OFFICIAL_EVENT_CATEGORIES)
    .eq('status', 'approved')
    .order('release_date', { ascending: false }) // 按活动时间排序
    .limit(6)

  if (error) throw error
  
  return data.map(e => ({
    ...e,
    isProject: false,
    statusClass: _getEventStatus(e).class,
    statusText: _getEventStatus(e).text
  }))
}

// 内部辅助函数
const _getEventStatus = (ev) => {
  const today = new Date().toISOString().split('T')[0]
  if (ev.release_date && today < ev.release_date) return { text: '即将开始', class: 'upcoming' }
  if (ev.event_end_date && today > ev.event_end_date) return { text: '已结束', class: 'ended' }
  return { text: '进行中', class: 'active' }
}