<template>
  <div class="projects-container">
    <div class="header-section">
      <h1>✨ 企划协作大厅</h1>
      <p>发起拼团、寻找画师、共同创作！</p>
      <button class="btn-primary" @click="checkLoginAndOpen">+ 发布新企划</button>
    </div>

    <div class="projects-grid">
      <div v-for="p in projects" :key="p.id" class="project-card">
        <div class="card-status">
          <span :class="['tag', p.is_financial ? 'tag-red' : 'tag-blue']">
            {{ p.is_financial ? '涉及交易' : '无偿/合作' }}
          </span>
          <span class="status-text">{{ translateStatus(p.status) }}</span>
        </div>
        <h3>{{ p.title }}</h3>
        <p class="desc">{{ p.description }}</p>
        <div class="card-footer">
          <span>类型: {{ translateType(p.type) }}</span>
          <button class="btn-small" @click="goToDetail(p.id)">查看详情</button>
        </div>
      </div>
      
      <div v-if="projects.length === 0" class="empty-state">
        暂无正在进行的企划，快来发布第一个吧！
      </div>
    </div>

    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal-content">
        <h2>发布新企划</h2>
        <div class="form-group">
          <label>企划标题</label>
          <input v-model="form.title" placeholder="例如：魔法未来2026应援花篮" />
        </div>
        <div class="form-group">
          <label>企划类型</label>
          <select v-model="form.type">
            <option value="collab">人员招募 (画师/PV等)</option>
            <option value="crowdfunding">拼团/众筹 (涉及金钱)</option>
            <option value="merch">周边制作</option>
          </select>
        </div>
        <div class="form-group">
          <label>是否涉及金钱交易</label>
          <div class="checkbox-row">
            <input type="checkbox" v-model="form.is_financial" id="finance-check">
            <label for="finance-check">是的，涉及收款/转账 (将触发风控检测)</label>
          </div>
        </div>
        <div class="form-group">
          <label>详情描述</label>
          <textarea v-model="form.description" rows="4" placeholder="请详细描述企划内容..."></textarea>
        </div>
        <div class="modal-actions">
          <button @click="showCreateModal = false" class="btn-text">取消</button>
          <button @click="handleCreate" class="btn-primary" :disabled="loading">
            {{ loading ? '检测中...' : '确认发布' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()
const projects = ref([])
const showCreateModal = ref(false)
const loading = ref(false)

const form = ref({ title: '', type: 'collab', description: '', is_financial: false })

const translateStatus = (s) => ({ recruiting: '招募中', progress: '进行中', done: '已结束' }[s] || s)
const translateType = (t) => ({ collab: '招募', crowdfunding: '众筹', merch: '周边' }[t] || t)

const fetchProjects = async () => {
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
  if (!error) projects.value = data
}

const goToDetail = (id) => {
  router.push(`/project/${id}`)
}

// ✨ 新增函数：检查登录状态
const checkLoginAndOpen = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    alert('请先登录或注册账号才能发布企划！')
    router.push('/login')
  } else {
    showCreateModal.value = true
  }
}

const handleCreate = async () => {
  if (!form.value.title) return alert('请填写标题')
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    // 双重保险：虽然打开弹窗前检查了，但提交时再查一次
    if (!user) return alert('请先登录！')

    const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).in('status', ['recruiting', 'progress'])
    
    if (count >= 3) {
      alert(`您当前有 ${count} 个进行中的企划，请先完成它们！`)
      return
    }
    
    const { error } = await supabase.from('projects').insert([{
      user_id: user.id,
      title: form.value.title,
      type: form.value.type,
      description: form.value.description,
      is_financial: form.value.is_financial,
      status: 'recruiting'
    }])
    
    if (error) throw error
    alert('发布成功！')
    showCreateModal.value = false
    fetchProjects()
  } catch (e) {
    alert('发布失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

onMounted(fetchProjects)
</script>

<style scoped>
.projects-container { padding: 20px; max-width: 1200px; margin: 0 auto; }
.header-section { text-align: center; margin-bottom: 30px; }
.projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.project-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.card-status { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; }
.tag { padding: 2px 8px; border-radius: 4px; font-weight: bold; }
.tag-red { background: #fee2e2; color: #ef4444; }
.tag-blue { background: #dbeafe; color: #3b82f6; }
.btn-primary { background: #39c5bb; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; }
.btn-small { background: white; border: 1px solid #39c5bb; color: #39c5bb; padding: 4px 12px; border-radius: 15px; cursor: pointer; margin-top: 10px; float: right;}
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-content { background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 500px; }
.form-group { margin-bottom: 15px; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.modal-actions { text-align: right; margin-top: 20px; }
.btn-text { background: none; border: none; color: #666; cursor: pointer; margin-right: 10px; }
</style>