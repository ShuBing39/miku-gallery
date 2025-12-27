<template>
    <div class="verify-container">
      <div class="card">
        <div class="header">
          <h2>🛡️ 实名认证</h2>
          <p>依据法律法规，发布团购或进行大额交易需完成身份核验。</p>
        </div>
  
        <div v-if="status === 'pending'" class="status-box pending">
          <h3>⏳ 审核中</h3>
          <p>管理员正在拼命审核中，请耐心等待（预计 1-2 工作日）。</p>
          <button @click="$router.push('/dashboard')">返回个人中心</button>
        </div>
  
        <div v-else-if="status === 'approved'" class="status-box approved">
          <h3>✅ 已通过认证</h3>
          <p>您已解锁完整功能。</p>
          <div v-if="isMinor" class="minor-warning">
            🔞 系统检测到您未满 18 周岁，根据平台规则，您仅可使用【记账模式】或【私密团】功能。
          </div>
          <button @click="$router.push('/dashboard')">返回个人中心</button>
        </div>
  
        <div v-else class="form-area">
          <div v-if="status === 'rejected'" class="error-tip">
            ❌ 审核被驳回：{{ rejectReason }}
          </div>
  
          <div class="method-tabs">
            <button :class="{active: method==='manual'}" @click="method='manual'">人工审核 (免费)</button>
            <button class="disabled" title="暂未开放">⚡ 极速认证 (维护中)</button>
          </div>
  
          <div v-if="method === 'manual'" class="manual-form">
            <div class="form-group">
              <label>真实姓名</label>
              <input v-model="form.real_name" placeholder="与身份证一致" class="std-input">
            </div>
            <div class="form-group">
              <label>身份证号</label>
              <input v-model="form.id_number" placeholder="18位身份证号" maxlength="18" class="std-input">
            </div>
  
            <div class="upload-section">
              <div class="upload-box" @click="triggerUpload('front')">
                <img v-if="previews.front" :src="previews.front">
                <div v-else class="placeholder">身份证人像面</div>
              </div>
              <div class="upload-box" @click="triggerUpload('back')">
                <img v-if="previews.back" :src="previews.back">
                <div v-else class="placeholder">身份证国徽面</div>
              </div>
              <div class="upload-box large" @click="triggerUpload('handheld')">
                <img v-if="previews.handheld" :src="previews.handheld">
                <div v-else class="placeholder">手持身份证照<br><small>(需清晰可见)</small></div>
              </div>
              <input type="file" ref="fileInput" hidden accept="image/*" @change="handleFileChange">
            </div>
  
            <button @click="submit" class="btn-submit" :disabled="submitting">
              {{ submitting ? '上传加密中...' : '提交审核' }}
            </button>
            <p class="privacy-note">🔒 您的证件信息仅用于身份核验，审核通过后系统将自动删除照片源文件。</p>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useUserStore } from '../stores/userStore'
  import { submitManualKYC, getIdentityStatus } from '../services/authService'
  import { uploadImage } from '../services/storage'
  
  const router = useRouter()
  const userStore = useUserStore()
  
  const status = ref('none') // none, pending, approved, rejected
  const isMinor = ref(false)
  const rejectReason = ref('')
  const method = ref('manual')
  const submitting = ref(false)
  
  const form = reactive({ real_name: '', id_number: '' })
  const files = reactive({ front: null, back: null, handheld: null })
  const previews = reactive({ front: '', back: '', handheld: '' })
  
  const fileInput = ref(null)
  let currentUploadType = ''
  
  onMounted(async () => {
    if (!userStore.user) {
      await userStore.initialize()
      if (!userStore.user) return router.push('/login')
    }
    
    // 检查现有状态
    const data = await getIdentityStatus(userStore.user.id)
    if (data) {
      status.value = data.status
      isMinor.value = data.is_minor
      rejectReason.value = data.reject_reason
    }
  })
  
  const triggerUpload = (type) => {
    currentUploadType = type
    fileInput.value.click()
  }
  
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    files[currentUploadType] = file
    previews[currentUploadType] = URL.createObjectURL(file)
  }
  
  const submit = async () => {
    if (!form.real_name || !form.id_number) return alert('请填写真实姓名和身份证号')
    if (!files.front || !files.back || !files.handheld) return alert('请上传完整的证件照片')
    
    submitting.value = true
    try {
      // 1. 并发上传图片到私有 Bucket (注意：Supabase需要配置 user_private bucket)
      // 这里暂时传到 user_uploads，实际生产环境建议建立一个 private bucket
      const [frontUrl, backUrl, handUrl] = await Promise.all([
        uploadImage('user_uploads', 'kyc', files.front),
        uploadImage('user_uploads', 'kyc', files.back),
        uploadImage('user_uploads', 'kyc', files.handheld)
      ])
  
      // 2. 提交数据
      await submitManualKYC(userStore.user.id, {
        real_name: form.real_name,
        id_number: form.id_number,
        photos: { front: frontUrl, back: backUrl, handheld: handUrl }
      })
  
      status.value = 'pending'
      alert('提交成功！请等待审核。')
    } catch (e) {
      alert('提交失败: ' + e.message)
    } finally {
      submitting.value = false
    }
  }
  </script>
  
  <style scoped>
  .verify-container { padding: 40px 20px; background: #f4f6f8; min-height: 100vh; display: flex; justify-content: center; }
  .card { background: white; padding: 40px; border-radius: 12px; width: 100%; max-width: 600px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
  .header { text-align: center; margin-bottom: 30px; }
  .header h2 { color: #39C5BB; margin-bottom: 10px; }
  .header p { color: #666; font-size: 14px; }
  
  .method-tabs { display: flex; gap: 15px; margin-bottom: 25px; justify-content: center; }
  .method-tabs button { padding: 8px 20px; border: 1px solid #ddd; background: white; border-radius: 20px; cursor: pointer; color: #666; transition: 0.2s; }
  .method-tabs button.active { border-color: #39C5BB; color: #39C5BB; background: #e0f2f1; font-weight: bold; }
  .method-tabs button.disabled { opacity: 0.5; cursor: not-allowed; background: #f5f5f5; }
  
  .form-group { margin-bottom: 15px; }
  .form-group label { display: block; font-weight: bold; margin-bottom: 5px; font-size: 14px; }
  .std-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
  
  .upload-section { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
  .upload-box { height: 120px; border: 2px dashed #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fafafa; overflow: hidden; }
  .upload-box.large { grid-column: span 2; height: 180px; }
  .upload-box img { width: 100%; height: 100%; object-fit: cover; }
  .placeholder { color: #aaa; font-size: 13px; text-align: center; }
  
  .btn-submit { width: 100%; padding: 12px; background: #39C5BB; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px; }
  .btn-submit:disabled { background: #ccc; }
  
  .privacy-note { font-size: 12px; color: #999; text-align: center; margin-top: 15px; }
  
  .status-box { text-align: center; padding: 40px 0; }
  .status-box h3 { font-size: 24px; margin-bottom: 10px; }
  .status-box.pending h3 { color: #f39c12; }
  .status-box.approved h3 { color: #2ecc71; }
  .error-tip { background: #ffebee; color: #c62828; padding: 10px; border-radius: 6px; margin-bottom: 20px; text-align: center; font-size: 14px; }
  .minor-warning { background: #fff3e0; color: #ef6c00; padding: 10px; border-radius: 6px; margin: 15px 0; font-size: 13px; text-align: left; }
  </style>