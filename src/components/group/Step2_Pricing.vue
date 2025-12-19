<template>
    <div class="step-content">
      <h3>💰 第二步：定价与调价规则</h3>
      <p class="sub-title">制定汇率、杂费及盲抽的“调价规则”。（此处为预估，最终以实际到货为准）</p>
  
      <div class="section-card">
        <div class="card-header">
            <h4>💱 汇率设置</h4>
        </div>
        <div class="form-row">
          <div class="col">
            <label>结算汇率 <span class="required">*</span></label>
            <div class="input-suffix-group large">
              <input v-model.number="data.exchange_rate" type="number" step="0.001" class="std-input" placeholder="0.055">
              <span class="suffix">JPY : CNY</span>
            </div>
          </div>
          <div class="col right-align">
            <div class="calc-preview">
              <span class="preview-label">1000 円 ≈ </span>
              <span class="preview-value">¥{{ (1000 * (data.exchange_rate || 0)).toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
  
      <div class="section-card">
        <div class="card-header">
            <h4>💸 杂费/车马费</h4>
            <div class="toggle-group">
                <button 
                    :class="{active: feeMode === 'per_item'}" 
                    @click="feeMode = 'per_item'"
                >按人头收 (每件+N元)</button>
                <button 
                    :class="{active: feeMode === 'split'}" 
                    @click="feeMode = 'split'"
                >总账均摊 (总费÷件数)</button>
            </div>
        </div>
        
        <div class="fee-container">
            <div class="fee-tip" v-if="feeMode === 'split'">
                💡 <strong>均摊模式：</strong> 请输入国内运费/车费总额，系统会自动除以总商品数。
            </div>
            <div class="fee-tip" v-else>
                💡 <strong>固定模式：</strong> 无论商品多少，每件商品直接加收固定金额。
            </div>

            <div v-for="(fee, index) in data.fees" :key="index" class="fee-row">
                <input v-model="fee.name" placeholder="费用名 (如: 国内运费)" class="std-input name-input">
                <div class="input-suffix-group small-group">
                    <input v-model.number="fee.amount" type="number" placeholder="0" class="std-input amount-input">
                    <span class="suffix">CNY</span>
                </div>
                <button @click="removeFee(index)" class="btn-del">✕</button>
            </div>
            
            <div class="fee-actions">
                <button @click="addFee" class="btn-add-fee">+ 添加费用</button>
                <div class="fee-total">
                    <span v-if="feeMode==='split'">预计单件均摊: </span>
                    <span v-else>单件固定加收: </span>
                    <span class="highlight-fee">+ ¥{{ feePerItem.toFixed(2) }}</span>
                </div>
            </div>
        </div>
      </div>

      <div class="section-card blind-card" v-if="hasBlindBox">
        <div class="card-header">
            <h4>⚖️ 盲抽计划 & 调价规则</h4>
            <span class="sub-text">请设定“单盒模型”，以此制定热款加价/冷款减价规则。</span>
        </div>

        <div class="plan-row">
            <div class="plan-item">
                <label>📦 官方抱盒规格</label>
                <div class="input-suffix-group small-group">
                    <input v-model.number="data.box_spec" type="number" class="std-input" placeholder="10">
                    <span class="suffix">发/盒</span>
                </div>
            </div>
            <div class="plan-item">
                <label>🎯 期望开团数量</label>
                <div class="input-suffix-group small-group">
                    <input v-model.number="data.target_box_count" type="number" class="std-input" placeholder="5">
                    <span class="suffix">盒</span>
                </div>
            </div>
            <div class="plan-summary">
                预计总抽数: <strong>{{ totalPulls }} 发</strong>
            </div>
        </div>

        <div class="table-wrapper">
            <table class="adjust-table">
                <thead>
                    <tr>
                        <th>款式</th>
                        <th width="90">原价(CNY)</th>
                        <th width="100" title="官方的一盒里通常有几个?">单盒配比</th>
                        <th width="110">调价规则</th>
                        <th>定价预览</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, idx) in data.items" :key="item.id">
                        <td class="td-name">
                            <span class="type-dot" :class="item.type"></span>
                            {{ item.name }}
                        </td>
                        <td class="td-base">¥{{ calculateBaseCNY(item.price) }}</td>
                        <td>
                            <div v-if="item.is_blind_box" class="ratio-input-box">
                                <input v-model.number="item.count_in_box" class="tiny-input" placeholder="1">
                            </div>
                            <span v-else class="locked-val">-</span>
                        </td>
                        <td>
                            <input 
                                v-model.number="item.adjust_price" 
                                type="number" 
                                class="tiny-input adjust-input" 
                                :class="{
                                    'positive': item.adjust_price > 0, 
                                    'negative': item.adjust_price < 0
                                }"
                                placeholder="0"
                            >
                        </td>
                        <td class="td-final">
                            ¥ {{ calculateFinalPrice(item) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="balance-check" :class="{'balanced': boxBalance >= 0, 'loss': boxBalance < 0}">
            <div class="balance-info">
                <strong>理论单盒模拟:</strong>
                <span>若按配比开出一整盒，团长收支为:</span>
            </div>
            <div class="balance-result">
                <span v-if="boxBalance === 0" style="color:#2e7d32">✅ 完美配平 (±0)</span>
                <span v-else-if="boxBalance > 0" style="color:#2e7d32">💰 理论盈余: +¥{{ boxBalance }} /盒</span>
                <span v-else style="color:#c62828">⚠️ 理论亏本: -¥{{ Math.abs(boxBalance) }} /盒 (请给热款加价)</span>
            </div>
        </div>
        <p class="hint-small">注：此为基于官方配比的理论计算。实际开团可能出现配比不均(隐藏款/随机数)，届时需按“多退少补”或Step3的规则处理。</p>
      </div>
  
      <div class="section-card preview-card">
        <div class="card-header"><h4>👀 最终定价预览</h4></div>
        <div class="final-list">
            <div v-for="item in data.items" :key="item.name" class="final-item">
                <span class="f-name">{{ item.name }}</span>
                <span class="f-price">¥{{ calculateFinalPrice(item) }}</span>
            </div>
        </div>
      </div>
  
      <div class="footer-actions">
        <button class="btn-prev" @click="$emit('prev')">上一步</button>
        <button class="btn-next" @click="validateAndNext">下一步: 规则 ➔</button>
      </div>
    </div>
</template>
  
<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps(['data'])
const emit = defineEmits(['next', 'prev'])

const feeMode = ref('per_item') 

// 初始化数据
onMounted(() => {
    if (!props.data.items) props.data.items = []
    if (!props.data.box_spec) props.data.box_spec = 10 // 默认一盒10发
    if (!props.data.target_box_count) props.data.target_box_count = 1 // 默认开1盒
    
    props.data.items.forEach(item => {
        if (item.adjust_price === undefined) item.adjust_price = 0
        if (item.count_in_box === undefined) item.count_in_box = 1
    })
})

const hasBlindBox = computed(() => props.data.items.some(i => i.is_blind_box))

// 计算总抽数 (期望)
const totalPulls = computed(() => (props.data.box_spec || 0) * (props.data.target_box_count || 0))

// 杂费逻辑
const rawTotalFees = computed(() => {
    if (!props.data.fees) return 0
    return props.data.fees.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0)
})

const feePerItem = computed(() => {
    const total = rawTotalFees.value
    if (total === 0) return 0
    
    if (feeMode.value === 'split') {
        // 均摊模式：总费 ÷ (一盒规格 × 盒数)  或者 ÷ (明窗商品数)
        // 这里需要注意：如果是盲抽团，分母应该是“预计总抽数”
        const denominator = hasBlindBox.value ? totalPulls.value : props.data.items.length
        return denominator > 0 ? (total / denominator) : 0
    } else {
        // 固定模式：直接加
        return total
    }
})

// 价格计算
const calculateBaseCNY = (jpy) => {
    const base = jpy * (props.data.exchange_rate || 0)
    return Math.ceil(base + feePerItem.value)
}

const calculateFinalPrice = (item) => {
    const base = calculateBaseCNY(item.price)
    const adjust = Number(item.adjust_price) || 0
    return base + adjust
}

// ⚖️ 单盒理论平衡
const boxBalance = computed(() => {
    let boxRevenue = 0 // 整盒按定价卖能收多少钱
    let boxCost = 0    // 整盒原价成本是多少

    props.data.items.forEach(item => {
        // 只有盲抽商品参与整盒配平计算
        if (item.is_blind_box) {
            const count = item.count_in_box || 1 // 一盒里有几个这个角色
            boxRevenue += calculateFinalPrice(item) * count
            boxCost += calculateBaseCNY(item.price) * count
        }
    })
    
    // 如果没有盲抽商品，不需要平衡
    if (boxCost === 0) return 0
    
    return Math.round(boxRevenue - boxCost)
})

const addFee = () => {
    if (!props.data.fees) props.data.fees = []
    props.data.fees.push({ name: '', amount: '' })
}
const removeFee = (idx) => props.data.fees.splice(idx, 1)

const validateAndNext = () => {
    if (!props.data.exchange_rate) return alert('请填写汇率')
    // 存一下计算结果，方便后续页面展示
    props.data.calculated_fee_per_item = feePerItem.value
    props.data.total_pulls_plan = totalPulls.value
    emit('next')
}
</script>
  
<style scoped>
/* 保持一致的现代风格 */
.step-content { padding: 10px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #333; }
h3 { margin: 0 0 8px 0; color: #333; font-size: 22px; font-weight: 700; }
.sub-title { color: #888; font-size: 14px; margin-bottom: 25px; }

.section-card { background: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #eef2f5; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #f5f5f5; }
.card-header h4 { margin: 0; font-size: 16px; color: #2c3e50; border-left: 4px solid #39C5BB; padding-left: 10px; }

/* 模式切换按钮 */
.toggle-group { display: flex; background: #f0f2f5; border-radius: 6px; padding: 3px; }
.toggle-group button { border: none; background: transparent; padding: 6px 14px; font-size: 12px; cursor: pointer; border-radius: 4px; color: #666; transition: 0.2s; }
.toggle-group button.active { background: white; color: #39C5BB; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.fee-tip { font-size: 12px; color: #555; background: #e3f2fd; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 3px solid #2196f3; }

/* 盲抽计划区域 */
.blind-card { border: 2px solid #f3e5f5; background: #fbf8fc; }
.blind-card .card-header h4 { border-color: #ab47bc; color: #7b1fa2; }

.plan-row { display: flex; gap: 20px; margin-bottom: 20px; align-items: flex-end; background: white; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
.plan-item { display: flex; flex-direction: column; gap: 5px; }
.plan-summary { margin-left: auto; font-size: 14px; color: #555; padding-bottom: 8px; }

.adjust-table { width: 100%; font-size: 13px; border-collapse: collapse; }
.adjust-table th { text-align: left; color: #888; padding: 10px; border-bottom: 1px solid #eee; }
.adjust-table td { padding: 10px; border-bottom: 1px solid #f9f9f9; vertical-align: middle; }

.type-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; background: #ccc; }
.type-dot.hot { background: #f44336; }
.type-dot.cold { background: #00bcd4; }

.tiny-input { width: 60px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; text-align: center; font-weight: bold; }
.adjust-input.positive { border-color: #f44336; color: #f44336; background: #fffafa; }
.adjust-input.negative { border-color: #00bcd4; color: #00bcd4; background: #f0fdff; }

.balance-check { margin-top: 20px; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; background: white; border: 1px dashed #ccc; }
.balance-check.balanced { border-color: #c8e6c9; background: #e8f5e9; }
.balance-check.loss { border-color: #ffcdd2; background: #ffebee; }
.hint-small { font-size: 11px; color: #999; margin-top: 10px; }

/* 通用样式 */
.form-row { display: flex; gap: 30px; margin-bottom: 15px; }
.col { flex: 1; }
label { display: block; font-weight: bold; margin-bottom: 8px; font-size: 13px; color: #555; }
.input-suffix-group { display: flex; align-items: center; border: 1px solid #ddd; border-radius: 8px; background: white; overflow: hidden; }
.std-input { flex: 1; padding: 10px; border: none; outline: none; }
.suffix { background: #f5f5f5; padding: 0 12px; color: #666; font-size: 12px; border-left: 1px solid #eee; display: flex; align-items: center; height: 100%; }
.calc-preview { background: #e0f2f1; padding: 15px; border-radius: 8px; text-align: center; color: #00695c; font-weight: bold; font-size: 20px; }

.fee-row { display: flex; gap: 10px; margin-bottom: 10px; }
.name-input { flex: 2; border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
.btn-del { border: none; background: #ffebee; color: #f44336; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; }
.fee-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
.btn-add-fee { border: 1px dashed #39C5BB; color: #39C5BB; background: white; padding: 6px 15px; border-radius: 4px; cursor: pointer; }
.highlight-fee { color: #f57c00; font-weight: bold; font-size: 16px; }

.final-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.final-item { background: #f9f9f9; padding: 10px; border-radius: 6px; font-size: 13px; display: flex; justify-content: space-between; border: 1px solid #eee; }
.f-price { font-weight: bold; color: #f57c00; }

.footer-actions { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 20px; }
.btn-prev { background: #eee; border: none; padding: 10px 25px; border-radius: 30px; cursor: pointer; }
.btn-next { background: #39C5BB; color: white; border: none; padding: 10px 30px; border-radius: 30px; font-weight: bold; cursor: pointer; }
</style>