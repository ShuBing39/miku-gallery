<template>
  <div class="ticket-container">
    <button class="back-home-btn" @click="$router.push('/')">⬅ 返回首页</button>

    <div class="ticket-header">
      <h1>🎫 葱葱票务中心</h1>
      <p>初音未来演出门票专属转让/交换平台 (仅限面交)</p>
      
      <div class="verify-status-bar">
        <div v-if="verificationStatus === 'approved'" class="v-tag green">✅ 购票资质已认证</div>
        <div v-else-if="verificationStatus === 'pending'" class="v-tag orange">⏳ 资质审核中</div>
        <div v-else class="v-tag gray" @click="showVerifyModal = true">⚠️ 未认证 (点击上传旅行证明以购票)</div>
      </div>
    </div>

    <div class="nav-tabs">
      <button :class="{ active: currentTab === 'market' }" @click="currentTab = 'market'">🛒 购票大厅</button>
      <button :class="{ active: currentTab === 'sell' }" @click="currentTab = 'sell'">📤我要出票</button>
      <button :class="{ active: currentTab === 'swap' }" @click="currentTab = 'swap'">🔄 门票交换</button>
      <button :class="{ active: currentTab === 'mine' }" @click="currentTab = 'mine'">👤 我的记录</button>
    </div>

    <div v-if="currentTab === 'market'" class="tab-content">
      <div class="filter-bar">
        <select v-model="filterEvent"><option value="">全部演出</option><option>魔法未来2024</option><option>MIKU EXPO</option></select>
        <select v-model="filterType"><option value="">全部席位</option><option>SS席</option><option>S席</option><option>海外席</option></select>
        <button @click="fetchTickets" class="refresh-btn">🔄 刷新</button>
      </div>

      <div class="ticket-grid">
        <div v-for="t in tickets" :key="t.id" class="ticket-card">
          <div class="t-left">
            <div class="t-code">ID: {{ t.ticket_code }}</div>
            <h3 class="t-event">{{ t.event_name }}</h3>
            <div class="t-date">📅 {{ formatDate(t.concert_date) }}</div>
            <div class="t-tags">
              <span class="sku-tag">{{ t.seat_type }}</span>
              <span v-if="t.has_exhibition" class="feat-tag">含企划展</span>
              <span v-if="t.is_overseas_allowed" class="feat-tag">可售海外</span>
            </div>
          </div>
          <div class="t-right">
            <div class="t-price">¥{{ t.price }}</div>
            <div class="t-pay">支持: {{ formatPayment(t.payment_methods) }}</div>
            <button @click="handleBuy(t)" class="buy-btn" :disabled="t.status !== 'active'">
              {{ t.status === 'active' ? '预约面交' : '被抢了' }}
            </button>
          </div>
        </div>
        <div v-if="tickets.length === 0" class="empty-state">暂无在售门票</div>
      </div>
    </div>

    <div v-if="currentTab === 'sell'" class="tab-content form-mode">
      <h3>📤 发布门票 (需审核)</h3>
      <div class="form-group">
        <label>演出名称</label>
        <select v-model="sellForm.event_name" class="std-input">
          <option>魔法未来 2024 (东京)</option>
          <option>魔法未来 2024 (大阪)</option>
          <option>MIKU EXPO 2024</option>
        </select>
      </div>
      <div class="row">
        <div class="col"><label>演出日期</label><input type="date" v-model="sellForm.concert_date" class="std-input"></div>
        <div class="col"><label>席位类型</label><select v-model="sellForm.seat_type" class="std-input"><option>SS席</option><option>S席</option><option>A席</option><option>海外SS</option><option>海外S</option></select></div>
      </div>
      <div class="row">
        <div class="col"><label>面交价格 (CNY)</label><input type="number" v-model="sellForm.price" class="std-input"></div>
        <div class="col"><label>取票码尾号 (用于生成ID)</label><input v-model="sellForm.code_tail" placeholder="后4位" maxlength="4" class="std-input"></div>
      </div>
      
      <div class="form-group">
        <label>收款方式 (多选)</label>
        <div class="checkbox-grp">
          <label><input type="checkbox" value="cash" v-model="sellForm.payment_methods"> 💴 现金</label>
          <label><input type="checkbox" value="alipay" v-model="sellForm.payment_methods"> 🔵 支付宝</label>
          <label><input type="checkbox" value="wechat" v-model="sellForm.payment_methods"> 🟢 微信</label>
        </div>
      </div>

      <div class="form-group">
        <label>高级选项</label>
        <div class="checkbox-grp">
          <label><input type="checkbox" v-model="sellForm.is_overseas_allowed"> 🌏 出售给海外用户</label>
          <label><input type="checkbox" v-model="sellForm.has_exhibition"> 🖼️ 附带企划展门票</label>
          <label><input type="checkbox" v-model="sellForm.is_private"> 🔒 私密门票 (不上架，仅生成链接)</label>
        </div>
      </div>

      <div class="form-group">
        <label>中票截图/凭证 (仅管理员可见) *</label>
        <input type="file" @change="handleProofUpload" class="std-input">
      </div>

      <button @click="submitTicket" class="submit-btn" :disabled="uploading">
        {{ uploading ? '上传中...' : '提交审核' }}
      </button>
    </div>

    <div v-if="currentTab === 'swap'" class="tab-content">
      <div class="swap-header">
        <p>持有门票想换票？在这里发布需求，系统自动匹配。</p>
        <button class="btn-mini" @click="alert('功能开发中...')">➕ 发布交换需求</button>
      </div>
      <div class="empty-state">暂无交换需求</div>
    </div>

    <div v-if="currentTab === 'mine'" class="tab-content">
      <h3>我发布的门票</h3>
      <div v-for="t in myTickets" :key="t.id" class="mini-row">
        <span>{{ t.event_name }} ({{ t.ticket_code }})</span>
        <span class="status-tag" :class="t.status">{{ translateStatus(t.status) }}</span>
      </div>
      <div v-if="myTickets.length===0" class="empty-state">无记录</div>
    </div>

    <div v-if="showVerifyModal" class="modal-overlay">
      <div class="modal-content">
        <h3>🛡️ 买家资质认证</h3>
        <p class="hint">为防止黄牛，购票需上传旅行证明 (机票/酒店/签证)。资料仅管理员可见。</p>
        <div class="form-group">
          <label>真实姓名</label><input v-model="verifyForm.real_name" class="std-input">
        </div>
        <div class="form-group">
          <label>联系方式 (QQ/微信)</label><input v-model="verifyForm.contact_info" class="std-input">
        </div>
        <div class="form-group">
          <label>证明图片</label><input type="file" @change="handleVerifyUpload" class="std-input">
        </div>
        <div class="modal-actions">
          <button @click="showVerifyModal = false">取消</button>
          <button @click="submitVerify" class="confirm">提交审核</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { supabase } from '../../services/supabase' 
