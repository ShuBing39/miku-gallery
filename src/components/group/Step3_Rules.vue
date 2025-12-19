<template>
    <div class="step-content">
      <h3>⚖️ 第三步：规则立约</h3>
      <p class="sub-title">配置核心玩法，系统将自动生成“买家须知”。</p>
  
      <div class="rule-section">
        <h4>📦 物流与运费</h4>
        
        <div class="form-row">
          <label>物流方式 <span style="color:red">*</span></label>
          <select v-model="data.logistics.method" class="std-select">
            <option value="ems">🚀 EMS (最快/最贵)</option>
            <option value="air">✈️ 航空便/空运 (较快)</option>
            <option value="sea">🚢 船运/海运 (慢/便宜)</option>
            <option value="human">🧳 人肉带回 (团长自背)</option>
          </select>
        </div>

        <div v-if="data.logistics.method === 'human'" class="sub-config-box">
             <div class="form-row small-row">
                <label>航班号/回国日期</label>
                <input v-model="data.logistics.flight_info" placeholder="如: NH961 12月25日" class="std-input">
             </div>
             <p class="tiny-tip">💡 公示航班信息可以让买家更放心。</p>
        </div>

        <div class="form-row">
          <label>分摊模式</label>
          <select v-model="data.logistics.mode" class="std-select">
            <option value="weight">⚖️ 按重量 (元/kg)</option>
            <option value="count">📦 按件数 (元/个)</option>
          </select>
        </div>

        <div class="form-row">
          <label>预计单价</label>
          <div class="input-group-col">
              <div class="input-suffix">
                <input 
                  v-model.number="data.logistics.price" 
                  type="number" 
                  :placeholder="pricePlaceholder"
                  class="std-input"
                >
                <span class="suffix">{{ unitText }}</span>
              </div>
              <div class="price-ref" v-if="data.logistics.mode === 'weight'">
                 💡 {{ priceReference }}
              </div>
          </div>
        </div>
      </div>
  
      <div class="rule-section">
        <h4>🧮 配货算法 (必选)</h4>
        
        <div class="config-item">
          <label>⚡ 缺货/砍单优先级</label>
          <select v-model="data.rules.cut_priority" class="std-select">
            <option value="time_asc">⏰ 先来后到 (按排单时间)</option>
            <option value="deposit_first">💰 定金优先 (谁先付钱给谁)</option>
            <option value="allin_first">👑 Allin/包盒优先</option>
          </select>
        </div>
  
        <div class="config-item">
          <label>🧶 捆绑/调价策略</label>
          <select v-model="data.rules.bind_rule" class="std-select">
            <option value="random_bind">⚖️ 热门配比模式 (捆绑)</option>
            <option value="price_balance">💰 金额配平 (热门涨价/冷门降价)</option>
            <option value="manual">🤚 团长手动分配</option>
          </select>
        </div>
        
        <div v-if="data.rules.bind_rule === 'random_bind'" class="sub-config-box">
            <div class="form-row small-row">
                <label>设置配比 (1热门 捆 ?冷门)</label>
                <div class="input-suffix-group">
                    <span class="prefix">1 :</span>
                    <input v-model.number="data.rules.bundle_count" type="number" min="1" max="5" class="tiny-input">
                </div>
            </div>
            <p class="tiny-tip">💡 提示：圈内惯例通常为 <strong>一捆一</strong> 或 <strong>一捆二</strong>。</p>
        </div>
  
        <div class="config-item">
          <label>🎁 特典分配模式</label>
          <select v-model="data.rules.bonus_rule" class="std-select">
            <option value="pool_split">🍰 全团堆叠平分 (余量变现抵运费)</option>
            <option value="individual">👤 个人独享 (按个人金额算)</option>
            <option value="auction">🔨 竞价/拍卖</option>
          </select>
        </div>
      </div>
  
      <div class="translator-box">
        <h4>📢 自动生成的买家须知 (预览)</h4>
        <div class="preview-text">
          <p>1. <strong>关于缺货</strong>：本团将优先保障 <span class="highlight">{{ cutText }}</span> 的团员。</p>
          <p>2. <strong>关于捆物</strong>：采用 <span class="highlight">{{ bindText }}</span> 模式，{{ bindDesc }}</p>
          <p>3. <strong>国际物流</strong>：采用 <span class="highlight">{{ methodText }}</span> 方式回国，{{ logiText }}。</p>
          <p v-if="data.logistics.method === 'human' && data.logistics.flight_info">
             ✈️ <strong>航班信息</strong>：{{ data.logistics.flight_info }}
          </p>
        </div>
      </div>
  
      <div class="footer-actions">
        <button class="btn-prev" @click="$emit('prev')">上一步</button>
        <button class="btn-next" @click="$emit('next')">下一步: 确认发布 ➔</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed, onMounted } from 'vue'
  
  const props = defineProps(['data'])
  defineEmits(['next', 'prev'])

  onMounted(() => {
    // 初始化默认值
    if (!props.data.rules.bundle_count) props.data.rules.bundle_count = 1
    if (!props.data.logistics.mode) props.data.logistics.mode = 'weight'
    if (!props.data.logistics.method) props.data.logistics.method = 'air' // 默认空运
  })

  // 辅助计算
  const unitText = computed(() => props.data.logistics.mode === 'weight' ? '元/kg' : '元/个')
  
  // 🔴 智能价格参考逻辑 (新手引导核心)
  const priceReference = computed(() => {
    const method = props.data.logistics.method
    // 以下价格仅供参考，可根据实际行情调整
    if (method === 'sea') return '船运参考价：约 15 ~ 25 元/kg'
    if (method === 'air') return '空运参考价：约 40 ~ 60 元/kg'
    if (method === 'ems') return 'EMS参考价：约 60 ~ 85 元/kg'
    if (method === 'human') return '人肉参考价：通常较贵或按汇率差抵扣'
    return ''
  })

  const pricePlaceholder = computed(() => {
      if (props.data.logistics.mode === 'weight') return '填入估价'
      return '如 5'
  })
  
  // 翻译逻辑
  const cutText = computed(() => {
    const map = { time_asc: '【排单时间早】', deposit_first: '【已付定金】', allin_first: '【Allin包团】' }
    return map[props.data.rules.cut_priority]
  })
  
  const bindText = computed(() => {
    const map = { random_bind: '热门配比', price_balance: '金额配平', manual: '手动分配' }
    return map[props.data.rules.bind_rule]
  })
  
  const bindDesc = computed(() => {
    if (props.data.rules.bind_rule === 'random_bind') {
        const count = props.data.rules.bundle_count || 1
        return `买家每购买 1 个热门角色，需同时认领 ${count} 个调价/冷门角色。`
    }
    if (props.data.rules.bind_rule === 'price_balance') return '热门角色价格已含调价费，无需额外捆绑。'
    return '具体分配由团长根据实际情况决定。'
  })
  
  const bonusText = computed(() => {
    const map = { pool_split: '由全团平分或变现抵扣运费', individual: '按个人消费金额严格分配', auction: '进行团内竞价' }
    return map[props.data.rules.bonus_rule]
  })
  
  // 🔴 物流文案更新
  const methodText = computed(() => {
      const map = { ems: 'EMS直邮', air: '航空便', sea: '船运', human: '人肉带回' }
      return map[props.data.logistics.method] || '未知方式'
  })

  const logiText = computed(() => {
    if (props.data.logistics.mode === 'weight') {
        return `预计按重量分摊 (${props.data.logistics.price || 0}元/kg)`
    } else {
        return `预计按件数分摊 (${props.data.logistics.price || 0}元/个)`
    }
  })
  </script>
  
  <style scoped>
  .step-content { padding: 10px; }
  .rule-section { margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px dashed #eee; }
  h4 { margin: 0 0 15px 0; color: #555; font-size: 15px; }
  
  .form-row, .config-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-wrap: wrap; }
  .std-select, .std-input { width: 100%; padding: 8px; border: none; background: transparent; outline: none; }
  
  /* 输入框布局优化 */
  .input-group-col { width: 60%; display: flex; flex-direction: column; }
  .input-suffix { display: flex; align-items: center; border: 1px solid #ddd; border-radius: 6px; background: white; overflow: hidden; width: 100%; }
  .suffix { background: #f5f5f5; color: #666; padding: 8px 10px; font-size: 12px; border-left: 1px solid #eee; white-space: nowrap; }
  .std-select { border: 1px solid #ddd; border-radius: 6px; width: 60%; background: white; }
  
  /* 价格参考提示 */
  .price-ref { font-size: 12px; color: #e65100; margin-top: 5px; background: #fff3e0; padding: 4px 8px; border-radius: 4px; display: inline-block; }

  /* 小字提示 */
  .tiny-tip { font-size: 12px; color: #888; background: #f0fdfc; padding: 8px; border-radius: 4px; width: 100%; margin-top: -10px; margin-bottom: 15px; line-height: 1.5; border: 1px solid #ccfbf1; }
  
  /* 子设置框 */
  .sub-config-box { background: #f9f9f9; padding: 10px 15px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #eee; margin-left: 10px; width: 100%; box-sizing: border-box; }
  .small-row { margin-bottom: 5px; justify-content: flex-start; gap: 10px; }
  .small-row label { font-size: 14px; font-weight: bold; color: #555; }
  .input-suffix-group { display: flex; align-items: center; gap: 5px; }
  .prefix { font-weight: bold; color: #e65100; }
  .tiny-input { width: 50px; text-align: center; padding: 5px; border: 1px solid #ccc; border-radius: 4px; font-weight: bold; }
  
  .translator-box { background: #fff8e1; border: 1px solid #ffe0b2; padding: 20px; border-radius: 8px; margin-top: 20px; }
  .preview-text p { margin: 5px 0; font-size: 14px; color: #5d4037; }
  .highlight { color: #e65100; font-weight: bold; background: rgba(255,255,255,0.5); padding: 0 4px; border-radius: 4px; }
  
  .footer-actions { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 20px; }
  .btn-prev { background: #eee; border: none; padding: 10px 25px; border-radius: 30px; cursor: pointer; color: #666; }
  .btn-next { background: #39C5BB; color: white; border: none; padding: 10px 30px; border-radius: 30px; font-weight: bold; cursor: pointer; }
  </style>