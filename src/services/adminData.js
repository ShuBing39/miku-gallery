import { supabase } from './supabase'
import { OFFICIAL_EVENT_CATEGORIES } from '../constants'

// 辅助函数：在数据库层面排除活动和企划
const applyCategoryFilters = (query) => {
  if (OFFICIAL_EVENT_CATEGORIES && OFFICIAL_EVENT_CATEGORIES.length > 0) {
    query = query.not('category', 'in', `(${OFFICIAL_EVENT_CATEGORIES.map(c => `"${c}"`).join(',')})`)
  }
  query = query.neq('category', '同人企划')
  return query
}

// --- 1. 周边审核 ---
export const getPendingItems = async () => {
  let query = supabase.from('items')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)
  
  query = applyCategoryFilters(query)

  const { data, error } = await query
  if (error) {
    console.error('获取待审失败:', error)
    return []
  }
  return data || []
}

export const getItems = async (page = 0, pageSize = 50, search = '') => {
  let query = supabase.from('items')
    .select('*')
    .order('id', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  
  if (search) query = query.ilike('name', `%${search}%`)
  query = applyCategoryFilters(query)
  
  const { data, error } = await query
  if (error) return []
  return data || []
}

// 新增：更新 Item (用于活动/周边信息的后台修改)
export const updateItem = async (id, updates) => {
  const { error } = await supabase.from('items').update(updates).eq('id', id)
  if (error) throw error
}

// --- 2. 企划管理 ---
export const getPendingProjects = async () => {
  const { data, error } = await supabase.from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

export const updateProjectInfo = async (id, updates) => {
  const { error } = await supabase.from('projects').update(updates).eq('id', id)
  if (error) throw error
}

// --- 3. 活动列表 ---
export const getEvents = async (search = '') => {
  let query = supabase.from('items')
    .select('*')
    .in('category', OFFICIAL_EVENT_CATEGORIES)
    .order('release_date', { ascending: false })
    .limit(50)
  
  if (search) query = query.ilike('name', `%${search}%`)
  const { data } = await query
  return data || []
}

// --- 4. 票务/资质 ---
export const getPendingVerifications = async () => {
  const { data } = await supabase.from('buyer_verifications').select('*').eq('status', 'pending').order('created_at')
  return data || []
}

export const getPendingTickets = async () => {
  const { data } = await supabase.from('tickets').select('*').eq('status', 'pending').order('created_at')
  return data || []
}

// --- 5. 通用操作 ---
export const auditRecord = async (table, id, status) => {
  const { error } = await supabase.from(table).update({ status }).eq('id', id)
  if (error) throw error
}

export const deleteRecord = async (table, id) => {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// --- 6. 邀请码 ---
export const getInviteCodes = async () => {
  const { data, error } = await supabase.from('invite_codes').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data.map(c => ({
    ...c,
    remaining: (c.max_uses || 1) - (c.used_count || 0)
  }))
}

export const createInviteCode = async (maxUses = 1) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  const { error } = await supabase.from('invite_codes').insert([{ code, max_uses: maxUses }])
  if (error) throw error
}

// --- 7. 轮播图 & 百科种子 ---
export const getBanners = async () => {
  const { data } = await supabase.from('home_banners').select('*').order('sort_order', { ascending: false })
  return data || []
}

export const createBanner = async (bannerData) => {
  const { error } = await supabase.from('home_banners').insert(bannerData)
  if (error) throw error
}

export const getWikiSeeds = async () => {
  let query = supabase.from('items')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20)
  query = applyCategoryFilters(query)
  const { data } = await query
  return data || []
}