import { useRouter } from 'vue-router'

const router = useRouter()

const currentUser = ref(null)
const currentTab = ref('market')
const tickets = ref([])
const myTickets = ref([])
const verificationStatus = ref('none') // none, pending, approved, rejected
const showVerifyModal = ref(false)
const uploading = ref(false)

const filterEvent = ref('')
const filterType = ref('')

const sellForm = reactive({
  event_name: '魔法未来 2024 (东京)',
  concert_date: '',
  seat_type: 'S席',
  price: '',
  code_tail: '',
  payment_methods: [],
  is_overseas_allowed: false,
  has_exhibition: true,
  is_private: false,
  proof_url: ''
})

const verifyForm = reactive({
  real_name: '',
  contact_info: '',
  proof_url: ''
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/login'); return }
  currentUser.value = user
  
  checkVerification()
  fetchTickets()
  fetchMyTickets()
})

// --- 核心逻辑 ---

const checkVerification = async () => {
  // 使用 maybeSingle 避免 406 错误
  // 注意：买家认证表通常使用 user_id，保持不变
  const { data } = await supabase.from('buyer_verifications').select('status').eq('user_id', currentUser.value.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (data) verificationStatus.value = data.status
}

const fetchTickets = async () => {
  let query = supabase.from('tickets').select('*').eq('status', 'active').eq('is_private', false).order('created_at', { ascending: false })
  if (filterEvent.value) query = query.eq('event_name', filterEvent.value)
  if (filterType.value) query = query.eq('seat_type', filterType.value)
  const { data } = await query
  tickets.value = data || []
}

const fetchMyTickets = async () => {
  // ✅ [统一修改] 以前是 seller_id，现在统一改为 user_id
  const { data } = await supabase.from('tickets').select('*').eq('user_id', currentUser.value.id)
  myTickets.value = data || []
}

// 生成唯一识别码: MMDD + 尾号
const generateTicketCode = (dateStr, tail) => {
  if (!dateStr || !tail) return 'UNKNOWN'
  const d = new Date(dateStr)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}${dd}${tail}`
}

const handleProofUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  uploading.value = true
  const fileName = `tickets/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage.from('user_uploads').upload(fileName, file)
  if (uploadError) {
      alert('图片上传失败'); uploading.value = false; return
  }
  const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
  sellForm.proof_url = data.publicUrl
  uploading.value = false
}

