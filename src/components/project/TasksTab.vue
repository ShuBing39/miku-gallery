<template>
    <div class="tab-pane">
      <div v-if="locked" class="lock-screen">🔒 该区域仅对内部可见</div>
      <div v-else>
        <div v-if="isManager" class="mini-form">
          <button @click="$emit('open-modal')" class="btn-mini-save">➕ 发布新任务</button>
        </div>
        <div class="task-grid-view">
          <div v-for="task in tasks" :key="task.id" class="task-box">
            <div class="task-status-bar" :class="task.status"></div>
            <div class="task-main">
              <div class="task-head-row">
                <h4>{{ task.content }}</h4>
                <span v-if="task.is_collaborative" class="tag-collab">👥 多人协作</span>
              </div>
              <div class="task-assignee">
                <div v-if="task.is_collaborative" class="multi-avatars">
                  <span v-if="!task.claimants || task.claimants.length === 0" class="unassigned">⏳ 待认领</span>
                  <div v-else class="avatar-row"><span v-for="u in task.claimants" :key="u.id" class="mini-u">🏃 {{ u.username }}</span></div>
                </div>
                <div v-else>
                  <span v-if="task.assignee?.username">🏃 {{ task.assignee.username }}</span>
                  <span v-else class="unassigned">⏳ 待认领</span>
                </div>
              </div>
              <div class="task-dates">{{ formatDate(task.start_at) }} - {{ formatDate(task.end_at) }}</div>
              <div class="task-btns">
                <button v-if="canClaim(task)" @click="$emit('claim', task)" class="btn-claim">✋ 认领</button>
                <button v-if="canReturn(task)" @click="$emit('return', task)" class="btn-return">↩️ 退回</button>
                <button v-if="isManager" @click="$emit('delete', task.id)" class="btn-del">🗑️</button>
                <button v-if="isManager || isTaskOwner(task)" @click="$emit('toggle', task)" class="btn-check">{{ task.status === 'done' ? '重做' : '完成' }}</button>
              </div>
            </div>
          </div>
          <div v-if="tasks.length === 0" class="empty-mini">暂无任务</div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { formatDate } from '../../utils/formatters'
  const props = defineProps(['tasks', 'isManager', 'isMember', 'currentUser', 'locked'])
  defineEmits(['open-modal', 'claim', 'return', 'delete', 'toggle'])
  
  const isTaskOwner = (task) => { 
    if (task.is_collaborative) return task.claimants?.some(u => u.id === props.currentUser.id)
    else return task.assignee_id === props.currentUser.id 
  }
  
  const canClaim = (task) => { 
    if (!props.isMember) return false
    if (!task.is_open_claim) return false
    if (task.is_collaborative) { 
      const alreadyClaimed = task.claimants?.some(u => u.id === props.currentUser.id)
      return !alreadyClaimed 
    } else { 
      return !task.assignee_id 
    } 
  }
  
  const canReturn = (task) => { 
    if (task.is_collaborative) return task.claimants?.some(u => u.id === props.currentUser.id)
    else return task.assignee_id === props.currentUser.id 
  }
  </script>
  
  <style scoped>
  /* 复用样式 */
  .tab-pane { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
  .lock-screen { text-align: center; color: #999; padding: 40px; background: #f9f9f9; border-radius: 8px; border: 1px dashed #ddd; }
  .mini-form { margin-bottom: 20px; text-align: right; }
  .btn-mini-save { background: #39C5BB; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  .task-grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
  .task-box { border: 1px solid #eee; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
  .task-status-bar { height: 6px; width: 100%; background: #ddd; }
  .task-status-bar.done { background: #39C5BB; }
  .task-main { padding: 15px; flex: 1; display: flex; flex-direction: column; }
  .task-head-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .task-main h4 { margin: 0; font-size: 16px; flex: 1; }
  .tag-collab { font-size: 10px; background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 10px; white-space: nowrap; margin-left: 5px; }
  .task-assignee { font-size: 13px; margin-bottom: 10px; flex: 1; }
  .unassigned { color: #f39c12; font-style: italic; }
  .multi-avatars { display: flex; flex-direction: column; gap: 5px; }
  .avatar-row { display: flex; flex-wrap: wrap; gap: 5px; }
  .mini-u { background: #f0f0f0; padding: 2px 6px; border-radius: 10px; font-size: 11px; }
  .task-dates { font-size: 11px; color: #999; margin-bottom: 10px; }
  .task-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: auto; }
  .btn-claim { background: #39C5BB; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .btn-return { background: #ff9800; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .btn-del { border: none; background: none; cursor: pointer; }
  .btn-check { border: 1px solid #ddd; background: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .empty-mini { text-align: center; color: #bbb; padding: 10px; font-size: 12px; }
  </style>