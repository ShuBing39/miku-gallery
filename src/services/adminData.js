import { supabase } from './supabase'
import { OFFICIAL_EVENT_CATEGORIES } from '../constants'

// 辅助函数
const applyCategoryFilters = (query) => {
  if (OFFICIAL_EVENT_CATEGORIES && OFFICIAL_EVENT_CATEGORIES.length > 0) {
    query = query.not('category', 'in', `(${OFFICIAL_EVENT_CATEGORIES.map(c => `"${c}"`).join(',')})`)
  }
  query = query.neq('category', '同人企划')
  return query
}

// --- 1. 周边审核 (Items) ---
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

export const updateItem = async (id, updates) => {
  const { error } = await supabase.from('items').update(updates).eq('id', id)
  if (error) throw error
}

// --- 2. 同人企划管理 (Projects) ---
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

// --- ✅ [修改] 3. 官方活动管理 (Events 表) ---
// 这里的 getEvents 改为读取真正的 'events' 表，不再读取 'items'
export const getOfficialEvents = async () => {
  const { data, error } = await supabase
    .from('events') // ✅ 读取 events 表
    .select('*')
    .order('start_date', { ascending: false }) // 按开始时间倒序
  
  if (error) {
    console.error('获取官方活动列表失败:', error)
    return []
  }
  return data || []
}

// ✅ 新增：创建官方活动
export const createOfficialEvent = async (eventData) => {
  const { error } = await supabase.from('events').insert(eventData)
  if (error) throw error
}

// ✅ 新增：更新官方活动
export const updateOfficialEvent = async (id, updates) => {
  const { error } = await supabase.from('events').update(updates).eq('id', id)
  if (error) throw error
}

// ✅ 新增：删除官方活动
export const deleteOfficialEvent = async (id) => {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
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

// --- 5. 用户实名认证 ---
export const getPendingUserKYC = async () => {
  const { data, error } = await supabase
    .from('user_verifications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('获取实名列表失败:', error)
    return []
  }
  return data || []
}

// --- 6. 通用操作 ---
export const auditRecord = async (table, id, status) => {
  const { error } = await supabase.from(table).update({ status }).eq('id', id)
  if (error) throw error
}

export const deleteRecord = async (table, id) => {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// --- 7. 邀请码 ---
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

// --- 8. 轮播图 & 百科种子 ---
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

// --- 9. 用户返图审核 ---
export const getPendingUserImages = async () => {
  const { data, error } = await supabase
    .from('item_user_images')
    .select(`
      *,
      items:item_id (name),
      profiles:user_id (username)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取返图失败:', error)
    return []
  }
  return data || []
}

// --- 10. 百科纠错审核 ---
export const getPendingWikiRevisions = async () => {
  const { data, error } = await supabase
    .from('wiki_revisions')
    .select(`
      *,
      items:item_id (name, image_url, description),
      profiles:user_id (username)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('获取纠错列表失败:', error)
    return []
  }
  return data || []
}

export const approveWikiRevision = async (revision) => {
  const { error: updateError } = await supabase
    .from('items')
    .update(revision.new_data)
    .eq('id', revision.item_id)
  if (updateError) throw updateError

  const { error: statusError } = await supabase
    .from('wiki_revisions')
    .update({ status: 'approved' })
    .eq('id', revision.id)
  if (statusError) throw statusError
}

export const rejectWikiRevision = async (id) => {
  const { error } = await supabase
    .from('wiki_revisions')
    .update({ status: 'rejected' })
    .eq('id', id)
  if (error) throw error
}