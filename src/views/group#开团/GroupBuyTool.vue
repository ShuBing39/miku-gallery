<template>
    <div class="tool-container">
      <div class="tool-header">
        <button class="btn-back" @click="$router.push(`/project/${projectId}`)">⬅ 返回车队</button>
        <h2>🛠️ 团务工作台 (Pro)</h2>
      </div>
  
      <div class="action-bar-top">
        <div class="file-upload-wrapper">
          <label for="excel-upload" class="btn-tool import">📥 导入 Excel 排单</label>
          <input id="excel-upload" type="file" accept=".xlsx, .xls" @change="handleFileDrop" hidden>
        </div>
        <button class="btn-tool manual" @click="showManualModal = true">✍️ 手动录入</button>
        <button class="btn-tool export" @click="exportData">📤 导出表格</button>
      </div>
  
      <div class="summary-cards">
        <div class="card">
          <div class="num">{{ orders.length }}</div>
          <div class="label">总单数</div>
        </div>
        <div class="card">
          <div class="num">¥{{ totalAmount.toFixed(2) }}</div>
          <div class="label">预估总额</div>
        </div>
        <div class="card">
          <div class="num">{{ onlineCount }} / {{ offlineCount }}</div>
          <div class="label">APP单 / 导入单</div>
        </div>
      </div>
  
      <div class="order-section">
        <div class="section-header">
          <h3>📋 订单管理</h3>
          <button class="refresh-btn" @click="loadData">🔄 刷新</button>
        </div>
  
        <div class="table-wrapper">
          <table class="order-table">
            <thead>
              <tr>
                <th>来源</th>
                <th>买家昵称</th>
                <th>排单内容</th>
                <th>金额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id" :class="{ offline: order.is_offline }">
                <td><span class="source-tag" :class="order.is_offline ? 'excel' : 'app'">{{ order.source }}</span></td>
                <td class="user-col">
                  <img :src="order.avatar || 'https://placehold.co/40x40?text=User'" class="avatar">
                  <span class="uname">{{ order.display_name }}</span>
                </td>
                <td class="items-col">
                  <div v-for="(item, i) in order.items" :key="i" class="item-line">
                    {{ item.name }} <span class="count">x{{ item.count }}</span>
                  </div>
                </td>
                <td class="price-col">¥{{ order.total_amount }}</td>
                <td>
                  <span class="status-tag" :class="order.status">{{ statusMap[order.status] || order.status }}</span>
                </td>
                <td>
                  <button @click="handleDelete(order.id)" class="btn-del">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="orders.length === 0" class="empty-table">暂无数据，请等待买家下单或导入Excel</div>
        </div>
      </div>
  
      <div v-if="showManualModal" class="modal-overlay">
        <div class="modal-content">
          <h3>✍️ 手动录入订单</h3>
          <div class="form-row"><label>买家昵称</label><input v-model="manualForm.name" class="std-input" placeholder="QQ昵称/微信名"></div>
          <div class="form-row"><label>商品内容</label><input v-model="manualForm.itemStr" class="std-input" placeholder="例如: 初音x1, 镜音x2"></div>
          <div class="form-row"><label>总金额</label><input v-model.number="manualForm.amount" type="number" class="std-input"></div>
          <div class="modal-actions">
            <button @click="showManualModal = false">取消</button>
            <button @click="confirmManualAdd" class="confirm">添加</button>
          </div>
        </div>
      </div>
  
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed, reactive } from 'vue'
  import { useRoute } from 'vue-router'
  import * as XLSX from 'xlsx'
  import { getProjectOrders, batchImportOrders, deleteOrder } from '../../services/orderService'
  
  const route = useRoute()
  const projectId = route.query.id
  const loading = ref(false)
  const orders = ref([])
  const showManualModal = ref(false)
  
  const statusMap = { pending: '待确认', paid: '已登记', shipped: '已发货' }
  
  const manualForm = reactive({ name: '', itemStr: '', amount: 0 })
  
  onMounted(() => loadData())
  
  const loadData = async () => {
    loading.value = true
    try {
      orders.value = await getProjectOrders(projectId)
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }
  
  // 统计
  const totalAmount = computed(() => orders.value.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0))
  const onlineCount = computed(() => orders.value.filter(o => !o.is_offline).length)
  const offlineCount = computed(() => orders.value.filter(o => o.is_offline).length)
  
  // --- Excel 导入逻辑 ---
  const handleFileDrop = (e) => {
    const file = e.target.files[0]
    if (!file) return
  
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(sheet)
      
      processExcelData(json)
    }
    reader.readAsArrayBuffer(file)
  }
  
  const processExcelData = async (rows) => {
    // 简单的智能识别：找"昵称/买家", "商品/排单", "金额"
    const newOrders = []
    
    rows.forEach(row => {
      // 模糊匹配列名
      const nameKey = Object.keys(row).find(k => /昵称|买家|ID|姓名/.test(k))
      const itemKey = Object.keys(row).find(k => /商品|排单|内容|谷子/.test(k))
      const priceKey = Object.keys(row).find(k => /金额|总价|款项/.test(k))
  
      if (nameKey && itemKey) {
        newOrders.push({
          buyer_name: row[nameKey],
          items: parseItems(row[itemKey]), // 解析 "初音*1" 这种字符串
          total_amount: priceKey ? row[priceKey] : 0
        })
      }
    })
  
    if (newOrders.length === 0) return alert('未识别到有效数据！请确保表头包含“昵称”、“商品”等关键词。')
  
    if (confirm(`识别到 ${newOrders.length} 条数据，确认导入吗？`)) {
      try {
        await batchImportOrders(projectId, newOrders)
        alert('导入成功！')
        loadData()
      } catch (e) {
        alert('导入失败: ' + e.message)
      }
    }
  }
  
  // 简单的字符串解析: "初音x2, 镜音*1" -> [{name, count}]
  const parseItems = (str) => {
    if (!str) return []
    // 简单按逗号或空格分割
    const parts = str.split(/[,，\s]+/)
    return parts.map(p => {
      return { name: p, count: 1, price: 0 } // 简化处理
    })
  }
  
  // --- 手动录入 ---
  const confirmManualAdd = async () => {
    if (!manualForm.name) return
    const payload = [{
      buyer_name: manualForm.name,
      items: parseItems(manualForm.itemStr),
      total_amount: manualForm.amount
    }]
    await batchImportOrders(projectId, payload)
    showManualModal.value = false
    manualForm.name = ''
    manualForm.itemStr = ''
    loadData()
  }
  
  const handleDelete = async (id) => {
    if (confirm('确认删除此订单？')) {
      await deleteOrder(id)
      loadData()
    }
  }
  
  const exportData = () => {
    // 使用 XLSX 导出
    const exportData = orders.value.map(o => ({
      '来源': o.source,
      '买家': o.display_name,
      '内容': o.items.map(i => `${i.name}x${i.count}`).join(', '),
      '金额': o.total_amount,
      '状态': statusMap[o.status]
    }))
    
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "排单表")
    XLSX.writeFile(wb, `团购排单_${new Date().toLocaleDateString()}.xlsx`)
  }
  </script>
  
  <style scoped>
  .tool-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; background: #f0f2f5; min-height: 100vh; }
  .tool-header { display: flex; align-items: center; margin-bottom: 20px; gap: 15px; }
  .btn-back { background: white; border: 1px solid #ddd; padding: 6px 15px; border-radius: 20px; cursor: pointer; }
  h2 { margin: 0; color: #333; }
  
  /* 顶部操作栏 */
  .action-bar-top { display: flex; gap: 10px; margin-bottom: 20px; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .btn-tool { padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: none; transition: 0.2s; font-size: 14px; }
  .btn-tool.import { background: #4caf50; color: white; display: inline-block; }
  .btn-tool.manual { background: #2196f3; color: white; }
  .btn-tool.export { background: #607d8b; color: white; margin-left: auto; }
  .btn-tool:hover { opacity: 0.9; transform: translateY(-1px); }
  
  .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
  .card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .card .num { font-size: 24px; font-weight: bold; color: #39C5BB; }
  .card .label { font-size: 12px; color: #888; margin-top: 5px; }
  
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .refresh-btn { background: none; border: 1px solid #ddd; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
  
  .table-wrapper { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .order-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #fafafa; padding: 12px 15px; text-align: left; color: #666; font-weight: bold; border-bottom: 1px solid #eee; }
  td { padding: 12px 15px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
  tr.offline { background-color: #faffff; }
  
  .source-tag { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
  .source-tag.app { background: #e0f2f1; color: #00695c; }
  .source-tag.excel { background: #e8f5e9; color: #2e7d32; }
  
  .user-col { display: flex; align-items: center; gap: 8px; font-weight: bold; }
  .avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
  .items-col .item-line { margin-bottom: 2px; }
  .count { color: #888; font-size: 12px; background: #eee; padding: 0 4px; border-radius: 4px; }
  .price-col { font-weight: bold; color: #f57c00; }
  .status-tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #eee; color: #666; }
  .status-tag.paid { background: #e8f5e9; color: #2e7d32; }
  .btn-del { border: none; background: none; cursor: pointer; opacity: 0.5; }
  .btn-del:hover { opacity: 1; }
  
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
  .modal-content { background: white; padding: 25px; border-radius: 12px; width: 350px; }
  .form-row { margin-bottom: 15px; }
  .form-row label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 13px; }
  .std-input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  .modal-actions button { padding: 8px 15px; border-radius: 6px; cursor: pointer; border: 1px solid #ddd; background: white; }
  .modal-actions .confirm { background: #39C5BB; color: white; border: none; }
  
  .empty-table { padding: 40px; text-align: center; color: #999; }
  </style>