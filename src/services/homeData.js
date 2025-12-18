// src/services/homeData.js
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
    .limit(5)

  if (error) throw error
  return data || []
}

// 获取混合动态 (活动 + 企划)
export const getMixedEvents = async () => {
  // 1. 查官方活动
  const p1 = supabase
    .from('items')
    .select('*')
    .in('category', OFFICIAL_EVENT_CATEGORIES)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(5)

  // 2. 查同人企划
  const p2 = supabase
    .from('projects')
    .select('*')
    .eq('allow_external', true)
    .order('created_at', { ascending: false })
    .limit(5)

  const [res1, res2] = await Promise.all([p1, p2])
  
  let combined = []
  
  // 处理官方数据
  if (res1.data) {
    combined = res1.data.map(e => ({
      ...e,
      isProject: false,
      uniqueId: 'ev_' + e.id,
      statusClass: _getEventStatus(e).class,
      statusText: _getEventStatus(e).text
    }))
  }

  // 处理企划数据
  if (res2.data) {
    const projectsMapped = res2.data.map(p => ({
      id: p.id,
      name: p.name,
      image_url: p.image_url,
      category: '同人企划',
      created_at: p.created_at,
      isProject: true,
      uniqueId: 'pj_' + p.id,
      statusClass: p.recruit_status === 'recruiting' ? 'active' : 'ended',
      statusText: p.recruit_status === 'recruiting' ? '招募中' : (p.recruit_status === 'ongoing' ? '进行中' : '已结束')
    }))
    combined = [...combined, ...projectsMapped]
  }

  // 排序
  combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return combined.slice(0, 6)
}

// 内部辅助函数：计算状态
const _getEventStatus = (ev) => {
  const today = new Date().toISOString().split('T')[0]
  if (ev.release_date && today < ev.release_date) return { text: '即将开始', class: 'upcoming' }
  if (ev.event_end_date && today > ev.event_end_date) return { text: '已结束', class: 'ended' }
  return { text: '进行中', class: 'active' }
}