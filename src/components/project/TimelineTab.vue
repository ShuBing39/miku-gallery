<template>
    <div class="tab-pane">
      <div class="header-line">
        <h3>⏳ 企划进度</h3>
        <button v-if="isManager" class="btn-add" @click="showModal = true">+ 新增里程碑</button>
      </div>
      
      <div v-if="timeline.length > 0" class="timeline-box">
        <div v-for="node in timeline" :key="node.id" class="t-node">
          <div class="t-line"></div>
          <div class="t-dot"></div>
          
          <div class="t-content">
            <div class="t-header">
              <span class="t-title">{{ node.title }}</span>
              <span class="t-date">{{ formatDate(node.event_date) }}</span>
            </div>
            
            <div class="t-details" v-if="node.todo_text || node.doing_text || node.done_text">
              <div v-if="node.todo_text" class="detail-row"><span class="badge todo">待办</span> {{ node.todo_text }}</div>
              <div v-if="node.doing_text" class="detail-row"><span class="badge doing">进行中</span> {{ node.doing_text }}</div>
              <div v-if="node.done_text" class="detail-row"><span class="badge done">已完成</span> {{ node.done_text }}</div>
              <div v-if="node.estimated_finish_date" class="detail-row estimate">
                📅 预计结束: {{ formatDate(node.estimated_finish_date) }}
              </div>
            </div>
  
            <div class="t-meta">由 {{ node.profiles?.username }} 记录</div>
          </div>
          
          <button v-if="isManager" class="del-btn" @click="$emit('delete', node.id)">×</button>
        </div>
      </div>
      <div v-else class="empty-text">暂无进度记录</div>
  
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <h3>新增进度节点</h3>
          <div class="form-row"><label>标题 *</label><input v-model="form.title" class="std-input" placeholder="例如: 一宣发布"></div>
          <div class="form-row"><label>📅 待做事项</label><textarea v-model="form.todo_text" class="std-input" rows="2"></textarea></div>
          <div class="form-row"><label>🔥 正在做</label><textarea v-model="form.doing_text" class="std-input" rows="2"></textarea></div>
          <div class="form-row"><label>✅ 已完成</label><textarea v-model="form.done_text" class="std-input" rows="2"></textarea></div>
          <div class="form-row"><label>⏳ 预计结束日期</label><input type="date" v-model="form.estimated_finish_date" class="std-input"></div>
          
          <div class="modal-actions">
            <button @click="showModal = false">取消</button>
            <button @click="submitNode" class="confirm">提交</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive } from 'vue'
  const props = defineProps(['timeline', 'isManager', 'locked'])
  const emit = defineEmits(['add', 'delete'])
  
  const showModal = ref(false)
  const form = reactive({
    title: '',
    todo_text: '',
    doing_text: '',
    done_text: '',
    estimated_finish_date: ''
  })
  
  const submitNode = () => {
    if (!form.title) return alert('标题必填')
    emit('add', { 
      ...form, 
      date: new Date().toISOString().split('T')[0] // 默认当天
    })
    showModal.value = false
    // reset form
    Object.keys(form).forEach(k => form[k] = '')
  }
  
  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : ''
  </script>
  
  <style scoped>
  .header-line { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .btn-add { background: #39C5BB; color: white; border:none; padding: 5px 12px; border-radius: 15px; cursor:pointer; }
  .timeline-box { position: relative; padding-left: 20px; }
  .t-node { position: relative; padding-bottom: 30px; display: flex; justify-content: space-between; }
  .t-line { position: absolute; left: 6px; top: 10px; bottom: 0; width: 2px; background: #eee; }
  .t-node:last-child .t-line { display: none; }
  .t-dot { position: absolute; left: 0; top: 5px; width: 14px; height: 14px; background: #39C5BB; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 1px #39C5BB; }
  .t-content { margin-left: 25px; flex: 1; }
  .t-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
  .t-title { font-weight: bold; font-size: 16px; color: #333; }
  .t-date { font-size: 12px; color: #888; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
  .t-details { background: #f9f9f9; padding: 10px; border-radius: 6px; border: 1px solid #eee; margin-bottom: 5px; }
  .detail-row { font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
  .badge { font-size: 10px; padding: 1px 4px; border-radius: 3px; color: white; }
  .badge.todo { background: #ff9800; }
  .badge.doing { background: #2196f3; }
  .badge.done { background: #4caf50; }
  .estimate { color: #666; font-style: italic; margin-top: 5px; border-top: 1px dashed #ddd; padding-top: 4px; }
  .t-meta { font-size: 12px; color: #999; }
  .del-btn { border:none; background:none; color:#ccc; cursor:pointer; font-size:16px; align-self: flex-start; }
  .empty-text { text-align: center; color: #999; }
  /* Modal styles */
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
  .modal-content { background: white; padding: 25px; border-radius: 12px; width: 400px; }
  .form-row { margin-bottom: 12px; }
  .form-row label { display: block; font-weight: bold; font-size: 12px; margin-bottom: 4px; }
  .std-input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; }
  .confirm { background: #39C5BB; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; }
  </style>