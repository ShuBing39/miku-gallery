<template>
    <div class="tab-pane">
      <div class="header-line">
        <h3>✅ 任务板</h3>
        <button v-if="!locked" class="btn-add" @click="$emit('open-modal')">+ 发布新任务</button>
      </div>
  
      <div v-if="tasks.length > 0" class="task-list">
        <div v-for="task in tasks" :key="task.id" class="task-card" :class="task.priority">
          <div class="task-left">
            <div class="task-meta">
              <span class="p-badge" :class="task.priority">{{ getPriorityText(task.priority) }}</span>
              <span class="status-dot" :class="{ done: task.status === 'done' }"></span>
              <span class="task-time">{{ formatDate(task.created_at) }}</span>
            </div>
            <div class="task-content" :class="{ done: task.status === 'done' }">{{ task.content }}</div>
          </div>
          
          <div class="task-right">
            <div v-if="task.assignee" class="assignee-box">
              <span>👤 {{ task.assignee.username }}</span>
              <button v-if="canOperate(task)" class="btn-mini text-btn" @click="$emit('return', task)">退回</button>
            </div>
            
            <div class="action-box">
              <button v-if="!task.assignee && !locked && task.status !== 'done'" class="btn-claim" @click="$emit('claim', task)">🙋‍♂️ 领取</button>
              
              <button v-if="canOperate(task)" class="btn-toggle" @click="$emit('toggle', task)">
                {{ task.status === 'done' ? '标为未完' : '✅ 完成' }}
              </button>
              <button v-if="isManager" class="btn-del" @click="$emit('delete', task.id)">🗑️</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-text">暂无任务</div>
    </div>
  </template>
  
  <script setup>
  const props = defineProps(['tasks', 'isManager', 'isMember', 'currentUser', 'locked'])
  defineEmits(['open-modal', 'claim', 'return', 'toggle', 'delete'])
  
  // 判断是否有权操作（管理员 或 任务领取人自己）
  const canOperate = (task) => {
    if (props.isManager) return true
    if (props.currentUser && task.assignee_id === props.currentUser.id) return true
    return false
  }
  
  // 把英文优先级转为中文显示
  const getPriorityText = (p) => ({ high: '🔥 高优', medium: '🔹 普通', low: '💤 低优' }[p] || '普通')
  const formatDate = (iso) => new Date(iso).toLocaleDateString()
  </script>
  
  <style scoped>
  .header-line { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .btn-add { background: #39C5BB; color: white; border: none; padding: 6px 15px; border-radius: 20px; cursor: pointer; }
  
  /* 任务卡片样式 */
  .task-card { background: white; border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #ddd; }
  /* 不同优先级的左侧颜色条 */
  .task-card.high { border-left-color: #ff4d4f; background: #fff1f0; }
  .task-card.medium { border-left-color: #39C5BB; }
  .task-card.low { border-left-color: #ccc; }
  
  .task-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 5px; font-size: 12px; }
  /* 优先级标签颜色 */
  .p-badge { padding: 2px 6px; border-radius: 4px; color: white; font-weight: bold; font-size: 10px; }
  .p-badge.high { background: #ff4d4f; }
  .p-badge.medium { background: #39C5BB; }
  .p-badge.low { background: #ccc; }
  
  .task-content { font-size: 15px; font-weight: 500; }
  .task-content.done { text-decoration: line-through; color: #999; }
  
  .task-right { display: flex; gap: 15px; align-items: center; }
  .assignee-box { font-size: 12px; color: #666; display: flex; align-items: center; gap: 5px; background: #f0f0f0; padding: 4px 8px; border-radius: 4px; }
  
  /* 按钮样式 */
  .btn-claim { background: #1890ff; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .btn-toggle { background: white; border: 1px solid #52c41a; color: #52c41a; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .btn-del { border: none; background: none; cursor: pointer; opacity: 0.5; }
  .text-btn { border:none; background:none; color: #999; cursor: pointer; text-decoration: underline; }
  .empty-text { text-align: center; color: #999; padding: 20px; }
  </style>