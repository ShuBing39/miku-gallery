<template>
    <div class="tool-container">
      <div class="tool-header">
        <button class="btn-back" @click="$router.push(`/project/${projectId}`)">⬅ 返回车队</button>
        <h2>🛠️ 团务工作台</h2>
      </div>
  
      <div v-if="loading" class="loading-state">读取数据中...</div>
  
      <div v-else class="content-body">
        <div class="summary-cards">
          <div class="card">
            <div class="num">{{ orders.length }}</div>
            <div class="label">排单人数</div>
          </div>
          <div class="card">
            <div class="num">¥{{ totalAmount }}</div>
            <div class="label">预估总额</div>
          </div>
          <div class="card">
            <div class="num">{{ itemsCount }}</div>
            <div class="label">商品总数</div>
          </div>
        </div>
  
        <div class="order-section">
          <div class="section-header">
            <h3>📝 排单列表</h3>
            <button class="btn-export" @click="exportExcel">📤 导出 Excel (暂不可用)</button>
          </div>
  
          <div class="table-wrapper">
            <table class="order-table">
              <thead>
                <tr>
                  <th>买家</th>
                  <th>排单内容</th>
                  <th>总额</th>
                  <th>状态</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in orders" :key="order.id">
                  <td class="user-col">
                    <img :src="order.buyer_avatar || 'https://placehold.co/40x40'" class="avatar">
                    <span>{{ order.buyer_name }}</span>
                  </td>
                  <td class="items-col">
                    <div v-for="(item, i) in order.items" :key="i" class="item-line">
                      {{ item.name }} <span class="count">x{{ item.count }}</span>
                    </div>
                  </td>
                  <td class="price-col">¥{{ order.total_amount }}</td>
                  <td>
                    <span class="status-tag" :class="order.status">{{ order.status }}</span>
                  </td>
                  <td class="time-col">{{ formatDate(order.created_at) }}</td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="orders.length === 0" class="empty-table">
              暂无排单数据
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { getProjectOrders } from '../services/orderService'
  
  const route = useRoute()
  const projectId = route.query.id
  const loading = ref(true)
  const orders = ref([])
  
  onMounted(async () => {
    if (projectId) {
      await loadData()
    }
  })
  
  const loadData = async () => {
    loading.value = true
    try {
      orders.value = await getProjectOrders(projectId)
    } catch (e) {
      alert('加载失败: ' + e.message)
    } finally {
      loading.value = false
    }
  }
  
  const totalAmount = computed(() => orders.value.reduce((sum, o) => sum + (o.total_amount || 0), 0))
  const itemsCount = computed(() => orders.value.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.count, 0), 0))
  
  const formatDate = (iso) => new Date(iso).toLocaleString()
  const exportExcel = () => alert('Excel 导出功能将在下一阶段上线！')
  </script>
  
  <style scoped>
  .tool-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: sans-serif; background: #f0f2f5; min-height: 100vh; }
  .tool-header { display: flex; align-items: center; margin-bottom: 20px; gap: 15px; }
  .btn-back { background: white; border: 1px solid #ddd; padding: 6px 15px; border-radius: 20px; cursor: pointer; }
  h2 { margin: 0; color: #333; }
  
  .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
  .card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .card .num { font-size: 24px; font-weight: bold; color: #39C5BB; }
  .card .label { font-size: 12px; color: #888; margin-top: 5px; }
  
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .btn-export { background: #2c3e50; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  
  .table-wrapper { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .order-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #fafafa; padding: 12px 15px; text-align: left; color: #666; font-weight: bold; border-bottom: 1px solid #eee; }
  td { padding: 12px 15px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
  
  .user-col { display: flex; align-items: center; gap: 8px; font-weight: bold; }
  .avatar { width: 24px; height: 24px; border-radius: 50%; }
  .items-col .item-line { margin-bottom: 2px; }
  .count { color: #888; font-size: 12px; }
  .price-col { font-weight: bold; color: #f57c00; }
  .status-tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #eee; color: #666; }
  .status-tag.pending { background: #fff3e0; color: #e65100; }
  .time-col { color: #999; font-size: 12px; }
  
  .empty-table { padding: 40px; text-align: center; color: #999; }
  </style>