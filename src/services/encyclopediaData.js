import { supabase } from './supabase'

// 获取所有百科词条
export const getEncyclopediaEntries = async (search = '') => {
  let query = supabase
    .from('encyclopedia_entries')
    .select('*')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })

  if (search) {
    query = query.or(`title.ilike.%${search}%, tags.cs.{${search}}`) // 搜标题或标签
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// 获取单个词条详情
export const getEntryDetail = async (id) => {
  const { data, error } = await supabase
    .from('encyclopedia_entries')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// 提交/更新词条
export const saveEntry = async (entryData) => {
  // 假设有表 encyclopedia_entries: id, title, content, category, tags, author_id, is_published
  const { error } = await supabase
    .from('encyclopedia_entries')
    .upsert(entryData)
  
  if (error) throw error
}