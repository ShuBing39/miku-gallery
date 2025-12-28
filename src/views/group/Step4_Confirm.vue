<template>
  <div class="step-content">
    <h3>🚀 第四步：最后确认</h3>
    <p class="sub-title">设置隐私权限并发布。</p>

    <div class="section">
      <div class="option-card" :class="{ active: data.mode === 'online' }" @click="selectMode('online')">
        <div class="icon">🌏</div>
        <div class="info">
          <h4>公开车队 (大厅可见)</h4>
          <p>进入【拼团大厅】，允许陌生人搜索和下单。适合拼团回血。</p>
        </div>
        <div class="check" v-if="data.mode === 'online'">✔</div>
      </div>

      <div class="option-card" :class="{ active: data.mode === 'solo' }" @click="selectMode('solo')">
        <div class="icon">🔒</div>
        <div class="info">
          <h4>私密 / 记账模式</h4>
          <p>不公开显示，仅生成链接发给群友，或单纯作为团长记账工具。</p>
        </div>
        <div class="check" v-if="data.mode === 'solo'">✔</div>
      </div>
    </div>

    <div class="section" v-if="data.mode === 'online'">
      <h4>📞 联系方式</h4>
      <div class="contact-row">
        <select v-model="data.contact.type" class="std-select mini">
          <option value="qq">QQ群</option>
          <option value="wechat">微信号</option>
        </select>
        <input v-model="data.contact.value" placeholder="请输入群号或微信号..." class="std-input">
      </div>
      <div class="checkbox-row">
        <label>
          <input type="checkbox" v-model="data.contact.visible" true-value="joined" false-value="public">
          仅对已上车(已付款)的成员可见
        </label>
      </div>
    </div>

    <div class="summary-box">
      <p><strong>商品数:</strong> {{ data.items.length }} 件</p>
      <p><strong>汇率:</strong> {{ data.exchange_rate }}</p>
      <p><strong>模式:</strong> {{ data.mode === 'online' ? '公开招募' : '私密/记账' }}</p>
      <p v-if="data.linked_item_id"><strong>🔗 关联Wiki:</strong> 已绑定 (ID: {{ data.linked_item_id }})</p>
    </div>

    <div class="footer-actions">
      <button class="btn-prev" @click="$emit('prev')">上一步</button>
      <button class="btn-submit" @click="submit" :disabled="submitting">
        {{ submitting ? '🚀 创建中...' : '✨ 确认并开车' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import { createProject } from '../../services/projectData' 
import { supabase } from '../../services/supabase'

const props = defineProps(['data'])
const emit = defineEmits(['prev'])
const router = useRouter()
const userStore = useUserStore()
const submitting = ref(false)

const selectMode = (mode) => {
props.data.mode = mode
props.data.visibility = mode === 'online' ? 'public' : 'private'
}

const submit = async () => {
if (props.data.mode === 'online' && !props.data.contact.value) {
    return alert('公开团必须填写联系方式')
}

submitting.value = true
try {
    const payload = {
      name: props.data.title || '未命名团购',
      description: '拼团数据', // 简短描述，具体数据存 JSON
      user_id: userStore.user.id,
      recruit_status: 'recruiting',
      allow_external: props.data.mode === 'online',
      image_url: props.data.items[0]?.image_url, 
      // ✅ 核心修改：使用 Step 1 传入的父集合 ID，如果没有则为空
      linked_item_id: props.data.linked_item_id || null, 
      status: 'active'
    }

    // 1. 创建基础记录
    const proj = await createProject(payload)

    // 2. 构造完整的 JSON 数据包
    // 🔴 关键：把 items, rules, logistics, contact 全部打包存入 description
    const fullDataPackage = {
        items: props.data.items,
        rules: props.data.rules,
        logistics: props.data.logistics,
        contact: props.data.contact,
        exchange_rate: props.data.exchange_rate,
        fees: props.data.fees,
        is_group_buy: true,
        // 保存Step2计算的期望
        total_pulls_plan: props.data.total_pulls_plan,
        calculated_fee: props.data.calculated_fee_per_item
    }

    // 3. 更新 description 为 JSON 字符串
    await supabase.from('projects')
        .update({ description: JSON.stringify(fullDataPackage) })
        .eq('id', proj.id)

    alert('🎉 开团成功！')
    
    // 🔴 路由跳转：去新的拼团详情页
    router.push(`/group-buy/${proj.id}`)

} catch (e) {
    console.error(e)
    alert('发布失败: ' + e.message)
} finally {
    submitting.value = false
}
}
</script>

<style scoped>
/* 保持原有样式 */
.step-content { padding: 10px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
.section { margin-bottom: 30px; }
h4 { margin-bottom: 15px; color: #555; }

.option-card { display: flex; align-items: center; padding: 15px; border: 2px solid #eee; border-radius: 12px; margin-bottom: 10px; cursor: pointer; transition: 0.2s; position: relative; }
.option-card:hover { border-color: #b2dfdb; }
.option-card.active { border-color: #39C5BB; background: #e0f2f1; }
.icon { font-size: 24px; margin-right: 15px; }
.info h4 { margin: 0 0 5px 0; color: #333; }
.info p { margin: 0; font-size: 12px; color: #666; }
.check { position: absolute; right: 15px; color: #39C5BB; font-weight: bold; font-size: 20px; }

.contact-row { display: flex; gap: 10px; margin-bottom: 10px; }
.std-select.mini { width: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; }
.std-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; outline: none; }
.checkbox-row { font-size: 13px; color: #666; }

.summary-box { background: #f5f5f5; padding: 20px; border-radius: 8px; font-size: 14px; color: #333; line-height: 1.8; }

.footer-actions { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 20px; }
.btn-prev { background: #eee; border: none; padding: 10px 25px; border-radius: 30px; cursor: pointer; color: #666; }
.btn-submit { background: #39C5BB; color: white; border: none; padding: 10px 40px; border-radius: 30px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(57,197,187,0.4); }
.btn-submit:disabled { background: #ccc; box-shadow: none; }
</style>