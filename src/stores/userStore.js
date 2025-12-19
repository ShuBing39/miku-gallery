import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const profile = ref(null) // 新增：单独存储用户资料(昵称头像)

  // 初始化：恢复登录状态
  const initialize = async () => {
    try {
      // 1. 获取认证 Session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        user.value = session.user
        // 2. 获取用户资料 (profiles 表)
        await fetchProfile(user.value.id)
      } else {
        user.value = null
        profile.value = null
      }
    } catch (e) {
      console.error('用户初始化失败:', e)
      user.value = null
    }
  }

  // 获取 profile 表详情
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
      console.error('获取资料失败:', e)
    }
  }

  // 登录
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) {
      user.value = data.user
      await fetchProfile(data.user.id)
    }
    return data
  }

  // 退出
  const logout = async () => {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  return {
    user,
    profile,
    initialize,
    fetchProfile,
    login,
    logout
  }
})