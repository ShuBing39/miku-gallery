<template>
    <div class="tab-pane">
      <div v-if="locked" class="lock-screen">🔒 团队名单仅对内部可见</div>
      <div v-else class="team-list">
        <div class="team-header-row">
          <span>成员</span><span>身份</span><span>状态</span><span>操作</span>
        </div>
        <div v-for="m in members" :key="m.id" class="team-row">
          <div class="m-name">{{ m.profiles?.username || '未知' }}</div>
          <div class="m-role">
            <span class="role-tag" :class="getRoleClass(m.role)">{{ m.role || '成员' }}</span>
            <button v-if="isManager" @click="$emit('edit', m)" class="btn-edit-role">✎</button>
          </div>
          <div class="m-tasks">{{ getTaskCount(m.user_id) }} 个任务进行中</div>
          <div class="m-action">
            <button v-if="isManager && m.user_id !== currentUser.id" @click="$emit('kick', m)" class="btn-kick">移出</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  const props = defineProps(['members', 'tasks', 'isManager', 'currentUser', 'locked'])
  defineEmits(['edit', 'kick'])
  
  const getRoleClass = (r) => { if (!r) return 'common'; if (r.includes('主催') || r.includes('Owner')) return 'owner'; if (r.includes('副') || r.includes('Admin')) return 'admin'; return 'common' }
  const getTaskCount = (uid) => props.tasks.filter(t => t.assignee_id === uid && t.status !== 'done').length
  </script>
  
  <style scoped>
  /* 复用样式 */
  .tab-pane { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
  .lock-screen { text-align: center; color: #999; padding: 40px; background: #f9f9f9; border-radius: 8px; border: 1px dashed #ddd; }
  .team-row { display: grid; grid-template-columns: 2fr 2fr 2fr 1fr; padding: 15px; border-bottom: 1px solid #eee; align-items: center; }
  .team-header-row { display: grid; grid-template-columns: 2fr 2fr 2fr 1fr; padding: 10px 15px; background: #f9f9f9; font-weight: bold; color: #666; font-size: 13px; border-radius: 8px; }
  .m-role { display: flex; align-items: center; gap: 8px; }
  .role-tag { padding: 2px 6px; border-radius: 4px; font-size: 11px; color: white; background: #999; }
  .role-tag.owner { background: #f39c12; }
  .role-tag.admin { background: #00bcd4; }
  .btn-edit-role { background: none; border: 1px solid #ddd; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #888; }
  .btn-edit-role:hover { background: #39C5BB; color: white; border-color: #39C5BB; }
  .btn-kick { color: #ff5252; border: 1px solid #ffcdd2; background: white; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  </style>