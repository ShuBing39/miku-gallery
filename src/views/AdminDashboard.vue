<template>
    <div class="admin-container">
      <header class="admin-header">
        <h1>🎛️ 数据库控制台</h1>
        <div class="header-actions">
          <span>当前用户: {{ currentUser?.email }}</span>
          <button @click="handleLogout" class="logout-btn">退出登录</button>
        </div>
      </header>
  
      <div v-if="pendingItems.length > 0" class="audit-section">
        <h3>🚨 待审核队列 ({{ pendingItems.length }})</h3>
        <div class="audit-grid">
          <div v-for="item in pendingItems" :key="item.id" class="audit-card">
            <img :src="item.image_url" class="audit-img" />
            <div class="audit-info">
              <h4>#{{ item.id }} {{ item.name }}</h4>
              <p class="meta">上传者ID: {{ item.uploader_id }}</p>
              <p class="desc">{{ item.description || '无描述' }}</p>
              <div class="audit-actions">
                <button @click="auditItem(item.id, 'approved')" class="approve-btn">✅ 通过</button>
                <button @click="auditItem(item.id, 'rejected')" class="reject-btn">❌ 驳回</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="audit-empty">✅ 当前没有待审核的内容</div>
      <div class="invite-section">
        <h3>🔑 内测邀请码管理</h3>
        <div class="invite-top-row">
          <button @click="generateCode" class="gen-btn">🎲 生成新邀请码</button>
          <div class="code-display" v-if="newCode">
            生成成功: <span class="highlight-code">{{ newCode }}</span> 
            <button @click="copyCode" class="copy-btn">复制</button>
          </div>
        </div>
        <div class="code-list-area">
          <p class="list-title">最近生成的10个邀请码:</p>
          <div class="code-tags">
            <span v-for="c in inviteCodes" :key="c.id" class="code-tag" :class="{ 'used': c.is_used }">
              {{ c.code }} <i v-if="c.is_used"> (已用)</i>
            </span>
          </div>
        </div>
      </div>
  
      <div class="toolbar">
        <input v-model="searchQuery" @input="fetchItems" placeholder="🔍 搜索 ID 或 名称..." class="search-input" />
        <button @click="fetchItems" class="refresh-btn">🔄 刷新列表</button>
      </div>
  
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">ID</th>
              <th style="width: 60px;">图</th>
              <th>名称</th>
              <th style="width: 80px;">状态</th> <th style="width: 100px;">分类</th>
              <th style="width: 80px;">市价</th>
              <th style="width: 140px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.id }}</td>
              <td><img :src="item.image_url" class="mini-thumb" /></td>
              <td>
                <input v-if="editingId === item.id" v-model="editForm.name" class="edit-input" />
                <a v-else :href="item.link" target="_blank" class="item-link">{{ item.name }}</a>
              </td>
              <td>
                <span class="status-badge" :class="item.status">{{ item.status || 'approved' }}</span>
              </td>
              <td>
                <input v-if="editingId === item.id" v-model="editForm.category" class="edit-input" />
                <span v-else class="badge cat">{{ item.category }}</span>
              </td>
              <td>
                <input v-if="editingId === item.id" v-model="editForm.market_price" type="number" class="edit-input" />
                <span v-else class="price">{{ item.market_price ? '¥' + item.market_price : '-' }}</span>
              </td>
              <td>
                <div v-if="editingId === item.id" class="action-group">
                  <button @click="saveEdit(item.id)" class="save-btn">💾 保存</button>
                  <button @click="cancelEdit" class="cancel-btn">取消</button>
                </div>
                <div v-else class="action-group">
                  <button @click="startEdit(item)" class="edit-btn">✏️</button>
                  <button @click="deleteItem(item.id)" class="del-btn">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="pagination">
        <button @click="page--" :disabled="page === 0">上一页</button>
        <span>第 {{ page + 1 }} 页</span>
        <button @click="page++">下一页</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch } from 'vue'
  import { createClient } from '@supabase/supabase-js'
  import { useRouter } from 'vue-router'
  
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  const router = useRouter()
  
  const items = ref([])
  const pendingItems = ref([]) // ✨ 待审核列表
  const currentUser = ref(null)
  const page = ref(0)
  const PAGE_SIZE = 20
  const searchQuery = ref('')
  const editingId = ref(null)
  const editForm = ref({})
  const newCode = ref('')
  const inviteCodes = ref([])
  
  onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login') } 
    else {
      currentUser.value = user
      fetchItems()
      fetchPendingItems() // ✨ 加载待审核
      fetchCodes()
    }
  })
  
  // ✨ 获取待审核物品
  const fetchPendingItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (data) pendingItems.value = data
  }
  
  // ✨ 审核操作
  const auditItem = async (id, status) => {
    if (!confirm(status === 'approved' ? '确认通过？' : '确认驳回？')) return
    
    const { error } = await supabase
      .from('items')
      .update({ status: status })
      .eq('id', id)
      
    if (!error) {
      alert('操作成功')
      fetchPendingItems() // 刷新待审核
      fetchItems() // 刷新总表
    } else {
      alert('操作失败: ' + error.message)
    }
  }
  
  const fetchItems = async () => {
    let query = supabase.from('items').select('*').order('id', { ascending: false }).range(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE - 1)
    if (searchQuery.value) query = query.or(`name.ilike.%${searchQuery.value}%,id.eq.${searchQuery.value}`)
    const { data } = await query
    if (data) items.value = data
  }
  
  watch(page, fetchItems)
  
  const startEdit = (item) => { editingId.value = item.id; editForm.value = { ...item } }
  const cancelEdit = () => { editingId.value = null; editForm.value = {} }
  const saveEdit = async (id) => {
    const { error } = await supabase.from('items').update({
      name: editForm.value.name,
      category: editForm.value.category,
      market_price: editForm.value.market_price || null
    }).eq('id', id)
    if (!error) { alert('✅ 修改成功'); editingId.value = null; fetchItems() } 
    else { alert('❌ 保存失败') }
  }
  const deleteItem = async (id) => {
    if (!confirm(`⚠️ 确定要彻底删除 ID: ${id} 吗？`)) return
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (!error) items.value = items.value.filter(i => i.id !== id)
  }
  const generateCode = async () => {
    const code = `MIKU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const { error } = await supabase.from('invitation_codes').insert([{ code: code }])
    if (!error) { newCode.value = code; fetchCodes() }
  }
  const copyCode = () => { navigator.clipboard.writeText(newCode.value); alert('已复制!') }
  const fetchCodes = async () => { const { data } = await supabase.from('invitation_codes').select('*').order('created_at', { ascending: false }).limit(10); if (data) inviteCodes.value = data }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  </script>
  
  <style scoped>
  .admin-container { padding: 20px; font-family: sans-serif; background: #f9f9f9; min-height: 100vh; }
  .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
  .logout-btn { background: #ff4d4f; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; }
  
  /* ✨ 审核队列样式 */
  .audit-section { margin-bottom: 30px; border: 2px solid #ff9800; background: #fff3e0; padding: 20px; border-radius: 8px; }
  .audit-empty { margin-bottom: 30px; background: #e8f5e9; color: #2e7d32; padding: 15px; border-radius: 8px; text-align: center; }
  .audit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
  .audit-card { background: white; padding: 10px; border-radius: 8px; display: flex; gap: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
  .audit-img { width: 80px; height: 80px; object-fit: cover; border-radius: 4px; }
  .audit-info { flex: 1; }
  .audit-info h4 { margin: 0 0 5px 0; font-size: 14px; }
  .meta { margin: 0; font-size: 11px; color: #999; }
  .desc { font-size: 12px; color: #666; margin: 5px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .audit-actions { display: flex; gap: 10px; margin-top: 5px; }
  .approve-btn { background: #4caf50; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .reject-btn { background: #f44336; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  
  /* 状态标签 */
  .status-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
  .status-badge.approved { background: #e8f5e9; color: #2e7d32; }
  .status-badge.pending { background: #fff3e0; color: #ef6c00; font-weight: bold; }
  .status-badge.rejected { background: #ffebee; color: #c62828; text-decoration: line-through; }
  
  /* 其他样式保持 */
  .invite-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
  .invite-top-row { display: flex; gap: 15px; margin-bottom: 15px; }
  .gen-btn { background: #00695c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
  .code-display { background: #e0f2f1; padding: 8px 15px; border-radius: 4px; color: #004d40; }
  .highlight-code { font-weight: bold; font-family: monospace; font-size: 18px; margin: 0 10px; }
  .code-tags { display: flex; flex-wrap: wrap; gap: 8px; }
  .code-tag { padding: 4px 10px; background: #fff; border: 1px solid #b2dfdb; color: #00796b; border-radius: 12px; font-size: 12px; }
  .code-tag.used { background: #eee; color: #999; border-color: #ddd; text-decoration: line-through; }
  .toolbar { margin-bottom: 15px; display: flex; gap: 10px; }
  .search-input { padding: 8px; width: 300px; }
  .refresh-btn { background: #39C5BB; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; }
  .table-wrapper { background: white; border-radius: 8px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f0f0f0; }
  .mini-thumb { width: 40px; height: 40px; object-fit: cover; }
  .edit-input { width: 90%; padding: 4px; }
  .pagination { margin-top: 20px; display: flex; justify-content: center; gap: 15px; }
  </style>