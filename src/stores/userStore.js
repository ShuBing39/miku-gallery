import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase' 

export const useUserStore = defineStore('user', () => {
  const user = ref(null)      // Supabase Auth 对象 (包含 email, id)
  const profile = ref(null)   // 数据库 profiles 表对象 (包含 uid, username, avatar_url)
  const session = ref(null)
  const loading = ref(true)

  const initialize = async () => {
    loading.value = true
    
    // 1. 获取 Session
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user || null

    // 2. 如果已登录，去抓取 Profile (获取 UID)
    if (user.value) {
      await fetchProfile(user.value.id)
    }

    // 3. 监听状态变化
    supabase.auth.onAuthStateChange(async (_event, _session) => {
      session.value = _session
      user.value = _session?.user || null
      
      if (_session?.user) {
        await fetchProfile(_session.user.id)
      } else {
        profile.value = null
      }
    })
    
    loading.value = false
  }

  // 🔎 专门获取用户档案的函数
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        profile.value = data
      }
    } catch (e) {
      console.error('获取用户信息失败:', e)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null // 清空 profile
    session.value = null
  }

  return { user, profile, session, loading, initialize, logout }
})