const submitTicket = async () => {
  if (!sellForm.price || !sellForm.proof_url || !sellForm.code_tail) return alert('请填写完整并上传凭证')
  
  const code = generateTicketCode(sellForm.concert_date, sellForm.code_tail)
  
  const { error } = await supabase.from('tickets').insert({
    // ✅ [统一修改] 以前是 seller_id，现在统一改为 user_id
    user_id: currentUser.value.id,
    event_name: sellForm.event_name,
    concert_date: sellForm.concert_date,
    seat_type: sellForm.seat_type,
    price: sellForm.price,
    ticket_code: code,
    payment_methods: sellForm.payment_methods,
    is_overseas_allowed: sellForm.is_overseas_allowed,
    has_exhibition: sellForm.has_exhibition,
    is_private: sellForm.is_private,
    proof_images: [sellForm.proof_url],
    status: 'pending' // 默认为待审核
  })

  if (error) alert('发布失败: ' + error.message)
  else {
    alert('发布成功！请等待管理员审核，审核通过后将上架。')
    currentTab.value = 'mine'
    fetchMyTickets()
  }
}

const handleVerifyUpload = async (e) => {
  const file = e.target.files[0]
  if(file) {
    const fileName = `verify/${Date.now()}_${file.name}`
    await supabase.storage.from('user_uploads').upload(fileName, file)
    const { data } = supabase.storage.from('user_uploads').getPublicUrl(fileName)
    verifyForm.proof_url = data.publicUrl
  }
}

const submitVerify = async () => {
  if (!verifyForm.proof_url) return alert('请上传证明')
  await supabase.from('buyer_verifications').insert({
    user_id: currentUser.value.id,
    real_name: verifyForm.real_name,
    contact_info: verifyForm.contact_info,
    travel_proofs: [verifyForm.proof_url]
  })
  alert('提交成功，请等待审核')
  showVerifyModal.value = false
  checkVerification()
}

