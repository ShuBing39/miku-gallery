<template>
    <div class="tab-pane">
      <div v-if="locked" class="lock-screen">🔒 该区域仅对内部可见</div>
      <div v-else>
        <div v-if="isManager" class="mini-form">
          <input v-model="newTitle" placeholder="输入里程碑 (如: PV发布)" class="std-input">
          <input type="date" v-model="newDate" class="std-input">
          <button @click="handleAdd" class="btn-mini-save">添加节点</button>
        </div>
        <div class="timeline-list">
          <div v-for="node in timeline" :key="node.id" class="t-node" :class="{ done: node.is_completed }">
            <div class="t-line"></div>
            <div class="t-dot"></div>
            <div class="t-info">
              <div class="t-head"><strong>{{ node.title }}</strong><span class="t-date">{{ formatDate(node.event_date) }}</span></div>
              <div class="t-meta">操作人: {{ node.profiles?.username || '未知' }}</div>
              <button v-if="isManager" @click="$emit('delete', node.id)" class="del-text">删除</button>
            </div>
          </div>
          <div v-if="timeline.length === 0" class="empty-mini">暂无进度节点</div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { formatDate } from '../../utils/formatters'
  
  const props = defineProps(['timeline', 'isManager', 'locked'])
  const emit = defineEmits(['add', 'delete'])
  
  const newTitle = ref('')
  const newDate = ref('')
  
  const handleAdd = () => {
    if (!newTitle.value) return alert('请输入内容')
    emit('add', { title: newTitle.value, date: newDate.value })
    newTitle.value = ''
    newDate.value = ''
  }
  </script>
  
  <style scoped>
  /* 复用之前的样式 */
  .tab-pane { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
  .lock-screen { text-align: center; color: #999; padding: 40px; background: #f9f9f9; border-radius: 8px; border: 1px dashed #ddd; }
  .mini-form { display: flex; gap: 10px; margin-bottom: 20px; }
  .std-input { padding: 8px; border: 1px solid #ddd; border-radius: 6px; flex: 1; }
  .btn-mini-save { background: #39C5BB; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  .timeline-list { max-width: 800px; }
  .t-node { display: flex; gap: 15px; margin-bottom: 25px; position: relative; }
  .t-line { position: absolute; left: 5px; top: 12px; bottom: -35px; width: 2px; background: #eee; }
  .t-node:last-child .t-line { display: none; }
  .t-dot { width: 12px; height: 12px; background: white; border: 3px solid #ccc; border-radius: 50%; z-index: 1; margin-top: 5px; }
  .t-node.done .t-dot { border-color: #39C5BB; background: #39C5BB; }
  .t-info { background: #f9f9f9; padding: 12px; border-radius: 8px; flex: 1; }
  .t-head { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 15px; }
  .t-date { font-size: 12px; color: #999; font-family: monospace; }
  .t-meta { font-size: 12px; color: #aaa; }
  .del-text { color: #ff5252; border: none; background: none; font-size: 12px; cursor: pointer; margin-top: 5px; text-decoration: underline; }
  .empty-mini { text-align: center; color: #bbb; padding: 10px; font-size: 12px; }
  </style>