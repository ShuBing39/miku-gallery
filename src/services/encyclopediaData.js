import { supabase } from './supabase'

// 1. 获取列表
export const getEncyclopediaEntries = async (search = '') => {
  let query = supabase
    .from('wiki_articles')
    .select('*')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })

  if (search) {
    query = query.or(`title.ilike.%${search}%,tags.cs.{${search}},category.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// 2. 获取详情
export const getEntryDetail = async (id) => {
  const { data, error } = await supabase
    .from('wiki_articles')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// 3. 保存/发布词条
export const saveEntry = async (entryData) => {
  const payload = {
    title: entryData.title,
    content: entryData.content,
    category: entryData.category,
    tags: entryData.tags || [],
    image_url: entryData.image_url,
    // ✅ [统一修改] 数据库字段已改为 user_id
    user_id: entryData.user_id || entryData.author_id, 
    is_published: true,
    updated_at: new Date()
  }

  if (entryData.id) {
    payload.id = entryData.id
  }

  const { data, error } = await supabase
    .from('wiki_articles')
    .upsert(payload)
    .select()
  
  if (error) throw error
  return data
}