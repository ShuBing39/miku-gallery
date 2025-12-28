<template>
    <div class="edit-container">
      <div class="header">
        <button @click="$router.go(-1)" class="back-btn">⬅ 取消</button>
        <h1>✏️ 编辑词条 / 纠错</h1>
      </div>
  
      <div v-if="loading" class="loading">加载数据中...</div>
  
      <div v-else class="edit-layout">
        <div class="original-panel">
          <h3>📄 当前版本</h3>
          <div class="info-box">
            <label>名称</label>
            <p>{{ originalItem.name }}</p>
          </div>
          <div class="info-box">
            <label>图片</label>
            <div class="img-preview">
              <img :src="originalItem.image_url" />
            </div>
          </div>
          <div class="info-box">
            <label>分类</label>
            <span class="tag">{{ originalItem.category }}</span>
          </div>
          <div class="info-box">
            <label>简介</label>
            <p class="desc">{{ originalItem.description || '暂无简介' }}</p>
          </div>
        </div>
  
        <div class="form-panel">
          <h3>📝 您的修改建议</h3>
          
          <div class="form-group">
            <label>名称 (如无误请留空)</label>
            <input v-model="form.name" :placeholder="originalItem.name">
          </div>
  
          <div class="form-group">
            <label>简介补充/修正</label>
            <textarea v-model="form.description" rows="6" :placeholder="originalItem.description || '请输入更详细的介绍...'"></textarea>
          </div>
  
          <div class="form-group">
            <label>修改原因 / 备注</label>
            <input v-model="form.comment" placeholder="例如：原简介有错别字，补充了发售日等">
          </div>
  
          <div class="alert-box">
            💡 您的修改将在管理员审核通过后生效。感谢您为百科做出的贡献！
          </div>
  
          <button class="submit-btn" @click="submitRevision" :disabled="submitting">
            {{ submitting ? '提交中...' : '📤 提交修改建议' }}
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, reactive } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getItemById } from '../../services/itemData'
  import { submitWikiRevision } from '../../services/wikiData'
  import { useUserStore } from '../../stores/userStore'
  
  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  
  const loading = ref(true)
  const submitting = ref(false)
  const originalItem = ref({})
  
  // 表单数据
  const form = reactive({
    name: '',
    description: '',
    comment: ''
  })
  
  onMounted(async () => {
    if (!userStore.user) {
      alert('请先登录！')
      router.push('/login')
      return
    }
  
    const itemId = route.query.import_id // 从详情页传过来的 ID
    if (!itemId) {
      alert('参数错误：缺少词条ID')
      router.go(-1)
      return
    }
  
    // 加载原数据
    const data = await getItemById(itemId)
    if (data) {
      originalItem.value = data
      // 默认把原简介填进去，方便修改
      form.description = data.description
    }
    loading.value = false
  })
  
  const submitRevision = async () => {
    // 检查是否有实质修改
    if (form.name === '' && form.description === originalItem.value.description) {
      alert('您好像没有修改任何内容哦？')
      return
    }
  
    submitting.value = true
    try {
      // 准备要提交的数据包
      const revisionPayload = {
        item_id: originalItem.value.id,
        user_id: userStore.user.id,
        comment: form.comment,
        new_data: {
          name: form.name || originalItem.value.name, // 如果没填就用原名
          description: form.description,
          category: originalItem.value.category, // 暂不开放修改分类
          image_url: originalItem.value.image_url // 暂不开放修改主图
        }
      }
  
      await submitWikiRevision(revisionPayload)
      
      alert('✅ 提交成功！管理员审核通过后将更新词条。')
      router.go(-1) // 返回上一页
  
    } catch (e) {
      alert('提交失败: ' + e.message)
    } finally {
      submitting.value = false
    }
  }
  </script>
  
  <style scoped>
  .edit-container { max-width: 900px; margin: 0 auto; padding: 20px; min-height: 80vh; font-family: sans-serif; }
  
  .header { display: flex; align-items: center; margin-bottom: 30px; gap: 20px; }
  .back-btn { background: #eee; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
  .header h1 { margin: 0; font-size: 1.5rem; color: #333; }
  
  .edit-layout { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
  /* 手机适配 */
  @media (max-width: 768px) { .edit-layout { grid-template-columns: 1fr; } }
  
  .original-panel { background: #f9f9f9; padding: 20px; border-radius: 12px; border: 1px solid #eee; height: fit-content; }
  .original-panel h3 { margin-top: 0; color: #666; font-size: 1rem; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
  .info-box { margin-bottom: 15px; }
  .info-box label { display: block; font-size: 12px; color: #999; margin-bottom: 4px; }
  .info-box p { margin: 0; font-weight: bold; color: #444; }
  .info-box .desc { font-weight: normal; font-size: 13px; line-height: 1.5; color: #666; max-height: 150px; overflow-y: auto; }
  .img-preview { width: 100px; height: 100px; background: white; border-radius: 6px; overflow: hidden; border: 1px solid #ddd; }
  .img-preview img { width: 100%; height: 100%; object-fit: cover; }
  .tag { background: #e0f2f1; color: #00695c; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  
  .form-panel { background: white; padding: 25px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
  .form-panel h3 { margin-top: 0; color: #39C5BB; font-size: 1.2rem; margin-bottom: 20px; }
  
  .form-group { margin-bottom: 20px; }
  .form-group label { display: block; font-weight: bold; margin-bottom: 8px; color: #555; }
  .form-group input, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; box-sizing: border-box; transition: 0.2s; }
  .form-group input:focus, .form-group textarea:focus { border-color: #39C5BB; outline: none; }
  
  .alert-box { background: #fff3e0; color: #e65100; padding: 10px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; border: 1px solid #ffe0b2; }
  
  .submit-btn { width: 100%; background: #39C5BB; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; }
  .submit-btn:hover { background: #26a69a; }
  .submit-btn:disabled { background: #ccc; cursor: not-allowed; }
  
  .loading { text-align: center; padding: 50px; color: #999; }
  </style>