import { defineStore } from 'pinia'
import { ref } from 'vue'
// ✅ 指向您之前创建的 supabase 配置文件
import { supabase } from '../supabase' 

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const profile = ref(null)
  const session = ref(null)
  const loading = ref(false)

  // 获取用户详细资料
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('获取个人资料失败:', error)
      }
      if (data) profile.value = data
    } catch (e) { 
      console.error(e) 
    }
  }

  // 初始化用户状态
  async function initialize() {
    loading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user || null
      
      if (user.value) {
        await fetchProfile(user.value.id)
      }

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

  // 🔐 登录动作 - 显式定义函数
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    if (data.user) {
        user.value = data.user
        session.value = data.session
        await fetchProfile(data.user.id)
    }
    return data
  }

  // 退出登录
  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    session.value = null
  }

  // ✅ 确保这里把所有东西都交出去
  return { 
    user, 
    profile, 
    session, 
    loading, 
    initialize, 
    login, 
    logout 
  }
})