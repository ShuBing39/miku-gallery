<template>
    <div class="gb-detail">
      <div class="status-bar">
        <div class="left">
          <span class="badge" :class="project.status">{{ statusText }}</span>
          <span class="rate-tag">汇率: {{ settings.exchange_rate }}</span>
        </div>
        <div class="right" v-if="isOwner">
          <button class="btn-manage" @click="goToWorkbench">
            🛠️ 进入团长工作台
          </button>
        </div>
      </div>
  
      <div class="rule-card">
        <div class="card-header"><h3>📜 参团规则 (买家必读)</h3></div>
        <div class="rule-content">
          <div class="rule-row"><span class="label">📦 物流:</span><span>{{ logiText }}</span></div>
          <div class="rule-row"><span class="label">⚡ 砍单:</span><span>按 <strong>{{ cutText }}</strong> 顺序分配</span></div>
          <div class="rule-row"><span class="label">🧶 捆绑:</span><span>{{ bindText }}</span></div>
          <div class="rule-desc" v-if="project.description"><strong>补充说明：</strong><br>{{ project.description }}</div>
        </div>
      </div>
  
      <div class="items-section">
        <h3>🛒 选购商品</h3>
        <div class="items-list">
          <div v-for="(item, idx) in itemList" :key="idx" class="item-row" :class="{ disabled: project.status !== 'active' }">
            <img :src="item.image_url" class="thumb">
            <div class="item-info">
              <div class="name">
                <span v-if="item.type" class="tag" :class="item.type">{{ getTagLabel(item.type) }}</span>
                {{ item.name }}
              </div>
              <div class="price">
                <span class="cny">¥{{ calcPrice(item.price) }}</span>
                <span class="jpy">({{ item.price }}円)</span>
              </div>
            </div>
            <div class="action">
              <input type="number" v-model.number="item.buyCount" min="0" class="qty-input" :disabled="project.status !== 'active'">
            </div>
          </div>
        </div>
      </div>
  
      <div class="footer-bar">
        <div class="total-info">
          <span>预计金额:</span>
          <span class="total-price">¥{{ totalEstimate }}</span>
          <span class="note">(不含运费)</span>
        </div>
        <button class="btn-order" :disabled="totalEstimate <= 0 || submitting" @click="handleOrder">
          {{ submitting ? '提交中...' : '📝 确认排单' }}
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed, ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { supabase } from '../../services/supabase'
  import { createOrder } from '../../services/orderService' // ✅ 引入订单服务
  
  const props = defineProps(['project', 'currentUser'])
  const emit = defineEmits(['refresh'])
  const router = useRouter()
  
  const itemList = ref([])
  const submitting = ref(false)
  
  // 解析 settings
  const settings = computed(() => {
    try { return typeof props.project.description === 'string' ? JSON.parse(props.project.description) : {} } 
    catch (e) { return {} }
  })
  
  // 权限与状态
  const isOwner = computed(() => props.currentUser?.id === props.project.uploader_id)
  const statusText = computed(() => props.project.status === 'active' ? '正在招募' : '已截团')
  
  // 规则文本 (复用逻辑)
  const logiText = computed(() => settings.value.logistics?.mode === 'weight' ? '按重量计费' : '按件数/固定')
  const cutText = computed(() => settings.value.rules?.cut_priority === 'deposit_first' ? '定金优先' : '先来后到')
  const bindText = computed(() => settings.value.rules?.bind_rule === 'price_balance' ? '金额配平' : '随机捆绑')
  
  onMounted(async () => {
    if (settings.value.items) {
      itemList.value = settings.value.items.map(i => ({...i, buyCount: 0}))
    }
  })
  
  const calcPrice = (jpy) => Math.ceil(jpy * (settings.value.exchange_rate || 0.055))
  const totalEstimate = computed(() => itemList.value.reduce((sum, item) => sum + (calcPrice(item.price) * (item.buyCount || 0)), 0))
  const getTagLabel = (type) => ({ hot: '🔥', cold: '❄️', hidden: '🕵️', bonus: '🎁' }[type] || '')
  
  const goToWorkbench = () => {
    router.push(`/group-buy-tool?id=${props.project.id}`)
  }
  
  // 🔥 核心下单逻辑
  const handleOrder = async () => {
    if (!props.currentUser) return alert('请先登录')
    
    const selected = itemList.value.filter(i => i.buyCount > 0)
    if (selected.length === 0) return
  
    const confirmMsg = `确认排单以下商品吗？\n\n${selected.map(o => `· ${o.name} x${o.buyCount}`).join('\n')}\n\n总计预估: ¥${totalEstimate.value}`
    if (!confirm(confirmMsg)) return
  
    submitting.value = true
    try {
      const payload = {
        project_id: props.project.id,
        user_id: props.currentUser.id,
        items: selected.map(i => ({ name: i.name, count: i.buyCount, price: calcPrice(i.price), type: i.type })),
        total_amount: totalEstimate.value,
        note: '用户自助排单'
      }
  
      await createOrder(payload)
      
      alert('✅ 排单成功！请等待团长确认。\n您可以联系团长加入群聊。')
      // 清空选择
      itemList.value.forEach(i => i.buyCount = 0)
      
    } catch (e) {
      alert('下单失败: ' + e.message)
    } finally {
      submitting.value = false
    }
  }
  </script>
  
  <style scoped>
  /* 保持原有样式，仅微调状态栏 */
  .gb-detail { padding-bottom: 80px; }
  .status-bar { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #eee; }
  .badge { background: #39C5BB; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 13px; margin-right: 10px; }
  .rate-tag { color: #666; font-size: 13px; font-family: monospace; }
  .btn-manage { background: #2c3e50; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; }
  .rule-card { background: #fff8e1; border: 1px solid #ffe0b2; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
  .card-header h3 { margin: 0 0 10px 0; font-size: 15px; color: #e65100; border-bottom: 1px dashed #ffe0b2; padding-bottom: 5px; }
  .rule-row { display: flex; font-size: 13px; margin-bottom: 5px; color: #5d4037; }
  .rule-row .label { width: 60px; font-weight: bold; color: #ef6c00; }
  .rule-desc { margin-top: 10px; font-size: 12px; color: #795548; line-height: 1.5; background: rgba(255,255,255,0.5); padding: 8px; border-radius: 4px; }
  .items-section h3 { font-size: 16px; margin-bottom: 10px; border-left: 4px solid #39C5BB; padding-left: 10px; }
  .items-list { display: flex; flex-direction: column; gap: 10px; }
  .item-row { display: flex; align-items: center; background: white; padding: 10px; border-radius: 8px; border: 1px solid #eee; }
  .item-row.disabled { opacity: 0.6; filter: grayscale(1); }
  .thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #eee; }
  .item-info { flex: 1; }
  .name { font-size: 14px; font-weight: bold; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; }
  .tag { font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: normal; }
  .tag.hot { background: #ffebee; color: #d32f2f; }
  .tag.cold { background: #e0f7fa; color: #006064; }
  .price .cny { color: #f57c00; font-weight: bold; font-size: 15px; margin-right: 5px; }
  .price .jpy { color: #999; font-size: 11px; }
  .qty-input { width: 50px; padding: 5px; text-align: center; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
  .footer-bar { position: fixed; bottom: 0; left: 0; width: 100%; background: white; border-top: 1px solid #eee; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); z-index: 100; }
  .total-info { display: flex; flex-direction: column; }
  .total-price { color: #f57c00; font-size: 20px; font-weight: bold; margin: 0 5px; }
  .note { font-size: 10px; color: #999; }
  .btn-order { background: #39C5BB; color: white; border: none; padding: 10px 30px; border-radius: 30px; font-weight: bold; font-size: 16px; cursor: pointer; }
  .btn-order:disabled { background: #ccc; cursor: not-allowed; }
  </style>