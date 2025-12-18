// src/supabase.js
// 这是一个“替身”文件。
// 它不创建新客户端，而是直接把 services 里的那个单例拿过来用。
// 这样就保证了全站只有一个 Supabase 实例。

export { supabase } from './services/supabase'