const handleBuy = async (ticket) => {
  if (verificationStatus.value !== 'approved') return alert('请先完成买家资质认证！')
  if (confirm(`确认预约这张门票吗？\nID: ${ticket.ticket_code}\n\n预约后请按照卖家要求进行面交。爽约将被封号。`)) {
    // 写入预约表
    // 注意：这里的 buyer_id 是指买家，和发布的 user_id (卖家) 不同
    // 为了避免混淆，建议保留为 buyer_id，或者根据你的数据库定义修改
    // 如果数据库 ticket_orders 表也统一成了 user_id，请在这里修改为 user_id
    const { error } = await supabase.from('ticket_orders').insert({
      ticket_id: ticket.id,
      buyer_id: currentUser.value.id 
    })
    
    if (!error) {
      await supabase.from('tickets').update({ status: 'reserved' }).eq('id', ticket.id)
      alert('预约成功！请联系卖家进行面交。')
      fetchTickets()
    }
  }
}

// 辅助
const formatDate = (s) => s ? s.split('T')[0] : ''
const formatPayment = (arr) => arr ? arr.map(p => p==='cash'?'现金':(p==='alipay'?'支付宝':'微信')).join('/') : ''
const translateStatus = (s) => ({ pending:'⏳ 审核中', active:'🟢 出售中', reserved:'🟡 已预定', sold:'🔴 已售出' }[s] || s)
</script>

<style scoped>
.ticket-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: sans-serif; min-height: 100vh; background: #f4f7f6; }
.back-home-btn { background: white; border: 1px solid #ddd; padding: 8px 15px; border-radius: 20px; cursor: pointer; margin-bottom: 20px; }
.ticket-header { text-align: center; margin-bottom: 30px; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.ticket-header h1 { color: #39C5BB; margin: 0 0 10px 0; }
.verify-status-bar { margin-top: 15px; display: inline-block; }
.v-tag { padding: 6px 15px; border-radius: 20px; font-size: 13px; font-weight: bold; cursor: pointer; }
.v-tag.green { background: #e8f5e9; color: #2e7d32; }
.v-tag.orange { background: #fff3e0; color: #ef6c00; }
.v-tag.gray { background: #eee; color: #666; border: 1px dashed #ccc; }

.nav-tabs { display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; }
.nav-tabs button { padding: 10px 25px; border: none; background: white; border-radius: 8px; cursor: pointer; font-weight: bold; color: #666; transition: 0.2s; }
.nav-tabs button.active { background: #39C5BB; color: white; box-shadow: 0 4px 10px rgba(57, 197, 187, 0.3); }

.tab-content { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }

/* 筛选与列表 */
.filter-bar { display: flex; gap: 10px; margin-bottom: 20px; }
.filter-bar select { padding: 8px; border-radius: 6px; border: 1px solid #ddd; }
.ticket-grid { display: grid; gap: 15px; }
.ticket-card { border: 1px solid #eee; border-radius: 10px; padding: 20px; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; }
.ticket-card:hover { border-color: #39C5BB; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
.t-code { font-family: monospace; font-size: 12px; color: #999; margin-bottom: 5px; }
.t-event { margin: 0 0 5px 0; font-size: 18px; color: #333; }
.t-tags { display: flex; gap: 5px; margin-top: 8px; }
.sku-tag { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.feat-tag { background: #f3e5f5; color: #7b1fa2; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.t-price { font-size: 24px; font-weight: bold; color: #f57c00; text-align: right; }
.t-pay { font-size: 12px; color: #999; margin-bottom: 10px; text-align: right; }
.buy-btn { background: #39C5BB; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.buy-btn:disabled { background: #ccc; cursor: not-allowed; }

/* 表单样式 */
.form-mode { max-width: 600px; margin: 0 auto; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; color: #555; }
.std-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
.row { display: flex; gap: 20px; margin-bottom: 20px; } .col { flex: 1; }
.checkbox-grp { display: flex; gap: 15px; flex-wrap: wrap; }
.checkbox-grp label { font-weight: normal; cursor: pointer; display: flex; align-items: center; gap: 5px; }
.submit-btn { width: 100%; padding: 12px; background: #39C5BB; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 20px; }

/* 弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: white; padding: 30px; border-radius: 12px; width: 400px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.modal-actions button { padding: 8px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; }
.modal-actions .confirm { background: #39C5BB; color: white; border: none; }
</style>