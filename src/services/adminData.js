import { supabase } from './supabase'
import { OFFICIAL_EVENT_CATEGORIES } from '../constants'

// --- 1. 周边审核 ---
export const getPendingItems = async () => {
  const { data, error } = await supabase.from('items')
    .select('*')
    .eq('status', 'pending')
    .not('category', 'in', `(${OFFICIAL_EVENT_CATEGORIES.map(c=>`"${c}"`).join(',')})`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const getItems = async (page = 0, pageSize = 20, search = '') => {
  let query = supabase.from('items')
    .select('*')
    .not('category', 'in', `(${OFFICIAL_EVENT_CATEGORIES.map(c=>`"${c}"`).join(',')})`)
    .order('id', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)
  
  if (search) query = query.ilike('name', `%${search}%`)
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// --- 2. 活动/企划审核 ---
export const getPendingProjects = async () => {
  const { data, error } = await supabase.from('items')
    .select('*')
    .eq('category', '同人企划')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const getEvents = async (search = '') => {
  let query = supabase.from('items')
    .select('*')
    .in('category', OFFICIAL_EVENT_CATEGORIES)
    .order('release_date', { ascending: false })
    .limit(100)
  
  if (search) query = query.ilike('name', `%${search}%`)
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// --- 3. 票务/资质审核 ---
export const getPendingVerifications = async () => {
  const { data, error } = await supabase.from('buyer_verifications')
    .select('*').eq('status', 'pending').order('created_at')
  if (error) throw error
  return data || []
}

export const getPendingTickets = async () => {
  const { data, error } = await supabase.from('tickets')
    .select('*').eq('status', 'pending').order('created_at')
  if (error) throw error
  return data || []
}

// --- 4. 通用操作 ---
export const auditRecord = async (table, id, status) => {
  const { error } = await supabase.from(table).update({ status }).eq('id', id)
  if (error) throw error
}

export const deleteRecord = async (table, id) => {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// --- 5. 邀请码 ---
export const getInviteCodes = async (unusedOnly = false) => {
  let query = supabase.from('invite_codes').select('*').order('created_at', { ascending: false })
  if (unusedOnly) query = query.eq('is_used', false)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const createInviteCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  const { error } = await supabase.from('invite_codes').insert([{ code, is_used: false }])
  if (error) throw error
}

// --- 6. 轮播图 ---
export const getBanners = async () => {
  const { data, error } = await supabase.from('home_banners')
    .select('*').order('sort_order', { ascending: false })
  if (error) throw error
  return data || []
}

export const createBanner = async (bannerData) => {
  const { error } = await supabase.from('home_banners').insert(bannerData)
  if (error) throw error
}

// --- 7. 百科种子 ---
export const getWikiSeeds = async () => {
  const { data, error } = await supabase.from('items')
    .select('*')
    .eq('status', 'approved')
    .not('category', 'in', `(${OFFICIAL_EVENT_CATEGORIES.map(c=>`"${c}"`).join(',')})`)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}