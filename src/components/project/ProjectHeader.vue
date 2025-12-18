<template>
    <div class="header-section">
      <button class="btn-back" @click="$router.push('/projects')">⬅ 返回大厅</button>
      <div class="project-card-top">
        <div class="cover-img" :style="project.image_url ? { backgroundImage: `url(${project.image_url})` } : { backgroundColor: '#eee' }">
          <span class="status-badge-lg" :class="project.recruit_status">{{ getStatusText(project.recruit_status) }}</span>
        </div>
        <div class="info-area">
          <div class="top-row">
            <h1 class="p-title">{{ project.name }}</h1>
            <button v-if="isManager" @click="$emit('open-console')" class="btn-manage-main">⚙️ 主催管理控制台</button>
          </div>
          <div class="meta-data">
            <span>📅 {{ formatDate(project.start_date) }} - {{ formatDate(project.end_date) }}</span>
            <span>👤 发起人: {{ project.uploader_name }}</span>
            <span>👥 成员: {{ memberCount }}人</span>
            <span>🔥 浏览: {{ project.view_count || 0 }}</span>
          </div>
          <div class="tags-area">
             <span class="type-tag">{{ project.project_type }}</span>
             <div v-if="project.external_links && project.external_links.length > 0">
               <a v-for="(link, i) in project.external_links" :key="i" :href="link.url" target="_blank" class="ext-link">🔗 {{ link.name }}</a>
             </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { formatDate } from '../../utils/formatters'
  defineProps(['project', 'isManager', 'memberCount'])
  defineEmits(['open-console'])
  
  const getStatusText = (s) => ({ recruiting:'招募中', ongoing:'进行中', paused:'暂停中', ended:'已完结' }[s] || s)
  </script>
  
  <style scoped>
  .header-section { margin-bottom: 20px; }
  .btn-back { background: white; border: 1px solid #ddd; padding: 6px 15px; border-radius: 20px; cursor: pointer; margin-bottom: 15px; font-weight: bold; color: #555; }
  .project-card-top { background: white; border-radius: 16px; overflow: hidden; display: flex; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
  .cover-img { width: 360px; height: 260px; background-size: cover; background-position: center; position: relative; }
  .status-badge-lg { position: absolute; top: 15px; left: 15px; padding: 6px 12px; border-radius: 6px; color: white; font-weight: bold; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); }
  .status-badge-lg.recruiting { background: #39C5BB; } .status-badge-lg.paused { background: #f39c12; } .status-badge-lg.ended { background: #9e9e9e; }
  .info-area { padding: 30px; flex: 1; position: relative; }
  .top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
  .p-title { margin: 0; font-size: 32px; color: #333; }
  .btn-manage-main { background: #2c3e50; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 10px rgba(44,62,80,0.3); transition: 0.2s; }
  .btn-manage-main:hover { transform: translateY(-2px); }
  .meta-data { display: flex; gap: 20px; color: #666; font-size: 14px; margin-bottom: 20px; }
  .tags-area { display: flex; gap: 10px; align-items: center; }
  .type-tag { background: #f3e5f5; color: #8e24aa; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .ext-link { color: #39C5BB; text-decoration: none; font-size: 13px; border: 1px solid #e0f2f1; padding: 2px 8px; border-radius: 12px; }
  </style>