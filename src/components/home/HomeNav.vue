<template>
    <div class="nav-grid">
      <div class="nav-card wiki-card" @click="$router.push('/wiki')">
        <div class="icon">📚</div>
        <h3>葱葱维基</h3>
        <p>查周边、看年份</p>
      </div>
      
      <div class="nav-card kb-card" @click="$router.push('/encyclopedia')">
        <div class="icon">📖</div>
        <h3>葱葱百科</h3>
        <p>知识科普、攻略</p>
      </div>
  
      <div class="nav-card event-card" @click="$router.push('/events')">
        <div class="icon">📅</div>
        <h3>活动情报</h3>
        <p>魔法未来 / 线上 live</p>
      </div>
  
      <div class="nav-card ticket-card" @click="$router.push('/tickets')">
        <div class="icon">🎫</div>
        <h3>票务中心</h3>
        <p>门票转让、交换</p>
      </div>
  
      <div class="nav-card project-card" @click="$router.push('/projects')">
        <div class="icon">🤝</div>
        <h3>企划大厅</h3>
        <p>加入创作、为爱发电</p>
      </div>
  
      <div class="nav-card profile-card" @click="$router.push('/profile')">
        <div class="icon">👤</div>
        <h3>个人中心</h3>
        <p>社团 / 历史管理</p>
      </div>
    </div>
  </template>
  
  <style scoped>
  .nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-bottom: 40px; }
  .nav-card { background: white; border: 1px solid #eee; border-radius: 12px; padding: 20px; cursor: pointer; transition: transform 0.2s; text-align: center; }
  .nav-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
  .icon { font-size: 24px; margin-bottom: 8px; }
  .nav-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #333; }
  .nav-card p { margin: 0; font-size: 11px; color: #888; }
  
  .wiki-card { border-bottom: 3px solid #39c5bb; }
  .kb-card { border-bottom: 3px solid #ffa000; } 
  .ticket-card { border-bottom: 3px solid #00e676; }
  .event-card { border-bottom: 3px solid #8b5cf6; } 
  .project-card { border-bottom: 3px solid #f472b6; }
  .profile-card { border-bottom: 3px solid #fbbf24; }
  </style>