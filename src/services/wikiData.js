import { supabase } from './supabase'
// 奶奶，这里保留引用您原来的常量
import { OFFICIAL_EVENT_CATEGORIES } from '../constants'

// 定义要排除的分类 (活动和企划不属于周边Wiki)
const EXCLUDE_CATS = [
  ...OFFICIAL_EVENT_CATEGORIES,
  '同人企划', 
  '企划'
]

// ✅ 1. 按月份获取数据 (已修复：简化过滤逻辑，只查询 status 为 approved 的数据)
export const fetchWikiByMonth = async (year, month) => {
  const startStr = `${year}-${month.toString().padStart(2, '0')}-01`
  // 计算下个月1号
  const nextMonthDate = new Date(year, month, 1) 
  const nextMonthStr = nextMonthDate.toISOString().split('T')[0]

  // 📝 修改点：移除复杂的 category 过滤，只查询 status 为 approved 的数据
  // 显式指定存在的字段：id, name, image_url, release_date, category, status
  const { data, error } = await supabase.from('items')
    .select('id, name, image_url, release_date, category, status') 
    .eq('status', 'approved')
    .gte('release_date', startStr)
    .lt('release_date', nextMonthStr)
    .order('release_date', { ascending: false })

  if (error) {
    console.error('fetchWikiByMonth 错误:', error)
    throw error
  }
  return data || []
}

// ✅ 2. 保留原有功能：检查是否已关注
export const checkSubscription = async (wikiId, userId) => {
  const { data } = await supabase.from('wiki_subscriptions')
    .select('id').match({ wiki_id: wikiId, user_id: userId }).single()
  return !!data
}

// ✅ 3. 保留原有功能：切换关注状态
export const toggleSubscription = async (wikiId, userId) => {
  const isSubbed = await checkSubscription(wikiId, userId)
  if (isSubbed) {
    await supabase.from('wiki_subscriptions').delete().match({ wiki_id: wikiId, user_id: userId })
    return false
  } else {
    await supabase.from('wiki_subscriptions').insert({ wiki_id: wikiId, user_id: userId })
    return true
  }
}

// ✅ 4. 搜索数据 (已修复：简化过滤逻辑，只查询 status 为 approved 的数据)
export const searchWiki = async (keyword) => {
  const rawQ = keyword.trim()
  if (!rawQ) return []

  // 📝 修改点：移除复杂的 category 过滤，显式指定存在的字段
  let query = supabase.from('items')
    .select('id, name, image_url, release_date, category, status')
    .eq('status', 'approved')

  // 昵称映射表
  const nicknameMap = { '葱': '初音未来', 'miku': '初音未来', '初音': '初音未来', '橘': '镜音铃', '蕉': '镜音连', '双子': '镜音双子', '章鱼': '巡音流歌', '大哥': 'KAITO', '大姐': 'MEIKO' }
  const categoryMap = { '手办': '手办模型', '衣服': '服饰穿搭', '徽章': '徽章/吧唧', '玩偶': '毛绒玩偶' }

  const keywords = rawQ.split(/\s+/).filter(k => k.length > 0)
  
  keywords.forEach(key => {
    const lowerKey = key.toLowerCase()
    
    // 搜年份
    if (/^\d{4}$/.test(key)) { 
      query = query.gte('release_date', `${key}-01-01`).lte('release_date', `${key}-12-31`) 
    } 
    // 搜ID
    else if (/^\d+$/.test(key) && key.length < 4) { 
      query = query.eq('id', key) 
    }
    // 搜分类别名
    else if (categoryMap[lowerKey]) { 
      query = query.ilike('category', `%${categoryMap[lowerKey]}%`) 
    }
    // 通用搜索（只搜索存在的字段：name 和 category）
    else { 
      query = query.or(`name.ilike.%${key}%,category.ilike.%${key}%`) 
    }
  })

  query = query.order('release_date', { ascending: false, nullsFirst: false }).limit(50)
  
  const { data, error } = await query
  if (error) {
    console.error('searchWiki 错误:', error)
    throw error
  }
  return data || []
}

// ✅ 5. 获取单个词条详情 (用于编辑页面)
export const getWikiById = async (id) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) {
    console.error('获取词条详情失败:', error)
    return null
  }
  return data
}

// ✅ 6. 提交词条修改建议 (核心功能)
export const submitWikiRevision = async (revisionData) => {
  const { data, error } = await supabase
    .from('wiki_revisions')
    .insert([revisionData])
    .select()
    
  if (error) throw error
  return data
}

// ✅ 7. (可选) 获取用户的提交记录
export const getUserRevisions = async (userId) => {
  const { data, error } = await supabase
    .from('wiki_revisions')
    .select('*, items(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}