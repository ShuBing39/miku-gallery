import { defineStore } from 'pinia'
import { ref } from 'vue'
// ✅ 关键修复：这里的路径改为了 ../supabase，指向第一步创建的文件
import { supabase } from '../supabase' 

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const profile = ref(null)
  const session = ref(null)
  const loading = ref(false)

  // 初始化用户状态
  const initialize = async () => {
    loading.value = true
    try {
      // 获取当前会话
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user || null
      
      if (user.value) {
        await fetchProfile(user.value.id)
      }

      // 监听登录状态变化 (比如用户在别的标签页登出了)
      supabase.auth.onAuthStateChange(async (_event, _session) => {
        session.value = _session
        user.value = _session?.user || null
        if (_session?.user) {
            await fetchProfile(_session.user.id)
        } else {
            profile.value = null
        }
      })
    } catch (e) {
      console.error('Store 初始化失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 获取用户详细资料
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // 忽略"找不到数据"的错误
        console.error('获取个人资料失败:', error)
      }
      if (data) profile.value = data
    } catch (e) { console.error(e) }
  }

  // 登录动作
  const login = async (email, password) => {
    // 1. 调用 Supabase 登录
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // 2. 登录成功，更新本地状态
    if (data.user) {
        user.value = data.user
        session.value = data.session
        await fetchProfile(data.user.id)
    }
    return data
  }

  // 退出登录
  const logout = async () => {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    session.value = null
  }

  return { user, profile, session, loading, initialize, login, logout }
})