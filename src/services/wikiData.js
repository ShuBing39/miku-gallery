// src/services/wikiData.js
import { supabase } from './supabase'
import { OFFICIAL_EVENT_CATEGORIES } from '../constants'

// 定义要排除的分类 (活动和企划不属于周边Wiki)
const EXCLUDE_CATS = [
  ...OFFICIAL_EVENT_CATEGORIES,
  '同人企划', 
  '企划'
]

// 按月份获取数据
export const fetchWikiByMonth = async (year, month) => {
  const startStr = `${year}-${month}-01`
  // 计算下个月1号
  const nextMonthDate = new Date(year, month, 1) 
  const nextMonthStr = nextMonthDate.toISOString()

  const { data, error } = await supabase.from('items')
    .select('id, name, price, market_price, image_url, character, category, author, release_date, is_fan_work')
    .eq('status', 'approved')
    .not('category', 'in', `(${EXCLUDE_CATS.map(c=>`"${c}"`).join(',')})`)
    .gte('release_date', startStr)
    .lt('release_date', nextMonthStr)
    .order('release_date', { ascending: false })

  if (error) throw error
  return data || []
}

// ... (保留原有 import 和函数)

// 检查是否已关注
export const checkSubscription = async (wikiId, userId) => {
    const { data } = await supabase.from('wiki_subscriptions')
      .select('id').match({ wiki_id: wikiId, user_id: userId }).single()
    return !!data
  }
  
  // 切换关注状态
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

// 搜索数据
export const searchWiki = async (keyword) => {
  const rawQ = keyword.trim()
  if (!rawQ) return []

  let query = supabase.from('items')
    .select('id, name, price, market_price, image_url, character, category, author, release_date, is_fan_work')
    .eq('status', 'approved')
    .not('category', 'in', `(${EXCLUDE_CATS.map(c=>`"${c}"`).join(',')})`)

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
    // 搜昵称
    else if (nicknameMap[lowerKey]) { 
      query = query.ilike('character', `%${nicknameMap[lowerKey]}%`) 
    }
    // 搜分类别名
    else if (categoryMap[lowerKey]) { 
      query = query.ilike('category', `%${categoryMap[lowerKey]}%`) 
    }
    // 通用搜索
    else { 
      query = query.or(`name.ilike.%${key}%,category.ilike.%${key}%,author.ilike.%${key}%`) 
    }
  })

  query = query.order('release_date', { ascending: false, nullsFirst: false }).limit(50)
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}