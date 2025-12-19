import { createClient } from '@supabase/supabase-js'

// 1. 读取环境变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 2. 检查变量是否存在（防呆检查）
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 严重错误: 未找到 Supabase 环境变量！请检查 .env 文件。')
}

// 3. 导出唯一的客户端实例
export const supabase = createClient(supabaseUrl, supabaseAnonKey)