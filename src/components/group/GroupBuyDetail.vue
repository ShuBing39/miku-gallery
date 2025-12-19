<template>
    <div class="gb-container">
      <div v-if="loading" class="loading-box">
        <div class="spinner"></div>
        <p>正在读取车队信息...</p>
      </div>
      <div v-else-if="!detail" class="error-box">⚠️ 数据加载失败，请重试</div>
      
      <div v-else class="gb-layout">
        <div class="main-col">
          <div class="gb-header">
              <div class="header-top">
                  <span class="tag-status">🟢 正在招募</span>
                  <span class="tag-type" v-if="isBlindBox">🎲 盲抽/抱盒团</span>
                  <span class="tag-type" v-else>🛍️ 直售/选购团</span>
              </div>
              <h1 class="title">{{ detail.name }}</h1>
              <div class="author-bar">
                  <img :src="detail.profiles?.avatar_url || 'https://placehold.co/50'" class="avatar">
                  <div class="author-info">
                      <div class="name">{{ detail.profiles?.username || '未知团长' }}</div>
                      <div class="time">发布于 {{ formatDate(detail.created_at) }}</div>
                  </div>
              </div>
          </div>
  
          <div class="section-box" v-if="isBlindBox">
              <div class="box-title">
                  <h3>⚖️ 调价与配比公示</h3>
                  <span class="sub">基于单盒模型的调价规则</span>
              </div>
              <div class="blind-table-wrapper">
                  <table class="blind-table">
                      <thead>
                          <tr>
                              <th>角色/款式</th>
                              <th>盒内配比</th>
                              <th>基础价</th>
                              <th>调价</th>
                              <th>最终定价</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr v-for="item in items" :key="item.id">
                              <td class="fw-bold">{{ item.name }}</td>
                              <td>{{ item.count_in_box || 1 }}</td>
                              <td class="text-gray">¥{{ calculateBase(item.price) }}</td>
                              <td :class="getAdjustClass(item.adjust_price)">
                                  {{ formatAdjust(item.adjust_price) }}
                              </td>
                              <td class="price-final">¥{{ calculateFinal(item) }}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>
  
          <div class="section-box">
              <div class="box-title">
                  <h3>📦 选购车位</h3>
                  <span class="sub">共 {{ items.length }} 款商品</span>
              </div>
              
              <div class="goods-grid">
                  <div v-for="item in items" :key="item.id" class="goods-card">
                      <div class="img-box">
                          <img :src="item.image_url" loading="lazy">
                          <span class="badge-hot" v-if="item.type === 'hot'">热门</span>
                      </div>
                      <div class="info-box">
                          <h4>{{ item.name }}</h4>
                          <div class="price-row">
                              <span class="cny">¥ <span class="big">{{ calculateFinal(item) }}</span></span>
                              <span class="jpy">{{ item.price }}円</span>
                          </div>
                          <div class="tags">
                              <span class="tag" v-if="item.type==='cold'">需捆绑</span>
                              <span class="tag" v-if="item.is_blind_box">盲抽</span>
                          </div>
                          <button class="btn-pick" :disabled="item.type === 'cold'">
                              {{ item.type === 'cold' ? '配货中' : '排队' }}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
        </div>
  
        <div class="side-col">
          <div class="side-card price-card">
              <div class="card-head">💰 定价公式</div>
              <div class="formula-row">
                  <span>当前汇率</span>
                  <span class="val">{{ settings.exchange_rate }}</span>
              </div>
              <div class="formula-row">
                  <span>杂费/车马</span>
                  <span class="val">+ ¥{{ settings.calculated_fee ? settings.calculated_fee.toFixed(2) : 0 }} /个</span>
              </div>
              <div class="divider"></div>
              <div class="total-row">
                  <span>计算方式</span>
                  <span class="formula">(日元 × 汇率) + 杂费 + 调价</span>
              </div>
          </div>
  
          <div class="side-card">
              <div class="card-head">📜 拼团规则</div>
              <ul class="rule-list">
                  <li>
                      <span class="label">物流方式</span>
                      <span class="val">{{ getLogisticsText(rules.logistics) }}</span>
                  </li>
                  <li v-if="rules.logistics?.flight_info">
                      <span class="label">航班信息</span>
                      <span class="val">{{ rules.logistics.flight_info }}</span>
                  </li>
                  <li>
                      <span class="label">运费分摊</span>
                      <span class="val">{{ rules.logistics?.mode === 'weight' ? '按重量计费' : '按件数均摊' }}</span>
                  </li>
                  <li>
                      <span class="label">配货/捆绑</span>
                      <span class="val">{{ getBindText(rules.bind_rule) }}</span>
                  </li>
                  <li v-if="rules.bind_rule === 'random_bind'" class="highlight-li">
                      <span class="label">配比</span>
                      <span class="val">1热门 捆 {{ rules.bundle_count }}冷门</span>
                  </li>
              </ul>
          </div>
  
          <div class="side-card contact-card">
              <div class="card-head">📞 联系团长</div>
              <div class="contact-box">
                  <div class="c-type">{{ contact.type === 'qq' ? 'QQ群/号' : '微信号' }}</div>
                  <div class="c-val" @click="copy(contact.value)">
                      {{ contact.value }} 📋
                  </div>
              </div>
              <div class="safe-tip">⚠️ 定金通常不退，请谨慎上车。</div>
          </div>
          
          <button class="btn-join-main">🙋‍♂️ 申请上车</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { supabase } from '../../services/supabase'
  
  const route = useRoute()
  const detail = ref(null)
  const loading = ref(true)
  
  const items = ref([])
  const rules = ref({})
  const contact = ref({})
  const settings = ref({})
  
  const isBlindBox = computed(() => items.value.some(i => i.is_blind_box))
  
  onMounted(async () => {
    const id = route.params.id
    if(!id) return
  
    // 1. 查企划
    const { data: projectData, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
  
    if (pError) {
        console.error('加载企划失败:', pError)
        loading.value = false
        return
    }
  
    if (projectData) {
      projectData.profiles = { username: '未知用户', avatar_url: '' }
  
      // 2. 查团长 (✅ 修正：查 username)
      if (projectData.uploader_id) {
          try {
              const { data: userData, error: uError } = await supabase
                  .from('profiles')
                  .select('username, avatar_url') // 👈 改成了 username
                  .eq('id', projectData.uploader_id)
                  .single()
              
              if (!uError && userData) {
                  projectData.profiles = userData
              }
          } catch(err) {
              console.warn('团长信息获取失败(已忽略):', err)
          }
      }
  
      detail.value = projectData
      
      // 解析 description JSON
      try {
          let content = projectData.description
          if (typeof content === 'string') content = JSON.parse(content)
          
          items.value = content.items || []
          rules.value = content.rules || {}
          contact.value = content.contact || {}
          
          settings.value = {
              exchange_rate: content.exchange_rate,
              calculated_fee: content.calculated_fee,
              fees: content.fees
          }
      } catch (e) {
          console.error('JSON解析失败', e)
      }
    }
    loading.value = false
  })
  
  // 计算逻辑
  const calculateBase = (jpy) => {
      const rate = settings.value.exchange_rate || 0.055
      const fee = settings.value.calculated_fee || 0
      return Math.ceil((jpy * rate) + fee)
  }
  
  const calculateFinal = (item) => {
      const base = calculateBase(item.price)
      const adjust = Number(item.adjust_price) || 0
      return base + adjust
  }
  
  const formatDate = (s) => new Date(s).toLocaleDateString()
  const formatAdjust = (val) => val > 0 ? `+${val}` : (val < 0 ? `${val}` : '-')
  const getAdjustClass = (val) => val > 0 ? 'text-red' : (val < 0 ? 'text-blue' : 'text-gray')
  
  const getLogisticsText = (log) => {
      if (!log) return '未定'
      const map = { ems: 'EMS直邮', air: '航空便', sea: '船运', human: '人肉带回' }
      return map[log.method] || log.method
  }
  
  const getBindText = (val) => {
      const map = { random_bind: '热门配比(硬捆)', price_balance: '金额配平', manual: '手动分配' }
      return map[val] || val
  }
  
  const copy = (txt) => {
      navigator.clipboard.writeText(txt)
      alert('已复制')
  }
  </script>
  
  <style scoped>
  .gb-container { background: #f0f2f5; min-height: 100vh; font-family: -apple-system, sans-serif; padding: 20px; color: #333; }
  .gb-layout { max-width: 1100px; margin: 0 auto; display: flex; gap: 20px; align-items: flex-start; }
  
  .main-col { flex: 1; min-width: 0; }
  .side-col { width: 320px; position: sticky; top: 20px; display: flex; flex-direction: column; gap: 15px; }
  
  .gb-header { background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
  .header-top { display: flex; gap: 10px; margin-bottom: 10px; }
  .tag-status { background: #e8f5e9; color: #2e7d32; font-weight: bold; font-size: 12px; padding: 2px 8px; border-radius: 4px; }
  .tag-type { background: #f3e5f5; color: #7b1fa2; font-weight: bold; font-size: 12px; padding: 2px 8px; border-radius: 4px; }
  .title { font-size: 24px; margin: 0 0 15px 0; line-height: 1.3; }
  .author-bar { display: flex; align-items: center; gap: 12px; padding-top: 15px; border-top: 1px solid #f5f5f5; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; }
  .name { font-weight: bold; font-size: 14px; }
  .time { font-size: 12px; color: #999; }
  
  .section-box { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
  .box-title { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 15px; border-bottom: 1px solid #f5f5f5; padding-bottom: 10px; }
  .box-title h3 { margin: 0; font-size: 16px; border-left: 4px solid #39C5BB; padding-left: 10px; }
  .box-title .sub { font-size: 12px; color: #999; }
  
  .blind-table { width: 100%; font-size: 13px; border-collapse: collapse; }
  .blind-table th { text-align: left; color: #999; padding: 8px; font-weight: normal; border-bottom: 1px solid #eee; }
  .blind-table td { padding: 10px 8px; border-bottom: 1px solid #f9f9f9; }
  .text-red { color: #f44336; font-weight: bold; }
  .text-blue { color: #2196f3; font-weight: bold; }
  .text-gray { color: #ccc; }
  .price-final { font-weight: bold; color: #f57c00; font-size: 15px; }
  
  .goods-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
  .goods-card { border: 1px solid #eee; border-radius: 8px; overflow: hidden; transition: 0.2s; }
  .goods-card:hover { border-color: #39C5BB; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .img-box { height: 140px; background: #f9f9f9; position: relative; }
  .img-box img { width: 100%; height: 100%; object-fit: cover; }
  .badge-hot { position: absolute; top: 0; left: 0; background: #f44336; color: white; font-size: 10px; padding: 2px 6px; border-bottom-right-radius: 6px; }
  
  .info-box { padding: 12px; }
  .info-box h4 { margin: 0 0 8px 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
  .cny { color: #f57c00; font-weight: bold; font-size: 12px; }
  .cny .big { font-size: 18px; }
  .jpy { color: #ccc; font-size: 12px; text-decoration: line-through; }
  .tags { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
  .tag { background: #f0f0f0; color: #666; font-size: 10px; padding: 2px 4px; border-radius: 4px; }
  .btn-pick { width: 100%; border: 1px solid #39C5BB; background: white; color: #39C5BB; padding: 6px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
  .btn-pick:hover:not(:disabled) { background: #39C5BB; color: white; }
  .btn-pick:disabled { border-color: #eee; color: #ccc; cursor: not-allowed; }
  
  .side-card { background: white; border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
  .card-head { font-weight: bold; font-size: 14px; margin-bottom: 12px; color: #444; }
  .formula-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: #666; }
  .formula-row .val { font-weight: bold; color: #333; }
  .divider { height: 1px; background: #eee; margin: 10px 0; }
  .total-row { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
  
  .rule-list { list-style: none; padding: 0; margin: 0; }
  .rule-list li { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; }
  .rule-list .label { color: #999; }
  .rule-list .val { font-weight: 500; text-align: right; max-width: 150px; }
  .highlight-li { background: #ffebee; padding: 5px; border-radius: 4px; color: #c62828; }
  
  .contact-box { background: #f8f9fa; padding: 10px; border-radius: 6px; text-align: center; cursor: pointer; border: 1px dashed #ddd; }
  .contact-box:hover { border-color: #39C5BB; color: #39C5BB; }
  .c-type { font-size: 12px; color: #999; margin-bottom: 4px; }
  .c-val { font-weight: bold; font-size: 16px; }
  .safe-tip { margin-top: 10px; font-size: 11px; color: #f57c00; text-align: center; }
  
  .btn-join-main { width: 100%; background: #39C5BB; color: white; border: none; padding: 12px; border-radius: 30px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(57,197,187,0.3); transition: 0.2s; }
  .btn-join-main:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(57,197,187,0.4); }
  
  .loading-box, .error-box { padding: 50px; text-align: center; color: #999; }
  .spinner { width: 30px; height: 30px; border: 3px solid #eee; border-top-color: #39C5BB; border-radius: 50%; margin: 0 auto 10px; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  </style>