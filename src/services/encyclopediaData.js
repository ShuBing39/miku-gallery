import { supabase } from './supabase'

// 1. 获取列表
export const getEncyclopediaEntries = async (search = '') => {
  let query = supabase
    .from('encyclopedia_entries')
    .select('*')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })

  if (search) {
    // 搜索标题、标签或分类
    query = query.or(`title.ilike.%${search}%,tags.cs.{${search}},category.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// 2. 获取详情
export const getEntryDetail = async (id) => {
  const { data, error } = await supabase
    .from('encyclopedia_entries')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// 3. 【核心修复】保存/发布词条
export const saveEntry = async (entryData) => {
  // 确保数据符合数据库结构
  const payload = {
    title: entryData.title,
    content: entryData.content,
    category: entryData.category,
    tags: entryData.tags || [], // 确保是数组
    image_url: entryData.image_url,
    author_id: entryData.author_id,
    is_published: true,
    updated_at: new Date()
  }

  // 如果有ID则是更新，没有则是新增
  if (entryData.id) {
    payload.id = entryData.id
  }

  const { data, error } = await supabase
    .from('encyclopedia_entries')
    .upsert(payload)
    .select()
  
  if (error) throw error
  return data
}