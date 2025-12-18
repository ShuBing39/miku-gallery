import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase' // 引用根目录的 supabase

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)

  const initialize = async () => {
    loading.value = true
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user || null
    
    supabase.auth.onAuthStateChange((_event, _session) => {
      session.value = _session
      user.value = _session?.user || null
    })
    loading.value = false
  }

  const logout = async () => {
    await supabase.auth.signOut()
    user.value = null
    session.value = null
  }

  return { user, session, loading, initialize, logout }
})