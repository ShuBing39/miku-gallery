import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const profile = ref(null) // 单独存储用户资料(昵称头像)

  // 初始化：恢复登录状态
  const initialize = async () => {
    try {
      // 1. 获取认证 Session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // 如果获取 Session 报错（通常是因为 Token 无效/过期/数据库重置），强制清理
      if (error) {
        console.warn('Session 无效，强制清理状态:', error.message)
        await logout()
        return
      }
      
      if (session?.user) {
        user.value = session.user
        // 2. 获取用户资料 (profiles 表)
        await fetchProfile(user.value.id)
      } else {
        // 没有 Session，置空
        user.value = null
        profile.value = null
      }
    } catch (e) {
      console.error('用户初始化异常:', e)
      user.value = null
      profile.value = null
    }
  }

  // 获取 profile 表详情
  const fetchProfile = async (userId) => {
    try {
      // ✅ 修改点：使用 maybeSingle() 代替 single()
      // maybeSingle() 允许查询结果为空，不会报 406 错误
      // 因为刚注册或重置数据库后，profile 可能还没创建
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle() 
      
      if (error) {
        console.warn('获取资料出错 (可能是网络问题):', error.message)
        return
      }

      if (data) {
        profile.value = data
      } else {
        console.log('未找到 Profile (可能是新用户)，保持为空')
        profile.value = null
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
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('退出时 Supabase 报错 (可忽略):', e)
    } finally {
      // 无论 Supabase 侧是否成功，前端都要清理状态
      user.value = null
      profile.value = null
    }
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